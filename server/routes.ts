import type { Express } from "express";
import { createServer, type Server } from "http";
import { spawn } from "child_process";
import { createReadStream, unlink, statSync } from "fs";
import { mkdtemp } from "fs/promises";
import { tmpdir } from "os";
import path from "path";
import { randomUUID } from "crypto";
import { storage } from "./storage";
import { downloadRequestSchema } from "@shared/schema";
// @ts-ignore — no bundled types in v3
import youtubedl from "youtube-dl-exec";
// @ts-ignore
import { constants as ytdlConstants } from "youtube-dl-exec";
import ffmpegStatic from "ffmpeg-static";
import readline from "readline";

const YT_DLP_BIN: string = ytdlConstants.YOUTUBE_DL_PATH;

// ─── Types ────────────────────────────────────────────────────────────────────

type SessionStatus = "downloading" | "merging" | "ready" | "error";

interface DownloadSession {
  status: SessionStatus;
  /** 0-100 overall progress (video 0-90%, audio 90-99%, merge/ready 99-100%) */
  progress: number;
  downloadedSize: string;
  totalSize: string;
  speed: string;
  eta: string;
  tempFile?: string;
  filename: string;
  mimeType: string;
  error?: string;
  createdAt: number;
  /** which sub-stream we're on: 0 = video, 1 = audio */
  streamIndex: number;
  /** last progress value seen (to detect resets) */
  lastRaw: number;
}

const sessions = new Map<string, DownloadSession>();

// Clean up sessions (and temp files) older than 30 min
setInterval(() => {
  const cutoff = Date.now() - 30 * 60 * 1000;
  Array.from(sessions.entries()).forEach(([id, s]) => {
    if (s.createdAt < cutoff) {
      if (s.tempFile) unlink(s.tempFile, () => {});
      sessions.delete(id);
    }
  });
}, 5 * 60 * 1000);

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  const parts = h > 0
    ? [h, m, s]
    : [m, s];
  return parts.map(v => String(v).padStart(2, "0")).join(":");
}

function heightLabel(h: number): string {
  if (h >= 4320) return "4320p60";
  if (h >= 2160) return "2160p60";
  if (h >= 1440) return "1440p";
  if (h >= 1080) return "1080p";
  if (h >= 720)  return "720p";
  if (h >= 480)  return "480p";
  if (h >= 360)  return "360p";
  if (h >= 240)  return "240p";
  return "144p";
}

function fmtSelector(quality: string, ext: string): string {
  const heightMap: Record<string, number> = {
    "4320p60": 4320, "2160p60": 2160, "1440p": 1440, "1080p": 1080,
    "720p": 720, "480p": 480, "360p": 360, "240p": 240, "144p": 144,
  };
  const h = heightMap[quality];
  if (!h) {
    return ext === "webm"
      ? "bestvideo[ext=webm]+bestaudio[ext=webm]/best[ext=webm]/best"
      : "bestvideo[ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]/best";
  }
  return ext === "webm"
    ? `bestvideo[height<=${h}][ext=webm]+bestaudio[ext=webm]/best[height<=${h}]`
    : `bestvideo[height<=${h}][ext=mp4]+bestaudio[ext=m4a]/bestvideo[height<=${h}]+bestaudio/best[height<=${h}][ext=mp4]/best[height<=${h}]/best`;
}

/**
 * Parse a yt-dlp progress line like:
 *   [download]  42.3% of   52.34MiB at    1.80MiB/s ETA 00:28
 */
function parseProgressLine(line: string) {
  const m = line.match(
    /\[download\]\s+([\d.]+)%\s+of\s+~?([\d.]+\s*\S+)(?:\s+at\s+(\S+))?(?:\s+ETA\s+(\S+))?/
  );
  if (!m) return null;
  return {
    rawPct: parseFloat(m[1]),
    totalSize: m[2].replace(/\s+/, ""),
    speed: m[3] || "0 MB/s",
    eta: m[4] || "Calculating...",
  };
}

// ─── Routes ───────────────────────────────────────────────────────────────────

export async function registerRoutes(app: Express): Promise<Server> {

  // ── /api/analyze ────────────────────────────────────────────────────────────
  app.post("/api/analyze", async (req, res) => {
    try {
      const { url } = req.body;
      if (!url) return res.status(400).json({ message: "URL is required" });
      if (!url.includes("youtube.com") && !url.includes("youtu.be")) {
        return res.status(400).json({ message: "Invalid YouTube URL" });
      }

      const cached = await storage.getVideoInfo(url);
      if (cached) return res.json(cached);

      const info: any = await youtubedl(url, {
        dumpSingleJson: true,
        noCheckCertificates: true,
        noWarnings: true,
        noPlaylist: true,
        addHeader: ["referer:youtube.com", "user-agent:Mozilla/5.0"],
      });

      const seenLabels = new Set<string>();
      const qualities: { quality: string; format: string; fileSize: string }[] = [];
      const formats: any[] = (info.formats ?? [])
        .slice()
        .sort((a: any, b: any) => (b.height ?? 0) - (a.height ?? 0));

      for (const fmt of formats) {
        const h: number = fmt.height ?? 0;
        if (h < 144 || !fmt.vcodec || fmt.vcodec === "none") continue;
        const label = heightLabel(h);
        if (seenLabels.has(label)) continue;
        seenLabels.add(label);

        let fileSize = "Unknown";
        if (fmt.filesize) {
          fileSize = `${Math.round(fmt.filesize / 1024 / 1024)} MB`;
        } else if (fmt.filesize_approx) {
          fileSize = `~${Math.round(fmt.filesize_approx / 1024 / 1024)} MB`;
        } else {
          const mbPerSec: Record<string, number> = {
            "4320p60": 8, "2160p60": 4, "1440p": 2, "1080p": 1.5,
            "720p": 0.8, "480p": 0.4, "360p": 0.25, "240p": 0.15, "144p": 0.1,
          };
          fileSize = `~${Math.round((info.duration ?? 0) * (mbPerSec[label] ?? 0.5))} MB`;
        }
        qualities.push({ quality: label, format: fmt.ext ?? "mp4", fileSize });
      }

      if (qualities.length === 0) {
        qualities.push({ quality: "best", format: "mp4", fileSize: "Unknown" });
      }

      const ud = info.upload_date ?? "";
      const videoInfo = {
        id: info.id ?? "",
        title: info.title ?? "Unknown",
        duration: formatDuration(info.duration ?? 0),
        views: Number(info.view_count ?? 0).toLocaleString(),
        channel: info.uploader ?? info.channel ?? "Unknown",
        publishDate: ud.length === 8
          ? `${ud.slice(0, 4)}-${ud.slice(4, 6)}-${ud.slice(6, 8)}`
          : "Unknown",
        thumbnail: info.thumbnail ?? info.thumbnails?.[info.thumbnails.length - 1]?.url ?? "",
        availableQualities: qualities,
      };

      await storage.setVideoInfo(url, videoInfo);
      res.json(videoInfo);
    } catch (err: any) {
      console.error("analyze error:", err?.message ?? err);
      res.status(500).json({ message: "Failed to analyze video. Please check the URL and try again." });
    }
  });

  // ── /api/start-download ─────────────────────────────────────────────────────
  /**
   * Starts yt-dlp in the background, downloading to a temp file.
   * yt-dlp will properly merge video+audio using its internal muxer.
   * Returns a sessionId immediately; client polls /api/progress/:id for updates.
   */
  app.post("/api/start-download", async (req, res) => {
    try {
      const parsed = downloadRequestSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: "Invalid request" });
      }
      const { url, quality, format } = parsed.data;
      if (!url.includes("youtube.com") && !url.includes("youtu.be")) {
        return res.status(400).json({ message: "Invalid YouTube URL" });
      }

      const ext = format === "webm" ? "webm" : "mp4";
      const sessionId = randomUUID();

      // Derive a safe filename from the title
      let safeTitle = `video_${sessionId.slice(0, 8)}`;
      try {
        const meta: any = await youtubedl(url, {
          dumpSingleJson: true,
          noCheckCertificates: true,
          noWarnings: true,
          noPlaylist: true,
        });
        safeTitle = String(meta.title ?? safeTitle)
          .replace(/[^a-zA-Z0-9\s]/g, "_")
          .replace(/\s+/g, "_")
          .slice(0, 200);
      } catch { /* keep fallback */ }

      // Create a temp directory + output path
      const tmpDir = await mkdtemp(path.join(tmpdir(), "ytdl-"));
      // Use a fixed output name so we know where to find it after merge
      const tempFile = path.join(tmpDir, `output.${ext}`);

      const session: DownloadSession = {
        status: "downloading",
        progress: 0,
        downloadedSize: "0 MB",
        totalSize: "Unknown",
        speed: "0 MB/s",
        eta: "Calculating...",
        filename: `${safeTitle}.${ext}`,
        mimeType: ext === "webm" ? "video/webm" : "video/mp4",
        createdAt: Date.now(),
        streamIndex: 0,
        lastRaw: 0,
        tempFile,
      };
      sessions.set(sessionId, session);

      const formatStr = fmtSelector(quality, ext);
      console.log(`[start-download] sid=${sessionId} quality=${quality} fmt=${formatStr}`);

      // Add ffmpegDir to PATH so yt-dlp can find ffmpeg
      const ffmpegDir = ffmpegStatic ? path.dirname(String(ffmpegStatic)) : "";
      const env = { ...process.env };
      if (ffmpegDir) {
        // Use the correct path separator for the OS
        const sep = process.platform === "win32" ? ";" : ":";
        const pathKey = Object.keys(env).find(k => k.toLowerCase() === "path") || "PATH";
        env[pathKey] = `${ffmpegDir}${sep}${env[pathKey] || ""}`;
      }

      // Spawn yt-dlp — downloads to temp file, merges video+audio properly
      const proc = spawn(YT_DLP_BIN, [
        url,
        "-o", tempFile,
        "-f", formatStr,
        "--no-check-certificates",
        "--no-warnings",
        "--no-playlist",
        "--merge-output-format", ext,
        "--progress",          // Force showing progress output even when piped
        "--newline",           // Print progress on separate lines
        "--add-header", "referer:youtube.com",
        "--add-header", "user-agent:Mozilla/5.0",
      ], { 
        stdio: ["ignore", "pipe", "pipe"],
        env
      });

      const processLogLine = (trimmed: string) => {
        if (!trimmed) return;
        console.log(`[yt-dlp] ${trimmed}`);

        const s = sessions.get(sessionId);
        if (!s || s.status === "error") return;

        // Detect merging phase
        if (trimmed.includes("[Merger]") || trimmed.includes("Merging formats")) {
          s.status = "merging";
          s.progress = 99;
          s.eta = "Finalizing...";
          s.speed = "0 MB/s";
          return;
        }

        // Detect when yt-dlp starts a new sub-stream (resets to 0%)
        const parsed2 = parseProgressLine(trimmed);
        if (parsed2) {
          // If raw% dropped significantly we moved to the next stream (audio)
          if (parsed2.rawPct < s.lastRaw - 20) {
            s.streamIndex = Math.min(s.streamIndex + 1, 1);
          }
          s.lastRaw = parsed2.rawPct;

          // Weight: video = 0-90%, audio = 90-99%
          const pct = s.streamIndex === 0
            ? parsed2.rawPct * 0.9
            : 90 + parsed2.rawPct * 0.09;

          s.progress = Math.min(Math.round(pct), 99);
          s.totalSize = parsed2.totalSize;
          s.speed = parsed2.speed;
          s.eta = parsed2.eta;

          // Estimate downloaded size from progress × total
          const totalMatch = parsed2.totalSize.match(/([\d.]+)\s*(\w+)/);
          if (totalMatch) {
            const totalVal = parseFloat(totalMatch[1]);
            const unit = totalMatch[2];
            const dled = (totalVal * parsed2.rawPct) / 100;
            s.downloadedSize = `${dled.toFixed(1)} ${unit}`;
          }
        }
      };

      // Use readline to process stdout line-by-line
      const rlStdout = readline.createInterface({
        input: proc.stdout,
        terminal: false,
      });
      rlStdout.on("line", (line) => {
        processLogLine(line.trim());
      });

      // Use readline to process stderr line-by-line
      const rlStderr = readline.createInterface({
        input: proc.stderr,
        terminal: false,
      });
      rlStderr.on("line", (line) => {
        processLogLine(line.trim());
      });

      proc.on("exit", (code) => {
        const s = sessions.get(sessionId);
        if (!s) return;
        if (code === 0) {
          s.status = "ready";
          s.progress = 100;
          s.eta = "Done";
          s.speed = "0 MB/s";
          console.log(`[yt-dlp] download complete, sid=${sessionId}`);
        } else {
          s.status = "error";
          s.error = `yt-dlp exited with code ${code}`;
          console.error(`[yt-dlp] error, sid=${sessionId}, code=${code}`);
        }
      });

      proc.on("error", (err) => {
        const s = sessions.get(sessionId);
        if (s) { s.status = "error"; s.error = err.message; }
        console.error("[yt-dlp] spawn error:", err);
      });

      res.json({ sessionId, filename: session.filename });
    } catch (err: any) {
      console.error("start-download error:", err?.message ?? err);
      res.status(500).json({ message: "Failed to start download." });
    }
  });

  // ── /api/progress/:sessionId ────────────────────────────────────────────────
  app.get("/api/progress/:sessionId", (req, res) => {
    const s = sessions.get(req.params.sessionId);
    if (!s) return res.status(404).json({ message: "Session not found" });

    // Prevent browser and proxy caching of progress reports
    res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
    res.setHeader("Pragma", "no-cache");
    res.setHeader("Expires", "0");
    res.setHeader("Surrogate-Control", "no-store");

    res.json({
      status: s.status,
      progress: s.progress,
      downloadedSize: s.downloadedSize,
      totalSize: s.totalSize,
      speed: s.speed,
      eta: s.eta,
      error: s.error,
    });
  });

  // ── /api/download-file/:sessionId ───────────────────────────────────────────
  /**
   * Streams the fully-merged temp file to the browser.
   * Called by the client only after /api/progress reports status='ready'.
   */
  app.get("/api/download-file/:sessionId", (req, res) => {
    const s = sessions.get(req.params.sessionId);
    if (!s) return res.status(404).json({ message: "Session not found" });
    if (s.status !== "ready") {
      return res.status(409).json({ message: "File not ready yet" });
    }
    if (!s.tempFile) {
      return res.status(500).json({ message: "Temp file missing" });
    }

    let fileSize = 0;
    try {
      fileSize = statSync(s.tempFile).size;
    } catch {
      return res.status(500).json({ message: "Could not read temp file" });
    }

    res.setHeader("Content-Disposition", `attachment; filename="${s.filename}"`);
    res.setHeader("Content-Type", s.mimeType);
    res.setHeader("Content-Length", fileSize.toString());
    res.setHeader("Access-Control-Expose-Headers", "Content-Length, Content-Disposition");

    const stream = createReadStream(s.tempFile);
    stream.pipe(res);

    stream.on("error", (err) => {
      console.error("stream error:", err);
      if (!res.headersSent) res.status(500).json({ message: "Streaming failed" });
    });

    res.on("finish", () => {
      // Clean up temp file after delivery
      if (s.tempFile) unlink(s.tempFile, () => {});
      sessions.delete(req.params.sessionId);
    });
  });

  const httpServer = createServer(app);
  return httpServer;
}

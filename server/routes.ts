import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { videoInfoSchema, downloadRequestSchema, downloadProgressSchema } from "@shared/schema";
import ytdl from "@distube/ytdl-core";
import { randomUUID } from "crypto";
// Store active download sessions for progress tracking
const activeDownloads = new Map<string, any>();

export async function registerRoutes(app: Express): Promise<Server> {
  
  // Analyze YouTube video
  app.post("/api/analyze", async (req, res) => {
    try {
      const { url } = req.body;
      
      if (!url || !ytdl.validateURL(url)) {
        return res.status(400).json({ message: "Invalid YouTube URL" });
      }

      // Check cache first
      const cachedInfo = await storage.getVideoInfo(url);
      if (cachedInfo) {
        return res.json(cachedInfo);
      }

      const info = await ytdl.getInfo(url);
      const videoDetails = info.videoDetails;
      
      // Get available formats and qualities
      // For high quality videos, we need to check video-only formats too
      const videoAndAudioFormats = ytdl.filterFormats(info.formats, 'videoandaudio');
      const videoOnlyFormats = ytdl.filterFormats(info.formats, 'videoonly');
      
      // Combine all video formats to get complete quality list
      const allVideoFormats = [...videoAndAudioFormats, ...videoOnlyFormats];
      
      const availableQualities = allVideoFormats
        .map(format => {
          let quality = format.qualityLabel || format.quality || 'unknown';
          
          // Enhanced quality detection for high resolutions
          if (format.height) {
            if (format.height >= 4320) quality = '4320p60'; // 8K
            else if (format.height >= 2160) quality = '2160p60'; // 4K
            else if (format.height >= 1440) quality = '1440p';
            else if (format.height >= 1080) quality = '1080p';
            else if (format.height >= 720) quality = '720p';
            else if (format.height >= 480) quality = '480p';
            else if (format.height >= 360) quality = '360p';
            else if (format.height >= 240) quality = '240p';
            else quality = '144p';
          }
          
          // Calculate estimated file size if not available
          let fileSize = 'Unknown';
          if (format.contentLength) {
            fileSize = `${Math.round(parseInt(format.contentLength) / 1024 / 1024)}MB`;
          } else if (format.height) {
            // Estimate file size based on resolution and duration
            const durationSec = parseInt(videoDetails.lengthSeconds);
            let estimatedMB;
            
            if (format.height >= 2160) estimatedMB = Math.round(durationSec * 8); // 4K/8K
            else if (format.height >= 1440) estimatedMB = Math.round(durationSec * 4); // 1440p
            else if (format.height >= 1080) estimatedMB = Math.round(durationSec * 2.5); // 1080p
            else if (format.height >= 720) estimatedMB = Math.round(durationSec * 1.5); // 720p
            else if (format.height >= 480) estimatedMB = Math.round(durationSec * 0.8); // 480p
            else if (format.height >= 360) estimatedMB = Math.round(durationSec * 0.5); // 360p
            else if (format.height >= 240) estimatedMB = Math.round(durationSec * 0.3); // 240p
            else estimatedMB = Math.round(durationSec * 0.2); // 144p
            
            fileSize = `~${estimatedMB}MB`;
          }
          
          return {
            quality,
            format: format.container || 'mp4',
            fileSize,
            hasAudio: !!format.hasAudio,
            resolution: format.height || 0,
            bitrate: format.bitrate || 0,
            itag: format.itag // Keep for tracking different formats
          };
        })
        .filter((format, index, self) => {
          // Keep unique qualities, but prefer formats with audio and higher bitrates
          const sameQuality = self.filter(f => f.quality === format.quality);
          if (sameQuality.length === 1) return true;
          
          // If multiple formats with same quality, prefer one with audio and higher bitrate
          const best = sameQuality.reduce((best, current) => {
            if (current.hasAudio && !best.hasAudio) return current;
            if (!current.hasAudio && best.hasAudio) return best;
            return current.bitrate > best.bitrate ? current : best;
          });
          
          return format === best;
        })
        .sort((a, b) => {
          // Sort by resolution descending
          return b.resolution - a.resolution;
        })
        .map(({ hasAudio, resolution, bitrate, itag, ...format }) => format); // Remove internal properties

      const videoInfo = {
        id: videoDetails.videoId,
        title: videoDetails.title,
        duration: new Date(parseInt(videoDetails.lengthSeconds) * 1000).toISOString().substr(11, 8),
        views: parseInt(videoDetails.viewCount).toLocaleString(),
        channel: videoDetails.author.name,
        publishDate: new Date(videoDetails.publishDate).toLocaleDateString(),
        thumbnail: videoDetails.thumbnails[videoDetails.thumbnails.length - 1].url,
        availableQualities
      };

      // Cache the video info
      await storage.setVideoInfo(url, videoInfo);
      
      res.json(videoInfo);
    } catch (error) {
      console.error('Error analyzing video:', error);
      res.status(500).json({ 
        message: "Failed to analyze video. Please check the URL and try again." 
      });
    }
  });

  // Start download (support both GET and POST)
  const downloadHandler = async (req: any, res: any) => {
    try {
      // Support both GET (query params) and POST (body) requests
      const requestData = req.method === 'GET' ? req.query : req.body;
      const parseResult = downloadRequestSchema.safeParse(requestData);
      if (!parseResult.success) {
        return res.status(400).json({ message: "Invalid download request" });
      }

      const { url, quality, format } = parseResult.data;
      const sessionId = requestData.sessionId || randomUUID();
      
      if (!ytdl.validateURL(url)) {
        return res.status(400).json({ message: "Invalid YouTube URL" });
      }
      
      // If this is a GET request, we want to start the download immediately
      // If it's a POST request, we might want to return session info first
      
      // Get video info
      const info = await ytdl.getInfo(url);
      const videoDetails = info.videoDetails;
      
      // Find the best format matching the requested quality
      let selectedFormat;
      
      try {
        // First try to get formats with both video and audio
        const videoAndAudioFormats = ytdl.filterFormats(info.formats, 'videoandaudio');
        
        // Try to find exact quality match in combined formats
        selectedFormat = videoAndAudioFormats.find(f => {
          if (quality === '4320p60' && f.height && f.height >= 4320) return true;
          if (quality === '2160p60' && f.height && f.height >= 2160) return true;
          if (f.qualityLabel === quality) return true;
          if (f.quality === quality) return true;
          return false;
        });
        
        // If no exact match in combined formats, try highest quality available
        if (!selectedFormat && videoAndAudioFormats.length > 0) {
          selectedFormat = ytdl.chooseFormat(videoAndAudioFormats, { quality: 'highest' });
        }
        
        // If still no format, fallback to any available format
        if (!selectedFormat) {
          selectedFormat = ytdl.chooseFormat(info.formats, { quality: 'highest' });
        }
        
        // Last resort: pick first available format
        if (!selectedFormat && info.formats.length > 0) {
          selectedFormat = info.formats[0];
        }
      } catch (err) {
        console.error('Format selection error:', err);
        selectedFormat = ytdl.chooseFormat(info.formats, { quality: 'highest' });
      }

      if (!selectedFormat) {
        return res.status(500).json({ message: "No suitable format found for download" });
      }

      console.log(`Selected format for download: ${selectedFormat.qualityLabel || selectedFormat.quality} (${selectedFormat.container})`);
      
      const filename = `${videoDetails.title.replace(/[^a-zA-Z0-9\s]/g, '_').replace(/\s+/g, '_')}.${selectedFormat.container || 'mp4'}`;
      
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.setHeader('Content-Type', selectedFormat.mimeType || 'video/mp4');
      
      const stream = ytdl(url, { format: selectedFormat });
      
      let downloadedBytes = 0;
      const totalBytes = parseInt(selectedFormat.contentLength || '0');
      const startTime = Date.now();
      
      // Store download session info
      activeDownloads.set(sessionId, {
        totalBytes,
        downloadedBytes: 0,
        startTime,
        progress: 0
      });
      
      stream.on('data', (chunk) => {
        downloadedBytes += chunk.length;
        
        if (totalBytes > 0) {
          const progress = Math.round((downloadedBytes / totalBytes) * 100);
          const downloadedSize = `${Math.round(downloadedBytes / 1024 / 1024)}MB`;
          const totalSize = `${Math.round(totalBytes / 1024 / 1024)}MB`;
          
          // Calculate real speed and ETA
          const elapsedTime = (Date.now() - startTime) / 1000; // seconds
          const speed = elapsedTime > 0 ? `${(downloadedBytes / 1024 / 1024 / elapsedTime).toFixed(1)} MB/s` : "Calculating...";
          const remainingBytes = totalBytes - downloadedBytes;
          const currentSpeed = downloadedBytes / 1024 / 1024 / elapsedTime;
          const etaSeconds = currentSpeed > 0 ? Math.round(remainingBytes / 1024 / 1024 / currentSpeed) : 0;
          const eta = etaSeconds > 0 ? `${Math.floor(etaSeconds / 60)}m ${etaSeconds % 60}s` : "Calculating...";
          
          // Update session info
          activeDownloads.set(sessionId, {
            totalBytes,
            downloadedBytes,
            startTime,
            progress
          });
          
          storage.setDownloadProgress(sessionId, {
            progress,
            downloadedSize,
            totalSize,
            speed,
            eta
          });
        }
      });

      stream.on('error', (error) => {
        console.error('Download error:', error);
        activeDownloads.delete(sessionId);
        if (!res.headersSent) {
          res.status(500).json({ message: "Download failed" });
        }
      });

      stream.on('end', () => {
        console.log(`Download completed for session: ${sessionId}`);
        activeDownloads.delete(sessionId);
      });

      stream.pipe(res);
      
    } catch (error) {
      console.error('Error starting download:', error);
      res.status(500).json({ 
        message: "Failed to start download. Please try again." 
      });
    }
  };

  // Endpoint to start download and return session ID
  app.post("/api/start-download", async (req, res) => {
    try {
      const parseResult = downloadRequestSchema.safeParse(req.body);
      if (!parseResult.success) {
        return res.status(400).json({ message: "Invalid download request" });
      }

      const sessionId = randomUUID();
      
      // Initialize session with empty progress
      await storage.setDownloadProgress(sessionId, {
        progress: 0,
        downloadedSize: "0MB",
        totalSize: "Unknown",
        speed: "0 MB/s",
        eta: "Calculating..."
      });
      
      res.json({ sessionId });
    } catch (error) {
      console.error('Error starting download session:', error);
      res.status(500).json({ message: "Failed to start download session" });
    }
  });

  app.post("/api/download", downloadHandler);
  app.get("/api/download", downloadHandler);

  // Get download progress
  app.get("/api/progress/:sessionId", async (req, res) => {
    try {
      const { sessionId } = req.params;
      const progress = await storage.getDownloadProgress(sessionId);
      
      if (!progress) {
        return res.status(404).json({ message: "Session not found" });
      }
      
      res.json(progress);
    } catch (error) {
      console.error('Error getting progress:', error);
      res.status(500).json({ message: "Failed to get progress" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}

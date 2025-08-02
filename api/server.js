// Vercel serverless function for YouTube downloader API
import express from 'express';
import ytdl from '@distube/ytdl-core';
import { createInsertSchema } from 'drizzle-zod';
import { z } from 'zod';

const app = express();

// Middleware
app.use(express.json());
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  if (req.method === 'OPTIONS') {
    res.sendStatus(200);
  } else {
    next();
  }
});

// Zod schemas for validation
const VideoInfoSchema = z.object({
  id: z.string(),
  title: z.string(),
  duration: z.string(),
  views: z.string(),
  channel: z.string(),
  publishDate: z.string(),
  thumbnail: z.string(),
  availableQualities: z.array(z.object({
    quality: z.string(),
    format: z.string(),
    size: z.string().optional(),
  })),
});

const DownloadRequestSchema = z.object({
  url: z.string().url(),
  quality: z.string(),
  format: z.string(),
});

// In-memory storage for session tracking
const sessions = new Map();
const videoCache = new Map();

// Helper function to get video info
async function getVideoInfo(url) {
  try {
    if (videoCache.has(url)) {
      return videoCache.get(url);
    }

    const info = await ytdl.getInfo(url);
    const videoDetails = info.videoDetails;
    
    // Get available formats and qualities
    const formats = ytdl.filterFormats(info.formats, 'videoandaudio');
    const videoOnlyFormats = ytdl.filterFormats(info.formats, 'video');
    
    const availableQualities = [];
    const qualitySet = new Set();
    
    // Process combined video+audio formats
    formats.forEach(format => {
      if (format.qualityLabel && !qualitySet.has(format.qualityLabel)) {
        qualitySet.add(format.qualityLabel);
        availableQualities.push({
          quality: format.qualityLabel,
          format: format.container || 'mp4',
          size: format.contentLength ? `${Math.round(parseInt(format.contentLength) / 1024 / 1024)}MB` : 'Unknown'
        });
      }
    });
    
    // Add video-only formats for higher qualities
    videoOnlyFormats.forEach(format => {
      if (format.qualityLabel && !qualitySet.has(format.qualityLabel)) {
        qualitySet.add(format.qualityLabel);
        availableQualities.push({
          quality: format.qualityLabel,
          format: format.container || 'mp4',
          size: format.contentLength ? `${Math.round(parseInt(format.contentLength) / 1024 / 1024)}MB` : 'Unknown'
        });
      }
    });
    
    // Sort by quality (higher first)
    availableQualities.sort((a, b) => {
      const aRes = parseInt(a.quality.replace(/\D/g, ''));
      const bRes = parseInt(b.quality.replace(/\D/g, ''));
      return bRes - aRes;
    });
    
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
    
    videoCache.set(url, videoInfo);
    return videoInfo;
    
  } catch (error) {
    throw new Error(`Failed to fetch video info: ${error.message}`);
  }
}

// API Routes
app.post('/api/analyze', async (req, res) => {
  try {
    const { url } = req.body;
    
    if (!url || !ytdl.validateURL(url)) {
      return res.status(400).json({ message: 'Invalid YouTube URL' });
    }
    
    const videoInfo = await getVideoInfo(url);
    res.json(videoInfo);
    
  } catch (error) {
    console.error('Error analyzing video:', error);
    res.status(500).json({ 
      message: "Failed to analyze video. Please check the URL and try again." 
    });
  }
});

app.post('/api/start-download', async (req, res) => {
  try {
    const parseResult = DownloadRequestSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({ message: "Invalid download request" });
    }
    
    const sessionId = Date.now().toString();
    sessions.set(sessionId, {
      progress: 0,
      downloadedSize: "0MB",
      totalSize: "0MB",
      speed: "0 MB/s",
      eta: "0s",
      status: 'starting'
    });
    
    res.json({ sessionId });
    
  } catch (error) {
    console.error('Error starting download:', error);
    res.status(500).json({ message: "Failed to start download" });
  }
});

app.get('/api/progress/:sessionId', (req, res) => {
  const { sessionId } = req.params;
  const session = sessions.get(sessionId);
  
  if (!session) {
    return res.status(404).json({ message: "Session not found" });
  }
  
  res.json(session);
});

app.get('/api/download', async (req, res) => {
  try {
    const { url, quality, format, sessionId } = req.query;
    
    if (!url || !ytdl.validateURL(url)) {
      return res.status(400).json({ message: 'Invalid YouTube URL' });
    }
    
    const info = await ytdl.getInfo(url);
    const videoDetails = info.videoDetails;
    
    // Find the best format for the requested quality
    let selectedFormat = ytdl.chooseFormat(info.formats, { 
      quality: quality === 'highest' ? 'highestvideo' : quality 
    });
    
    if (!selectedFormat) {
      selectedFormat = ytdl.chooseFormat(info.formats, { quality: 'highest' });
    }
    
    const filename = `${videoDetails.title.replace(/[^a-zA-Z0-9]/g, '_')}.${format || 'mp4'}`;
    
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Type', 'video/mp4');
    
    let downloadedBytes = 0;
    const totalBytes = selectedFormat.contentLength ? parseInt(selectedFormat.contentLength) : 0;
    const startTime = Date.now();
    
    const stream = ytdl.downloadFromInfo(info, { format: selectedFormat });
    
    stream.on('data', (chunk) => {
      downloadedBytes += chunk.length;
      
      if (sessionId && sessions.has(sessionId)) {
        const elapsed = (Date.now() - startTime) / 1000;
        const speed = downloadedBytes / elapsed;
        const progress = totalBytes > 0 ? Math.round((downloadedBytes / totalBytes) * 100) : 0;
        const eta = totalBytes > 0 && speed > 0 ? Math.round((totalBytes - downloadedBytes) / speed) : 0;
        
        sessions.set(sessionId, {
          progress,
          downloadedSize: `${Math.round(downloadedBytes / 1024 / 1024)}MB`,
          totalSize: totalBytes > 0 ? `${Math.round(totalBytes / 1024 / 1024)}MB` : 'Unknown',
          speed: `${(speed / 1024 / 1024).toFixed(1)} MB/s`,
          eta: `${eta}s`,
          status: 'downloading'
        });
      }
    });
    
    stream.on('end', () => {
      if (sessionId && sessions.has(sessionId)) {
        sessions.set(sessionId, {
          progress: 100,
          downloadedSize: `${Math.round(downloadedBytes / 1024 / 1024)}MB`,
          totalSize: `${Math.round(downloadedBytes / 1024 / 1024)}MB`,
          speed: "0 MB/s",
          eta: "0s",
          status: 'completed'
        });
      }
    });
    
    stream.on('error', (error) => {
      console.error('Download stream error:', error);
      res.status(500).json({ message: 'Download failed' });
    });
    
    stream.pipe(res);
    
  } catch (error) {
    console.error('Download error:', error);
    res.status(500).json({ message: 'Download failed' });
  }
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Export for Vercel
export default app;
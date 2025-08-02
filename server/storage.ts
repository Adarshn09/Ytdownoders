import { type VideoInfo, type DownloadProgress } from "@shared/schema";

export interface IStorage {
  // Video info storage
  getVideoInfo(url: string): Promise<VideoInfo | undefined>;
  setVideoInfo(url: string, info: VideoInfo): Promise<void>;
  
  // Download progress tracking
  getDownloadProgress(sessionId: string): Promise<DownloadProgress | undefined>;
  setDownloadProgress(sessionId: string, progress: DownloadProgress): Promise<void>;
}

export class MemStorage implements IStorage {
  private videoInfoCache: Map<string, VideoInfo>;
  private downloadProgress: Map<string, DownloadProgress>;

  constructor() {
    this.videoInfoCache = new Map();
    this.downloadProgress = new Map();
  }

  async getVideoInfo(url: string): Promise<VideoInfo | undefined> {
    return this.videoInfoCache.get(url);
  }

  async setVideoInfo(url: string, info: VideoInfo): Promise<void> {
    this.videoInfoCache.set(url, info);
  }

  async getDownloadProgress(sessionId: string): Promise<DownloadProgress | undefined> {
    return this.downloadProgress.get(sessionId);
  }

  async setDownloadProgress(sessionId: string, progress: DownloadProgress): Promise<void> {
    this.downloadProgress.set(sessionId, progress);
  }
}

export const storage = new MemStorage();

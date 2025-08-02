import { z } from "zod";

export const videoInfoSchema = z.object({
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
    fileSize: z.string(),
  })),
});

export const downloadRequestSchema = z.object({
  url: z.string().url(),
  quality: z.string(),
  format: z.string(),
});

export const downloadProgressSchema = z.object({
  progress: z.number().min(0).max(100),
  downloadedSize: z.string(),
  totalSize: z.string(),
  speed: z.string(),
  eta: z.string(),
});

export type VideoInfo = z.infer<typeof videoInfoSchema>;
export type DownloadRequest = z.infer<typeof downloadRequestSchema>;
export type DownloadProgress = z.infer<typeof downloadProgressSchema>;

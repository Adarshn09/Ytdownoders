import { useState, useEffect, useRef } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { VideoInfo, DownloadRequest } from "@shared/schema";
import { Youtube, Download, Search, Shield, Zap, Video, Smartphone, FileText, BarChart3, Check, AlertTriangle, RotateCcw, X, ExternalLink, Plus } from "lucide-react";
import SEOHead from "@/components/SEOHead";
import SEOContent from "@/components/SEOContent";

// Capacitor imports (will be available when running as mobile app)
import { Capacitor } from '@capacitor/core';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';

export default function Home() {
  const [videoUrl, setVideoUrl] = useState("");
  const [selectedQuality, setSelectedQuality] = useState("");
  const [selectedFormat, setSelectedFormat] = useState("mp4");
  const [videoInfo, setVideoInfo] = useState<VideoInfo | null>(null);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadComplete, setDownloadComplete] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [downloadSessionId, setDownloadSessionId] = useState<string | null>(null);
  const [downloadStats, setDownloadStats] = useState({ downloadedSize: "0MB", totalSize: "0MB", speed: "0 MB/s", eta: "0s" });
  const progressIntervalRef = useRef<NodeJS.Timeout | null>(null);
  
  const { toast } = useToast();

  const isValidYouTubeUrl = (url: string) => {
    return url.includes('youtube.com') || url.includes('youtu.be');
  };

  const analyzeMutation = useMutation({
    mutationFn: async (url: string) => {
      const response = await apiRequest("POST", "/api/analyze", { url });
      return response.json();
    },
    onSuccess: (data: VideoInfo) => {
      setVideoInfo(data);
      setError(null);
      toast({
        title: "Video analyzed successfully",
        description: "Select your preferred quality and format to download.",
      });
    },
    onError: (error: any) => {
      setError(error.message || "Failed to analyze video");
      setVideoInfo(null);
      toast({
        variant: "destructive",
        title: "Analysis failed",
        description: "Please check the URL and try again.",
      });
    },
  });

  // Mobile download function for Capacitor
  const handleMobileDownload = async (sessionId: string) => {
    try {
      const params = new URLSearchParams({
        url: videoUrl,
        quality: selectedQuality,
        format: selectedFormat,
        sessionId: sessionId
      });
      
      const downloadUrl = `/api/download?${params.toString()}`;
      const response = await fetch(downloadUrl);
      const blob = await response.blob();
      
      // Convert blob to base64 for Capacitor filesystem
      const reader = new FileReader();
      reader.onload = async () => {
        const base64Data = (reader.result as string).split(',')[1];
        const fileName = `video_${Date.now()}.${selectedFormat}`;
        
        try {
          await Filesystem.writeFile({
            path: fileName,
            data: base64Data,
            directory: Directory.Documents,
          });
          
          toast({
            title: "Download completed!",
            description: `Video saved to Documents/${fileName}`,
          });
        } catch (error) {
          console.error('File save error:', error);
          toast({
            variant: "destructive",
            title: "Save failed",
            description: "Could not save video to device storage.",
          });
        }
      };
      reader.readAsDataURL(blob);
      
    } catch (error) {
      console.error('Mobile download error:', error);
      toast({
        variant: "destructive",
        title: "Download failed",
        description: "Could not download video on mobile device.",
      });
    }
  };

  // Progress tracking function
  const trackDownloadProgress = async (sessionId: string) => {
    try {
      const response = await fetch(`/api/progress/${sessionId}`);
      if (response.ok) {
        const progress = await response.json();
        setDownloadProgress(progress.progress);
        setDownloadStats({
          downloadedSize: progress.downloadedSize,
          totalSize: progress.totalSize,
          speed: progress.speed,
          eta: progress.eta
        });
        
        if (progress.progress >= 100) {
          setIsDownloading(false);
          setDownloadComplete(true);
          if (progressIntervalRef.current) {
            clearInterval(progressIntervalRef.current);
          }
        }
      }
    } catch (error) {
      console.error('Progress tracking error:', error);
    }
  };

  const downloadMutation = useMutation({
    mutationFn: async (data: DownloadRequest) => {
      // Start download and get session ID
      const response = await apiRequest("POST", "/api/start-download", data);
      const result = await response.json();
      return result;
    },
    onSuccess: (result) => {
      setDownloadSessionId(result.sessionId);
      
      // Start progress tracking
      progressIntervalRef.current = setInterval(() => {
        trackDownloadProgress(result.sessionId);
      }, 500);
      
      // Handle download differently for mobile vs web
      if (Capacitor.isNativePlatform()) {
        // Mobile app download using Capacitor
        handleMobileDownload(result.sessionId);
      } else {
        // Web browser download
        const params = new URLSearchParams({
          url: videoUrl,
          quality: selectedQuality,
          format: selectedFormat,
          sessionId: result.sessionId
        });
        
        const downloadUrl = `/api/download?${params.toString()}`;
        const link = document.createElement('a');
        link.href = downloadUrl;
        link.download = '';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
      
      toast({
        title: "Download started!",
        description: "Your video download has begun with progress tracking.",
      });
    },
    onError: (error: any) => {
      setIsDownloading(false);
      setError(error.message || "Download failed");
      toast({
        variant: "destructive",
        title: "Download failed",
        description: "Please try again with different settings.",
      });
    },
  });

  const handleAnalyze = () => {
    if (!videoUrl || !isValidYouTubeUrl(videoUrl)) {
      setError("Please enter a valid YouTube URL");
      return;
    }
    analyzeMutation.mutate(videoUrl);
  };

  const handleDownload = () => {
    if (!videoInfo || !selectedQuality) {
      toast({
        variant: "destructive",
        title: "Missing selection",
        description: "Please select a quality before downloading.",
      });
      return;
    }

    setIsDownloading(true);
    setDownloadProgress(0);
    
    // Start the real download
    downloadMutation.mutate({
      url: videoUrl,
      quality: selectedQuality,
      format: selectedFormat,
    });
  };

  const handleReset = () => {
    setVideoUrl("");
    setVideoInfo(null);
    setSelectedQuality("");
    setSelectedFormat("mp4");
    setDownloadProgress(0);
    setIsDownloading(false);
    setDownloadComplete(false);
    setError(null);
    setDownloadSessionId(null);
    setDownloadStats({ downloadedSize: "0MB", totalSize: "0MB", speed: "0 MB/s", eta: "0s" });
    if (progressIntervalRef.current) {
      clearInterval(progressIntervalRef.current);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <SEOHead 
        title="YouTube Video Downloader - Download Videos in 8K, 4K, 1080p HD Quality"
        description="Free online YouTube video downloader supporting up to 8K resolution. Download YouTube videos in MP4 format with fast speeds and high quality. No registration required."
      />
      
      {/* Header */}
      <header className="bg-surface shadow-sm border-b border-gray-100 dark:border-gray-800">
        <div className="max-w-4xl mx-auto px-4 py-4 md:py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2 md:space-x-3">
              <div className="w-8 h-8 md:w-10 md:h-10 bg-primary rounded-lg flex items-center justify-center">
                <Youtube className="text-white text-base md:text-xl" />
              </div>
              <div>
                <h1 className="text-lg md:text-2xl font-bold text-secondary">YouTube Video Downloader</h1>
                <p className="text-xs md:text-sm text-gray-500">Download YouTube videos up to 8K quality - Free & Fast</p>
              </div>
            </div>
            <div className="hidden md:flex items-center space-x-2 text-sm text-gray-500">
              <Shield className="text-success" />
              <span>Secure & Private</span>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-4 md:py-8">
        {/* URL Input Section */}
        <Card className="mb-4 md:mb-6">
          <CardContent className="p-4 md:p-6">
            <div className="mb-4">
              <h2 className="text-lg md:text-xl font-semibold text-secondary mb-2">Enter YouTube URL</h2>
              <p className="text-gray-600 text-sm">Paste the YouTube video URL to get started</p>
            </div>
            
            <div className="space-y-4">
              <div className="relative">
                <Input
                  type="url"
                  placeholder="https://www.youtube.com/watch?v=..."
                  value={videoUrl}
                  onChange={(e) => setVideoUrl(e.target.value)}
                  className="pr-10"
                />
                <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                  <Youtube className="h-4 w-4 text-gray-400" />
                </div>
              </div>
              
              {/* URL Validation Status */}
              {videoUrl && (
                <div>
                  {isValidYouTubeUrl(videoUrl) ? (
                    <div className="flex items-center space-x-2 text-success text-sm">
                      <Check className="h-4 w-4" />
                      <span>Valid YouTube URL detected</span>
                    </div>
                  ) : (
                    <div className="flex items-center space-x-2 text-destructive text-sm">
                      <AlertTriangle className="h-4 w-4" />
                      <span>Please enter a valid YouTube URL</span>
                    </div>
                  )}
                </div>
              )}

              <Button 
                onClick={handleAnalyze}
                disabled={analyzeMutation.isPending || !videoUrl}
                className="w-full md:w-auto min-h-[44px]"
              >
                {analyzeMutation.isPending ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Analyzing...
                  </>
                ) : (
                  <>
                    <Search className="mr-2 h-4 w-4" />
                    Analyze Video
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Video Info Section */}
        {videoInfo && (
          <Card className="mb-4 md:mb-6">
            <CardContent className="p-4 md:p-6">
              <h3 className="text-lg font-semibold text-secondary mb-4">Video Information</h3>
              
              <div className="grid md:grid-cols-3 gap-4 md:gap-6">
                {/* Video Thumbnail */}
                <div className="md:col-span-1">
                  <img 
                    src={videoInfo.thumbnail}
                    alt="Video thumbnail" 
                    className="w-full h-auto rounded-lg shadow-sm"
                  />
                </div>
                
                {/* Video Details */}
                <div className="md:col-span-2 space-y-3">
                  <h4 className="font-semibold text-secondary text-base md:text-lg">
                    {videoInfo.title}
                  </h4>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 md:gap-4 text-sm">
                    <div className="flex items-center space-x-2">
                      <Video className="h-4 w-4 text-gray-500" />
                      <span className="text-gray-600">Duration:</span>
                      <span className="font-medium">{videoInfo.duration}</span>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <BarChart3 className="h-4 w-4 text-gray-500" />
                      <span className="text-gray-600">Views:</span>
                      <span className="font-medium">{videoInfo.views}</span>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <Youtube className="h-4 w-4 text-gray-500" />
                      <span className="text-gray-600">Channel:</span>
                      <span className="font-medium">{videoInfo.channel}</span>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <FileText className="h-4 w-4 text-gray-500" />
                      <span className="text-gray-600">Published:</span>
                      <span className="font-medium">{videoInfo.publishDate}</span>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Quality Selection Section */}
        {videoInfo && !isDownloading && !downloadComplete && (
          <Card className="mb-4 md:mb-6">
            <CardContent className="p-4 md:p-6">
              <h3 className="text-lg font-semibold text-secondary mb-4">Download Options</h3>
              
              <div className="grid gap-4 md:grid-cols-2 md:gap-6">
                {/* Video Quality Selection */}
                <div>
                  <label className="block text-sm font-medium text-secondary mb-2">Video Quality</label>
                  <Select value={selectedQuality} onValueChange={setSelectedQuality}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select quality..." />
                    </SelectTrigger>
                    <SelectContent>
                      {videoInfo.availableQualities.map((quality, index) => {
                        const getDisplayQuality = (q: string) => {
                          switch(q) {
                            case '4320p60': return '8K Ultra HD (4320p)';
                            case '2160p60': return '4K Ultra HD (2160p)';
                            case '1440p': return '2K Quad HD (1440p)';
                            case '1080p': return 'Full HD (1080p)';
                            case '720p': return 'HD (720p)';
                            case '480p': return 'SD (480p)';
                            case '360p': return 'Standard (360p)';
                            case '240p': return 'Low Quality (240p)';
                            case '144p': return 'Low Quality (144p)';
                            default: return q;
                          }
                        };
                        
                        return (
                          <SelectItem key={index} value={quality.quality}>
                            {getDisplayQuality(quality.quality)} - {quality.fileSize}
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                </div>
                
                {/* Format Selection */}
                <div>
                  <label className="block text-sm font-medium text-secondary mb-2">Format</label>
                  <Select value={selectedFormat} onValueChange={setSelectedFormat}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="mp4">MP4 (Recommended)</SelectItem>
                      <SelectItem value="webm">WebM</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              {/* Quality Info Cards */}
              <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-center space-x-2 mb-2">
                    <Video className="text-primary h-4 w-4" />
                    <span className="font-medium text-primary">8K/4K Quality</span>
                  </div>
                  <p className="text-sm text-gray-600">Ultra-high definition for premium viewing experience</p>
                </div>
                
                <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                  <div className="flex items-center space-x-2 mb-2">
                    <BarChart3 className="text-warning h-4 w-4" />
                    <span className="font-medium text-warning">File Size</span>
                  </div>
                  <p className="text-sm text-gray-600">Higher quality means larger file sizes</p>
                </div>
                
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <div className="flex items-center space-x-2 mb-2">
                    <Smartphone className="text-success h-4 w-4" />
                    <span className="font-medium text-success">Compatibility</span>
                  </div>
                  <p className="text-sm text-gray-600">MP4 works on all devices and players</p>
                </div>
              </div>
              
              <div className="mt-6 flex flex-col sm:flex-row gap-3">
                <Button 
                  onClick={handleDownload}
                  disabled={!selectedQuality}
                  className="flex-1 min-h-[44px]"
                >
                  <Download className="mr-2 h-4 w-4" />
                  Start Download
                </Button>
                
                <Button 
                  variant="outline"
                  onClick={handleReset}
                  className="min-h-[44px]"
                >
                  <RotateCcw className="mr-2 h-4 w-4" />
                  Reset
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Download Progress Section */}
        {isDownloading && (
          <Card className="mb-4 md:mb-6">
            <CardContent className="p-4 md:p-6">
              <h3 className="text-lg font-semibold text-secondary mb-4">Download Progress</h3>
              
              {/* Progress Bar */}
              <div className="mb-4">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-medium text-secondary">Downloading...</span>
                  <span className="text-sm font-medium text-primary">{Math.round(downloadProgress)}%</span>
                </div>
                <Progress value={downloadProgress} className="h-3" />
              </div>
              
              {/* Download Stats */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-4 text-sm">
                <div className="text-center p-2 md:p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <div className="text-gray-500 dark:text-gray-400 mb-1 text-xs md:text-sm">Downloaded</div>
                  <div className="font-semibold text-secondary text-xs md:text-sm">{downloadStats.downloadedSize}</div>
                </div>
                
                <div className="text-center p-2 md:p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <div className="text-gray-500 dark:text-gray-400 mb-1 text-xs md:text-sm">Total Size</div>
                  <div className="font-semibold text-secondary text-xs md:text-sm">{downloadStats.totalSize}</div>
                </div>
                
                <div className="text-center p-2 md:p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <div className="text-gray-500 dark:text-gray-400 mb-1 text-xs md:text-sm">Speed</div>
                  <div className="font-semibold text-secondary text-xs md:text-sm">{downloadStats.speed}</div>
                </div>
                
                <div className="text-center p-2 md:p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <div className="text-gray-500 dark:text-gray-400 mb-1 text-xs md:text-sm">ETA</div>
                  <div className="font-semibold text-secondary text-xs md:text-sm">{downloadStats.eta}</div>
                </div>
              </div>
              
              {/* Cancel Button */}
              <div className="mt-4 flex justify-center">
                <Button 
                  variant="destructive"
                  onClick={handleReset}
                  className="min-h-[44px]"
                >
                  <X className="mr-2 h-4 w-4" />
                  Cancel Download
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Success Section */}
        {downloadComplete && (
          <Card className="mb-6">
            <CardContent className="p-6">
              <div className="text-center">
                <div className="w-16 h-16 bg-success rounded-full flex items-center justify-center mx-auto mb-4">
                  <Check className="text-white text-2xl" />
                </div>
                <h3 className="text-xl font-semibold text-secondary mb-2">Download Complete!</h3>
                <p className="text-gray-600 mb-4">Your video has been successfully downloaded.</p>
                
                <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <Video className="text-success text-xl" />
                      <div className="text-left">
                        <div className="font-medium text-secondary">{videoInfo?.title.replace(/[^a-zA-Z0-9]/g, '_')}.{selectedFormat}</div>
                        <div className="text-sm text-gray-600">350 MB • {selectedQuality} {selectedFormat.toUpperCase()}</div>
                      </div>
                    </div>
                    <Button size="sm" className="bg-success hover:bg-green-700">
                      <ExternalLink className="mr-2 h-4 w-4" />
                      Open
                    </Button>
                  </div>
                </div>
                
                <Button onClick={handleReset}>
                  <Plus className="mr-2 h-4 w-4" />
                  Download Another Video
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Error Section */}
        {error && (
          <Card className="mb-6">
            <CardContent className="p-6">
              <div className="flex items-start space-x-4">
                <div className="w-12 h-12 bg-destructive rounded-full flex items-center justify-center flex-shrink-0">
                  <AlertTriangle className="text-white" />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-destructive mb-2">Download Failed</h3>
                  <p className="text-gray-600 mb-4">{error}</p>
                  
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
                    <h4 className="font-medium text-destructive mb-2">Common solutions:</h4>
                    <ul className="text-sm text-gray-600 space-y-1">
                      <li>• Check your internet connection</li>
                      <li>• Verify the YouTube URL is correct</li>
                      <li>• Try a different quality setting</li>
                      <li>• Ensure the video is publicly available</li>
                    </ul>
                  </div>
                  
                  <Button onClick={() => setError(null)}>
                    <RotateCcw className="mr-2 h-4 w-4" />
                    Try Again
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Features Section */}
        <Card>
          <CardContent className="p-6">
            <h3 className="text-lg font-semibold text-secondary mb-4">Features & Capabilities</h3>
            
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="flex items-start space-x-3 p-4 bg-blue-50 rounded-lg">
                <Video className="text-primary text-xl mt-1" />
                <div>
                  <h4 className="font-medium text-secondary mb-1">8K Quality Support</h4>
                  <p className="text-sm text-gray-600">Download videos in ultra-high 8K resolution when available</p>
                </div>
              </div>
              
              <div className="flex items-start space-x-3 p-4 bg-green-50 rounded-lg">
                <Zap className="text-success text-xl mt-1" />
                <div>
                  <h4 className="font-medium text-secondary mb-1">Fast Processing</h4>
                  <p className="text-sm text-gray-600">Quick video analysis and optimized download speeds</p>
                </div>
              </div>
              
              <div className="flex items-start space-x-3 p-4 bg-purple-50 rounded-lg">
                <Shield className="text-purple-600 text-xl mt-1" />
                <div>
                  <h4 className="font-medium text-secondary mb-1">Privacy First</h4>
                  <p className="text-sm text-gray-600">All processing happens securely on our servers</p>
                </div>
              </div>
              
              <div className="flex items-start space-x-3 p-4 bg-orange-50 rounded-lg">
                <Smartphone className="text-warning text-xl mt-1" />
                <div>
                  <h4 className="font-medium text-secondary mb-1">Mobile Friendly</h4>
                  <p className="text-sm text-gray-600">Works seamlessly across all devices and screen sizes</p>
                </div>
              </div>
              
              <div className="flex items-start space-x-3 p-4 bg-red-50 rounded-lg">
                <FileText className="text-destructive text-xl mt-1" />
                <div>
                  <h4 className="font-medium text-secondary mb-1">Multiple Formats</h4>
                  <p className="text-sm text-gray-600">Support for MP4, WebM and other popular formats</p>
                </div>
              </div>
              
              <div className="flex items-start space-x-3 p-4 bg-indigo-50 rounded-lg">
                <BarChart3 className="text-indigo-600 text-xl mt-1" />
                <div>
                  <h4 className="font-medium text-secondary mb-1">Progress Tracking</h4>
                  <p className="text-sm text-gray-600">Real-time download progress with detailed statistics</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
        
        {/* SEO Content Section */}
        <SEOContent />
      </main>

      {/* Footer */}
      <footer className="bg-surface border-t border-gray-100 mt-12">
        <div className="max-w-4xl mx-auto px-4 py-6">
          <div className="flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0">
            <div className="text-sm text-gray-500">
              © 2024 YouTube Video Downloader. Built with privacy in mind.
            </div>
            <div className="flex items-center space-x-6 text-sm text-gray-500">
              <a href="#" className="hover:text-primary transition-colors">Privacy Policy</a>
              <a href="#" className="hover:text-primary transition-colors">Terms of Service</a>
              <a href="#" className="hover:text-primary transition-colors">Support</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

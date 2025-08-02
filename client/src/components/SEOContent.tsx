// SEO-optimized content sections for better search ranking
export function SEOContent() {
  return (
    <div className="max-w-4xl mx-auto mt-12 space-y-8 text-sm text-muted-foreground">
      
      {/* SEO Content Section */}
      <section className="prose prose-sm max-w-none">
        <h2 className="text-lg font-semibold text-foreground mb-4">
          Free YouTube Video Downloader - High Quality Downloads
        </h2>
        
        <div className="grid md:grid-cols-2 gap-6">
          <div>
            <h3 className="font-medium text-foreground mb-2">Supported Video Qualities</h3>
            <ul className="space-y-1">
              <li>• 8K Ultra HD (4320p) - Highest Quality</li>
              <li>• 4K Ultra HD (2160p) - Premium Quality</li>
              <li>• 1440p QHD - High Definition</li>
              <li>• 1080p Full HD - Standard High Quality</li>
              <li>• 720p HD - Good Quality</li>
              <li>• 480p, 360p, 240p - Lower Quality Options</li>
            </ul>
          </div>
          
          <div>
            <h3 className="font-medium text-foreground mb-2">Key Features</h3>
            <ul className="space-y-1">
              <li>• No registration or account required</li>
              <li>• Real-time download progress tracking</li>
              <li>• Multiple format support (MP4, WebM)</li>
              <li>• Mobile-friendly responsive design</li>
              <li>• Fast download speeds</li>
              <li>• Secure and private downloads</li>
            </ul>
          </div>
        </div>
      </section>

      {/* How to Use Section */}
      <section>
        <h2 className="text-lg font-semibold text-foreground mb-4">
          How to Download YouTube Videos
        </h2>
        
        <div className="grid md:grid-cols-3 gap-4">
          <div className="p-4 bg-muted/50 rounded-lg">
            <h3 className="font-medium text-foreground mb-2">Step 1: Paste URL</h3>
            <p>Copy the YouTube video URL and paste it in the input field above. Our downloader supports all YouTube video links.</p>
          </div>
          
          <div className="p-4 bg-muted/50 rounded-lg">
            <h3 className="font-medium text-foreground mb-2">Step 2: Choose Quality</h3>
            <p>Select your preferred video quality from the available options. Higher quality videos provide better viewing experience but larger file sizes.</p>
          </div>
          
          <div className="p-4 bg-muted/50 rounded-lg">
            <h3 className="font-medium text-foreground mb-2">Step 3: Download</h3>
            <p>Click the download button and wait for the process to complete. The video will be saved to your device automatically.</p>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section>
        <h2 className="text-lg font-semibold text-foreground mb-4">
          Frequently Asked Questions
        </h2>
        
        <div className="space-y-4">
          <details className="group">
            <summary className="font-medium text-foreground cursor-pointer">
              Is this YouTube downloader free to use?
            </summary>
            <p className="mt-2 text-muted-foreground">
              Yes, our YouTube video downloader is completely free. No registration, premium accounts, or hidden fees required.
            </p>
          </details>
          
          <details className="group">
            <summary className="font-medium text-foreground cursor-pointer">
              What video qualities are supported?
            </summary>
            <p className="mt-2 text-muted-foreground">
              We support all YouTube video qualities from 240p up to 8K (4320p), including 4K, 1440p, 1080p, 720p, and other resolutions.
            </p>
          </details>
          
          <details className="group">
            <summary className="font-medium text-foreground cursor-pointer">
              Is it safe to download YouTube videos?
            </summary>
            <p className="mt-2 text-muted-foreground">
              Our downloader is secure and doesn't store your personal information. However, please respect YouTube's terms of service and copyright laws.
            </p>
          </details>
          
          <details className="group">
            <summary className="font-medium text-foreground cursor-pointer">
              Can I use this on mobile devices?
            </summary>
            <p className="mt-2 text-muted-foreground">
              Yes, our YouTube downloader is fully responsive and works perfectly on smartphones, tablets, and desktop computers.
            </p>
          </details>
        </div>
      </section>

      {/* Footer SEO Text */}
      <section className="border-t pt-6">
        <p className="text-center">
          YouTube Video Downloader - Download YouTube videos in high quality for free. 
          Supports 8K, 4K, 1080p HD downloads with fast speeds and real-time progress tracking.
        </p>
      </section>
    </div>
  );
}

export default SEOContent;
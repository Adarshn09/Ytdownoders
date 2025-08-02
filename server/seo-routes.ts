import { Router } from 'express';

const router = Router();

// Robots.txt endpoint
router.get('/robots.txt', (req, res) => {
  res.type('text/plain');
  res.send(`User-agent: *
Allow: /

# Sitemap location
Sitemap: ${req.protocol}://${req.get('host')}/sitemap.xml

# Crawl-delay for polite crawling
Crawl-delay: 1

# Allow important pages
Allow: /
Allow: /api/health

# Disallow temporary or session-specific paths
Disallow: /api/download*
Disallow: /api/progress*`);
});

// Sitemap.xml endpoint
router.get('/sitemap.xml', (req, res) => {
  const baseUrl = `${req.protocol}://${req.get('host')}`;
  
  res.type('application/xml');
  res.send(`<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:news="http://www.google.com/schemas/sitemap-news/0.9"
        xmlns:xhtml="http://www.w3.org/1999/xhtml"
        xmlns:mobile="http://www.google.com/schemas/sitemap-mobile/1.0"
        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1"
        xmlns:video="http://www.google.com/schemas/sitemap-video/1.1">

  <!-- Main page -->
  <url>
    <loc>${baseUrl}/</loc>
    <lastmod>${new Date().toISOString().split('T')[0]}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>1.0</priority>
  </url>

</urlset>`);
});

// Meta tags API endpoint for dynamic SEO
router.get('/api/meta', (req, res) => {
  const { url } = req.query;
  
  let title = "YouTube Video Downloader - Download Videos in 8K, 4K, 1080p HD Quality";
  let description = "Free online YouTube video downloader supporting up to 8K resolution. Download YouTube videos in MP4 format with fast speeds and high quality. No registration required.";
  let keywords = "youtube downloader, video downloader, download youtube videos, youtube to mp4, 8k video download, 4k video download, hd video download, free youtube downloader";
  
  // Customize meta tags based on URL or other parameters
  if (url) {
    title = `Download: ${url} - YouTube Video Downloader`;
    description = `Download this YouTube video in high quality up to 8K resolution. Fast and free video downloader.`;
  }
  
  res.json({
    title,
    description,
    keywords,
    ogImage: `${req.protocol}://${req.get('host')}/og-image.jpg`,
    canonical: `${req.protocol}://${req.get('host')}/`
  });
});

export default router;
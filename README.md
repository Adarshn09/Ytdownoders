# YouTube Video Downloader

A powerful, free YouTube video downloader supporting up to 8K resolution with real-time progress tracking and mobile-responsive design.

![YouTube Downloader](client/public/og-image.svg)

## 🚀 Features

- **High Quality Downloads**: Support for 8K, 4K, 1440p, 1080p, 720p and more
- **Real-time Progress**: Live download progress with speed and ETA tracking
- **Mobile Responsive**: Works perfectly on all devices and screen sizes
- **No Registration**: Completely free, no account required
- **Multiple Formats**: MP4, WebM and other popular video formats
- **Fast Downloads**: Optimized for speed and reliability
- **Android App**: Native Android app using Capacitor

## 🛠 Tech Stack

### Frontend
- **React 18** with TypeScript
- **Tailwind CSS** for styling
- **shadcn/ui** component library
- **TanStack Query** for state management
- **Wouter** for routing
- **Vite** for fast development

### Backend
- **Node.js** with Express
- **TypeScript** throughout
- **ytdl-core** for YouTube video processing
- **Drizzle ORM** for database operations
- **Serverless** ready for Vercel deployment

### Mobile
- **Capacitor** for Android app
- **Progressive Web App** capabilities
- **Native file system** integration

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ installed
- npm or yarn package manager

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/youtube-downloader.git
   cd youtube-downloader
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Start development server**
   ```bash
   npm run dev
   ```

4. **Open in browser**
   ```
   http://localhost:5000
   ```

## 📱 Android App

Build the Android version:

```bash
# Build for mobile
node build-mobile.js

# Open in Android Studio
npx cap open android
```

## 🌐 Deployment

### Vercel (Recommended)
1. Push to GitHub
2. Connect repository to Vercel
3. Deploy automatically

### Manual Build
```bash
npm run build
npm start
```

## 📖 Usage

1. **Paste YouTube URL**: Copy any YouTube video link
2. **Analyze Video**: Click "Analyze Video" to get available qualities
3. **Select Quality**: Choose your preferred resolution (up to 8K)
4. **Download**: Click download and wait for completion

## 🎯 SEO Optimized

- Complete meta tags and Open Graph
- Structured data for rich snippets
- Mobile-first indexing ready
- Sitemap and robots.txt included
- Progressive Web App capabilities

## 🔧 Configuration

### Environment Variables
```bash
# Optional: Custom API URL for mobile app
VITE_API_URL=https://your-domain.com

# Database (if using)
DATABASE_URL=your_database_url
```

## 📁 Project Structure

```
├── client/                 # React frontend
│   ├── src/
│   │   ├── components/     # UI components
│   │   ├── pages/         # Page components
│   │   └── lib/           # Utilities
│   └── public/            # Static assets
├── server/                # Express backend
│   ├── routes.ts          # API routes
│   └── storage.ts         # Data storage
├── shared/                # Shared types
├── android/               # Android app files
├── api/                   # Vercel serverless functions
└── docs/                  # Documentation
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## ⚠️ Legal Notice

This tool is for educational and personal use only. Please respect YouTube's Terms of Service and copyright laws. Users are responsible for ensuring they have the right to download content.

## 🙏 Acknowledgments

- Built with modern web technologies
- Powered by ytdl-core library
- UI components from shadcn/ui
- Icons from Lucide React

## 📞 Support

If you encounter any issues:
1. Check the [Issues](https://github.com/yourusername/youtube-downloader/issues) page
2. Create a new issue with detailed description
3. Include error messages and steps to reproduce

---

**Star ⭐ this repository if you find it helpful!**
# YouTube Downloader Application

## Overview

This is a full-stack YouTube downloader application built with a modern tech stack. The application allows users to analyze YouTube videos and download them in various quality formats. It features a React frontend with shadcn/ui components, an Express.js backend, and uses Drizzle ORM for database operations with PostgreSQL.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Build Tool**: Vite for fast development and optimized builds
- **UI Library**: shadcn/ui components built on Radix UI primitives
- **Styling**: Tailwind CSS with custom CSS variables for theming
- **State Management**: TanStack Query (React Query) for server state management
- **Routing**: Wouter for lightweight client-side routing
- **Form Handling**: React Hook Form with Zod validation

### Backend Architecture
- **Runtime**: Node.js with Express.js framework
- **Language**: TypeScript with ES modules
- **API Style**: RESTful API with JSON responses
- **Video Processing**: ytdl-core library for YouTube video analysis and downloading
- **Middleware**: Custom logging middleware for API request tracking

### Database Architecture
- **ORM**: Drizzle ORM with TypeScript-first approach
- **Database**: PostgreSQL (configured but not yet implemented in codebase)
- **Connection**: Neon Database serverless connection
- **Schema Location**: `shared/schema.ts` for type-safe database operations
- **Storage**: Currently using in-memory storage with `MemStorage` class

## Key Components

### Shared Schema (`shared/schema.ts`)
- Zod schemas for type validation across frontend and backend
- `VideoInfo`: Video metadata including title, duration, quality options
- `DownloadRequest`: Download parameters including URL, quality, format
- `DownloadProgress`: Real-time download progress tracking

### Frontend Components
- **Home Page**: Main interface for URL input, video analysis, and download initiation
- **UI Components**: Comprehensive shadcn/ui component library
- **Query Client**: Centralized API request handling with error management
- **Toast System**: User feedback for operations and errors

### Backend Services
- **Route Handlers**: Video analysis and download endpoints
- **Storage Service**: Abstract storage interface with memory implementation
- **Vite Integration**: Development server with HMR support

### Video Processing
- **Analysis**: Extract video metadata, available formats, and quality options
- **Caching**: Store video information to avoid repeated API calls
- **Progress Tracking**: Session-based download progress monitoring

## Data Flow

1. **Video Analysis Flow**:
   - User inputs YouTube URL
   - Frontend validates URL format
   - Backend uses ytdl-core to fetch video metadata
   - Video information cached in storage
   - Available qualities and formats returned to frontend

2. **Download Flow**:
   - User selects quality and format preferences
   - Download request sent to backend
   - Session-based progress tracking initiated
   - Real-time progress updates (planned feature)
   - Download completion handling

3. **Error Handling**:
   - Input validation with Zod schemas
   - API error responses with descriptive messages
   - Frontend toast notifications for user feedback
   - Graceful fallbacks for failed operations

## External Dependencies

### Core Libraries
- **ytdl-core**: YouTube video information extraction and downloading
- **@neondatabase/serverless**: PostgreSQL database connection
- **@tanstack/react-query**: Server state management
- **drizzle-orm**: Type-safe database operations

### UI and Styling
- **@radix-ui/***: Accessible UI primitives
- **tailwindcss**: Utility-first CSS framework
- **lucide-react**: Icon library
- **class-variance-authority**: Component variant management

### Development Tools
- **vite**: Build tool and development server
- **typescript**: Type safety across the stack
- **@replit/vite-plugin-***: Replit-specific development enhancements

## Deployment Strategy

### Development
- **Scripts**: `npm run dev` for development with hot reload
- **Type Checking**: `npm run check` for TypeScript validation
- **Database**: `npm run db:push` for schema updates

### Production Build
- **Frontend**: Vite builds optimized static assets to `dist/public`
- **Backend**: esbuild bundles server code to `dist/index.js`
- **Deployment**: Single server process serving both API and static files

### Environment Configuration
- **DATABASE_URL**: PostgreSQL connection string (required)
- **NODE_ENV**: Environment detection for conditional features
- **REPL_ID**: Replit-specific environment detection

### Architecture Decisions

1. **Monorepo Structure**: Frontend, backend, and shared code in single repository for easier development and type sharing
2. **TypeScript Throughout**: End-to-end type safety from database to UI components
3. **Shared Schema**: Zod schemas ensure consistent data validation across client and server
4. **Memory Storage**: Temporary solution for caching, designed to be easily replaced with database persistence
5. **Component Library**: shadcn/ui provides consistent, accessible UI components with full customization
6. **Progressive Enhancement**: Basic functionality works without JavaScript, enhanced with React

### Recent Changes (January 27, 2025)

- **Updated YouTube Library**: Replaced ytdl-core with @distube/ytdl-core for better reliability and 8K support
- **Enhanced Quality Detection**: Improved video format analysis to detect all available resolutions (8K, 4K, 1440p, 1080p, etc.)
- **Better Format Handling**: Added support for both video+audio combined streams and separate video/audio streams
- **Improved Download Logic**: Enhanced format selection with proper fallbacks and error handling
- **User-Friendly Quality Display**: Shows "8K (4320p)" and "4K (2160p)" labels in the frontend
- **Fixed Download Functionality**: Resolved download issues and verified working with test downloads up to 227MB
- **Real-Time Progress Tracking**: Implemented session-based progress tracking with actual download speeds and ETA calculations
- **Mobile-Responsive Design**: Added comprehensive mobile optimization with proper touch targets (44px minimum)
- **Enhanced Mobile UX**: Implemented responsive grids, optimized spacing, and mobile-specific CSS improvements
- **Progress API Integration**: Created dedicated endpoints for progress tracking with session management

### Android App Conversion (January 27, 2025)

- **Capacitor Integration**: Added Capacitor framework to convert web app into native Android app
- **Mobile Build Pipeline**: Created `vite.config.mobile.ts` and `build-mobile.js` for automated mobile builds  
- **Cross-Platform API**: Updated `queryClient.ts` to handle both web and mobile API communication
- **Mobile Downloads**: Implemented Capacitor Filesystem API for native Android file downloads to Documents folder
- **Android Configuration**: Added network security config, permissions, and manifest settings for production Android app
- **Platform Detection**: Added smart download handling that detects web vs mobile environment
- **Complete Android Project**: Generated full Android Studio project structure in `/android` directory
- **Mobile Documentation**: Created comprehensive `MOBILE_SETUP.md` guide for Android development workflow

### Vercel Deployment Setup (January 27, 2025)

- **Vercel Configuration**: Created `vercel.json` for serverless deployment with proper routing
- **Serverless API**: Migrated backend to `/api/server.js` as Vercel serverless function
- **Build Pipeline**: Configured client build process for Vercel static hosting
- **CORS Setup**: Added proper cross-origin headers for API communication
- **Function Optimization**: Set 30-second timeout for download operations
- **Environment Ready**: Prepared for production deployment with environment variables
- **Deployment Guide**: Created comprehensive `VERCEL_DEPLOYMENT.md` with step-by-step instructions

### SEO Optimization Implementation (January 27, 2025)

- **Complete Meta Tags**: Added comprehensive meta tags including Open Graph, Twitter Cards, and structured data
- **SEO Components**: Created dynamic `SEOHead.tsx` and content-rich `SEOContent.tsx` components
- **Technical SEO**: Implemented robots.txt, sitemap.xml, and PWA manifest for better search engine crawling
- **Content SEO**: Added keyword-rich content sections, FAQ, how-to guides, and proper heading structure
- **Schema Markup**: Implemented WebApplication schema with feature lists and pricing information
- **Mobile SEO**: Optimized for mobile-first indexing with responsive design and PWA capabilities
- **SEO Routes**: Added server-side SEO endpoints for dynamic meta tag generation
- **Social Media**: Optimized Open Graph image and social sharing metadata
- **Documentation**: Created comprehensive `SEO_IMPLEMENTATION.md` guide with ranking strategies
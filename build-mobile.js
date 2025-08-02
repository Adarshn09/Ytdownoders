#!/usr/bin/env node

// Build script for mobile app
import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

console.log('🚀 Building YouTube Downloader for Android...');

try {
  // Build the client with mobile-specific config
  console.log('📦 Building React app for mobile...');
  execSync('npx vite build --config vite.config.mobile.ts', { stdio: 'inherit' });
  
  // Copy necessary files to dist
  console.log('📋 Copying mobile assets...');
  
  // Ensure dist directory exists
  if (!fs.existsSync('dist')) {
    fs.mkdirSync('dist');
  }
  
  // Sync with Capacitor
  console.log('🔄 Syncing with Capacitor...');
  execSync('npx cap sync', { stdio: 'inherit' });
  
  console.log('✅ Mobile build completed successfully!');
  console.log('📱 To open in Android Studio: npx cap open android');
  
} catch (error) {
  console.error('❌ Build failed:', error.message);
  process.exit(1);
}
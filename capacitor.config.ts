import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.youtubedownloader.app',
  appName: 'YouTube Downloader',
  webDir: 'dist',
  server: {
    androidScheme: 'https'
  },
  plugins: {
    App: {
      launchShowDuration: 3000
    }
  }
};

export default config;

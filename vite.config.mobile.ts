import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// Mobile-specific Vite config for building static app
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './client/src'),
      '@shared': path.resolve(__dirname, './shared'),
    },
  },
  root: './client',
  build: {
    outDir: '../dist',
    emptyOutDir: true,
  },
  define: {
    // For mobile app, we'll use environment variables for the API URL
    'import.meta.env.VITE_API_URL': JSON.stringify(process.env.VITE_API_URL || 'http://localhost:5000')
  }
})
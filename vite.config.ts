import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    host: true,
    proxy: {
      '/api': {
        // Local Backend (Commented out)
        // target: 'http://localhost:5000',

        // Live Railway Production Backend
        target: 'https://zumni-ai-jonny-new-backend-production.up.railway.app',
        changeOrigin: true,
        secure: false
      }
    }
  }
});

import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],

  server: {
    // Bind to both IPv4 (127.0.0.1) and IPv6 (::1) so that 'localhost' resolves
    // correctly regardless of the OS/browser preference.
    host: 'localhost',
    port: 5173,

    // Proxy all /api requests to the Express backend.
    // This avoids cross-origin (CORS) requests from the browser entirely.
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
        secure: false,
      },
    },
  },
});

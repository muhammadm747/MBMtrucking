import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// In development the Django API runs on :8000; proxying keeps the app same-origin,
// so session cookies and CSRF work exactly as they do in production.
const backend = process.env.BACKEND_URL || 'http://127.0.0.1:8000';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': backend,
      '/admin': backend,
      '/static': backend,
    },
  },
  test: {
    environment: 'node',
  },
});

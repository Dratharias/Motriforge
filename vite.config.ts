import { defineConfig } from 'vite';
import path from 'path';

export default defineConfig({
  resolve: {
    alias: {
      '@/shared': path.resolve(__dirname, 'shared'),
      '@/backend': path.resolve(__dirname, 'api/src'),
      '@/frontend': path.resolve(__dirname, 'frontend/src'),
      '@/prisma': path.resolve(__dirname, 'prisma')
    }
  }
});

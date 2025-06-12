import { defineConfig } from '@solidjs/start/config';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export default defineConfig({
  ssr: true,
  experimental: {
    islands: false
  },
  server: {
    preset: 'cloudflare-pages',
    experimental: {
      wasm: true
    }
  },
  vite: {
    resolve: {
      alias: {
        '~': resolve(__dirname, 'backend'),
        '@': resolve(__dirname, 'backend'),
        '@/shared': resolve(__dirname, 'backend/shared'),
        '@/services': resolve(__dirname, 'backend/services'),
        '@/repositories': resolve(__dirname, 'backend/repositories'),
        '@/database': resolve(__dirname, 'backend/database'),
        '@/routes': resolve(__dirname, 'backend/routes'),
        '@/types': resolve(__dirname, 'backend/shared/types'),
        '@/utils': resolve(__dirname, 'backend/shared/utils'),
        '@/constants': resolve(__dirname, 'backend/shared/constants')
      }
    },
    optimizeDeps: {
      exclude: ['postgres']
    }
  }
});
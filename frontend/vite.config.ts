import { defineConfig } from 'vite';
import solidPlugin from 'vite-plugin-solid';
import path from 'path';
import { fileURLToPath } from 'url';
import { existsSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const isFrontendDir = __dirname.endsWith('frontend');
const hasSourceInCurrentDir = existsSync(path.join(__dirname, 'src'));
const hasFrontendSubdir = existsSync(path.join(__dirname, 'frontend', 'src'));

const getBasePath = (subPath: string) => {
  if (isFrontendDir || hasSourceInCurrentDir) {
    return path.resolve(__dirname, subPath);
  } else if (hasFrontendSubdir) {
    return path.resolve(__dirname, `frontend/${subPath}`);
  } else {
    return path.resolve(__dirname, subPath);
  }
};

export default defineConfig({
  plugins: [solidPlugin()],
  resolve: {
    alias: {
      '@': getBasePath('./src'),
      '@components': getBasePath('./src/components'),
      '@lib': getBasePath('./src/lib'),
      '@modules': getBasePath('./src/modules'),
      '@hooks': getBasePath('./src/hooks'),
      '@context': getBasePath('./src/context'),
      '@types': getBasePath('./src/types'),
      '@styles': getBasePath('./src/styles'),
      '@pages': getBasePath('./src/pages'),
      '@ui': getBasePath('./src/components/ui'),
      '@mobile': getBasePath('./src/components/mobile'),
    },
  },
  server: {
    port: 3000,
    host: true,
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
        secure: false,
      },
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: process.env.NODE_ENV !== 'production',
    target: 'esnext',
  },
  optimizeDeps: {
    include: ['solid-js', 'solid-js/web', '@solidjs/router'],
  },
});

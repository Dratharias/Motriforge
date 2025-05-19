import { defineConfig } from 'vite';
import solidPlugin from 'vite-plugin-solid';
import path from 'path';

export default defineConfig({
  plugins: [solidPlugin()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@components': path.resolve(__dirname, './src/components'),
      '@lib': path.resolve(__dirname, './src/lib'),
      '@hooks': path.resolve(__dirname, './src/hooks'),
      '@context': path.resolve(__dirname, './src/context'),
      '@types': path.resolve(__dirname, './src/types'),
      '@styles': path.resolve(__dirname, './src/styles'),
      '@pages': path.resolve(__dirname, './src/pages'),
      '@ui': path.resolve(__dirname, './src/components/ui'),
      '@constants': path.resolve(__dirname, '../constants'),
      '@shared/types': path.resolve(__dirname, '../types')
    }
  },
  server: {
    port: 3000,
    host: true,
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
        secure: false
      }
    }
  },
  build: {
    target: 'esnext',
    polyfillModulePreload: false,
    sourcemap: process.env.NODE_ENV !== 'production'
  },
  optimizeDeps: {
    include: ['solid-js', 'solid-js/web', '@solidjs/router']
  },
  test: {
    environment: 'jsdom',
    globals: true,
    transformMode: {
      web: [/\.[jt]sx?$/]
    },
    setupFiles: ['./src/test/setup.ts'],
    deps: {
      inline: [/solid-js/]
    }
  }
});
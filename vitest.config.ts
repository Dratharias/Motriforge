import { defineConfig } from 'vitest/config';
import { resolve } from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./tests/setup.ts'],
    include: ['**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'],
    exclude: [
      '**/node_modules/**',
      '**/dist/**',
      '**/build/**',
      '**/.solid/**',
      '**/coverage/**',
    ],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'tests/',
        '**/*.config.*',
        'backend/database/migrations/',
        '**/*.d.ts',
        'coverage/**',
        'dist/**',
        'build/**',
        '.solid/**',
      ],
      thresholds: {
        global: {
          branches: 70,
          functions: 70,
          lines: 70,
          statements: 70,
        },
      },
    },
    testTimeout: 10000,
    hookTimeout: 10000,
  },
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
      '@/constants': resolve(__dirname, 'backend/shared/constants'),
    },
  },
});
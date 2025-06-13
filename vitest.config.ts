import { defineConfig } from 'vitest/config';
import { resolve } from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node', // Use node environment for server-side testing
    setupFiles: ['./tests/setup.ts'],
    env: {
      NODE_ENV: 'test'
    },
    include: ['**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'],
    exclude: [
      '**/node_modules/**',
      '**/dist/**',
      '**/build/**',
      '**/.solid/**',
      '**/coverage/**',
    ],
    // CRITICAL: Enable proper test isolation
    isolate: true,
    pool: 'forks', // Use forks for better isolation
    poolOptions: {
      forks: {
        isolate: true,
        singleFork: false, // Each test file gets its own process
      }
    },
    // Run tests sequentially to avoid database conflicts
    sequence: {
      concurrent: false, // Disable concurrent test files
      shuffle: false,    // Keep deterministic order
    },
    // Longer timeouts for database operations
    testTimeout: 20000,   // Increased from 15000
    hookTimeout: 30000,   // Increased from 15000
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
    conditions: ['development', 'browser'], // Help resolve SolidJS modules correctly
  },
  // Critical for SolidStart testing - prevent module resolution issues
  ssr: {
    noExternal: ['@solidjs/start', '@solidjs/router', 'solid-js'],
  },
  optimizeDeps: {
    include: ['@solidjs/start', '@solidjs/router', 'solid-js'],
    exclude: ['postgres'],
  },
});
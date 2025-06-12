import { beforeAll, afterAll, beforeEach, afterEach } from 'vitest';
import { setupServer } from 'msw/node';
import { DefaultBodyType, http, HttpResponse } from 'msw';
import '@testing-library/jest-dom';
import { config } from 'dotenv';
import { resolve } from 'path';

// Load environment variables from .env files
config({ path: resolve(process.cwd(), '.env') });
config({ path: resolve(process.cwd(), '.env.test') });

// Set test environment variables with defaults
process.env.NODE_ENV = 'test';
process.env.DATABASE_URL = process.env.DATABASE_URL || 
  process.env.TEST_DATABASE_URL || 
  'postgresql://postgres:postgres@localhost:5433/motriforge_test';

// Define minimal interface for the test database client based on usage
interface TestDbClient {
  end(): Promise<void>;
}
interface TestDb {
  $client: TestDbClient;
}

// Define mock user and event shapes
export interface MockUser {
  id: string;
  email: string;
  name: string;
  createdAt: Date;
  isActive: boolean;
}
export interface MockEvent {
  id: string;
  actorId: string;
  actionId: string;
  scopeId: string;
  targetId: string;
  eventData: Record<string, unknown>;
  occurredAt: Date;
}

// Define types for the response body
interface HealthResponse {
  status: string;
  timestamp: string;
  services?: {
    database: string;
    cache: string;
  };
  version?: string;
  environment?: string;
}

// Mock server for API calls
const server = setupServer(
  http.get<{}, DefaultBodyType, HealthResponse, '/api/health'>(
    '/api/health',
    () => {
      return HttpResponse.json(
        { 
          status: 'healthy',
          timestamp: new Date().toISOString(),
          services: {
            database: 'healthy',
            cache: 'healthy'
          },
          version: '0.1.0',
          environment: 'test'
        },
        { 
          status: 200,
          headers: {
            'content-type': 'application/json',
            'cache-control': 'no-cache, no-store, must-revalidate'
          }
        }
      );
    }
  )
);

// Test database setup
let testDb: TestDb | null = null;

beforeAll(async () => {
  server.listen({ onUnhandledRequest: 'warn' });
  
  // Only try to setup database if DATABASE_URL is available and not mock
  if (process.env.DATABASE_URL && !process.env.VITEST_MOCK_DB) {
    try {
      const module = await import('../backend/database/connection');
      const maybeDb = (module as { db?: unknown }).db;
      if (
        maybeDb &&
        typeof (maybeDb as any).$client === 'object' &&
        typeof (maybeDb as any).$client.end === 'function'
      ) {
        testDb = maybeDb as TestDb;
        console.log('✅ Database connection established for tests');
      }
    } catch (err) {
      console.warn('⚠️  Database connection not available for tests:', err);
      // Set mock flag to prevent other tests from trying to connect
      process.env.VITEST_MOCK_DB = 'true';
    }
  } else {
    console.log('📝 Running tests in mock mode');
    process.env.VITEST_MOCK_DB = 'true';
  }
});

afterAll(async () => {
  server.close();
  if (testDb) {
    try {
      await testDb.$client.end();
      console.log('✅ Database connection closed');
    } catch (err) {
      console.error('❌ Error closing test database connection:', err);
    }
  }
});

beforeEach(() => {
  // Reset any mocks or state before each test
});

afterEach(() => {
  server.resetHandlers();
});

// Global test utilities implementation
global.testUtils = {
  createMockUser: (): MockUser => ({
    id: 'test-user-id',
    email: 'test@example.com',
    name: 'Test User',
    createdAt: new Date(),
    isActive: true,
  }),

  createMockEvent: (): MockEvent => ({
    id: 'test-event-id',
    actorId: 'test-actor-id',
    actionId: 'test-action-id',
    scopeId: 'test-scope-id',
    targetId: 'test-target-id',
    eventData: { test: 'data' },
    occurredAt: new Date(),
  }),
};
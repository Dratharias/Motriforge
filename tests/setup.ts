import { beforeAll, afterAll, beforeEach, afterEach } from 'vitest';
import { setupServer } from 'msw/node';
import { DefaultBodyType, http, HttpResponse } from 'msw';
import '@testing-library/jest-dom';

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
}

// Mock server for API calls
const server = setupServer(
  http.get<{}, DefaultBodyType, HealthResponse, '/api/health'>(
    '/api/health',
    () => {
      return HttpResponse.json(
        { status: 'ok', timestamp: new Date().toISOString() },
        { status: 200 }
      );
    }
  )
);

// Test database setup (unchanged)
let testDb: TestDb | null = null;

beforeAll(async () => {
  server.listen({ onUnhandledRequest: 'error' });
  process.env.DATABASE_URL =
    process.env.TEST_DATABASE_URL ?? 'postgresql://postgres:postgres@localhost:5433/motriforge_test';
  process.env.NODE_ENV = 'test';

  const module = await import('../backend/database/connection');
  const maybeDb = (module as { db?: unknown }).db;
  if (
    maybeDb &&
    typeof (maybeDb as any).$client === 'object' &&
    typeof (maybeDb as any).$client.end === 'function'
  ) {
    testDb = maybeDb as TestDb;
  } else {
    throw new Error(
      'Imported database connection does not conform to expected TestDb interface'
    );
  }
});

afterAll(async () => {
  server.close();
  if (testDb) {
    try {
      await testDb.$client.end();
    } catch (err) {
      console.error('Error closing test database connection:', err);
    }
  }
});

beforeEach(() => {
  // Reset any mocks or state before each test
});

afterEach(() => {
  server.resetHandlers();
});

// Global test utilities implementation (unchanged)
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

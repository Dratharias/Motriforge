import { describe, it, expect, beforeAll } from 'vitest';

describe('Health API', () => {
  const API_URL = 'http://localhost:3000';

  beforeAll(async () => {
    // Wait a bit for server to be ready
    await new Promise(resolve => setTimeout(resolve, 1000));
  });

  it('should return healthy status', async () => {
    try {
      const response = await fetch(`${API_URL}/api/health`);
      const data = await response.json();
      
      expect(response.status).toBe(200);
      expect(data.status).toBe('healthy');
      expect(data.services.database).toBe('healthy');
      expect(data.services.cache).toBe('healthy');
      expect(data.timestamp).toBeDefined();
      expect(data.version).toBe('0.1.0');
      expect(data.environment).toBe('development');
    } catch (error) {
      console.error('Health check failed:', error);
      throw new Error('Make sure the dev server is running: npm run dev');
    }
  });

  it('should have proper headers', async () => {
    try {
      const response = await fetch(`${API_URL}/api/health`);
      
      expect(response.headers.get('content-type')).toBe('application/json');
      expect(response.headers.get('cache-control')).toBe('no-cache, no-store, must-revalidate');
    } catch (error) {
      console.error('Health check failed:', error);
      throw new Error('Make sure the dev server is running: npm run dev');
    }
  });
});
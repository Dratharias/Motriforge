import { describe, it, expect, beforeAll } from 'vitest';

// Base API URL: prefer VITE_API_BASE_URL without trailing slash,
// fallback to http://localhost:3000/api if unset.
const rawApiBase = process.env.VITE_API_BASE_URL ?? 'http://localhost:3000/api';
const apiBaseUrl = rawApiBase.replace(/\/+$/, ''); // remove any trailing slash

let serverRunning = false;

/**
 * Check if the API server is up by calling GET /health.
 * Returns true if status 200 and valid JSON, false otherwise.
 */
async function isServerRunning(): Promise<boolean> {
  try {
    const res = await fetch(`${apiBaseUrl}/health`);
    const contentType = res.headers.get('content-type') ?? '';
    if (res.status !== 200 || !contentType.includes('application/json')) {
      console.warn(`[Health Check] Unexpected response: status=${res.status}, content-type=${contentType}`);
      return false;
    }
    // Try parsing JSON to ensure valid payload
    await res.json();
    return true;
  } catch (err) {
    console.warn(`[Health Check] Error connecting to ${apiBaseUrl}/health:`, err);
    return false;
  }
}

/**
 * Safely parse JSON response. If parsing fails, log raw text and throw.
 */
async function parseJsonSafe(response: Response): Promise<any> {
  const text = await response.text();
  try {
    return JSON.parse(text);
  } catch (err) {
    console.error('[parseJsonSafe] Failed to parse JSON; raw text:\n', text);
    throw new Error(`Failed to parse JSON response: ${err}`);
  }
}

/**
 * Fetch JSON helper with correct status expectations
 */
async function fetchJson(
  url: string,
  options?: RequestInit,
  expectStatus?: number | number[]
): Promise<{ status: number; data: any; headers: Headers }> {
  const res = await fetch(url, options);
  const status = res.status;

  if (expectStatus !== undefined) {
    const ok = Array.isArray(expectStatus)
      ? expectStatus.includes(status)
      : status === expectStatus;
    if (!ok) {
      const raw = await res.text();
      console.error(`[fetchJson] Unexpected status for ${url}: expected=${expectStatus}, received=${status}`);
      console.error('[fetchJson] Raw response:\n', raw);
      expect(status).toBe(expectStatus);
    }
  }

  const contentType = res.headers.get('content-type') ?? '';
  if (!contentType.includes('application/json')) {
    const raw = await res.text();
    console.error(`[fetchJson] Unexpected content-type for ${url}: ${contentType}`);
    console.error('[fetchJson] Raw response:\n', raw);
    expect(contentType).toContain('application/json');
  }

  const data = await parseJsonSafe(res);
  return { status, data, headers: res.headers };
}

describe('Logging API Endpoints', () => {
  beforeAll(async () => {
    serverRunning = await isServerRunning();
    if (!serverRunning) {
      console.warn(`API server not reachable at ${apiBaseUrl}. Tests will be skipped.`);
    }
  });

  it('should create a log entry via POST /v1/observability/logs', async () => {
    if (!serverRunning) {
      console.warn('Skip: server not running');
      return;
    }

    const payload = {
      actor: 'user',
      action: 'login',
      scope: 'security',
      target: 'session',
      severityType: 'info',
      severityLevel: 'medium',
      message: 'User login successful',
      context: { userId: 'api-test-user-123', ipAddress: '192.168.1.100' },
      sourceComponent: 'auth-api',
    };

    const { data } = await fetchJson(
      `${apiBaseUrl}/v1/observability/logs`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      },
      201
    );

    expect(data.success).toBe(true);
    expect(data.data).toBeDefined();
    expect(typeof data.data.id).toBe('string');
    expect(data.data.pattern).toBe('user.login.security.session');
    expect(data.data.message).toBe(payload.message);
    expect(typeof data.correlationId).toBe('string');
    expect(data.correlationId.length).toBeGreaterThan(0);
  });

  it('should validate request data and return 400 on invalid input', async () => {
    if (!serverRunning) {
      console.warn('Skip: server not running');
      return;
    }

    const invalidPayload = {
      actor: '', // invalid
      action: 'login',
      scope: 'security',
      target: 'session',
      severityType: 'invalid_severity', // invalid
      message: '', // invalid
    };

    const url = `${apiBaseUrl}/v1/observability/logs`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(invalidPayload),
    });

    if (res.status !== 400) {
      const raw = await res.text();
      console.error(`[Validation Test] Unexpected status: ${res.status}, raw:\n`, raw);
    }
    expect(res.status).toBe(400);

    const contentType = res.headers.get('content-type') ?? '';
    expect(contentType).toContain('application/json');
    const responseData = await parseJsonSafe(res);
    expect(responseData.success).toBe(false);
    expect(responseData.error).toBeDefined();
    expect(Array.isArray(responseData.details)).toBe(true);
  });

  it('should search logs via GET /v1/observability/logs', async () => {
    if (!serverRunning) {
      console.warn('Skip: server not running');
      return;
    }

    // Create a log with a unique keyword first
    await fetchJson(
      `${apiBaseUrl}/v1/observability/logs`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          actor: 'user',
          action: 'create',
          scope: 'domain',
          target: 'resource',
          severityType: 'info',
          message: 'Search test log entry with unique-keyword-abc123',
          sourceComponent: 'search-test-api',
        }),
      },
      201
    );
    
    await new Promise(res => setTimeout(res, 200));

    const params = new URLSearchParams({
      searchText: 'unique-keyword-abc123',
      limit: '10',
      offset: '0',
    });
    
    // Fixed: Expect 200 for GET request, not 201
    const { data } = await fetchJson(
      `${apiBaseUrl}/v1/observability/logs?${params.toString()}`,
      undefined,
      200
    );

    expect(data.success).toBe(true);
    expect(data.data).toBeDefined();
    expect(Array.isArray(data.data.results)).toBe(true);
  });

  it('should filter logs by severityType via GET /v1/observability/logs', async () => {
    if (!serverRunning) {
      console.warn('Skip: server not running');
      return;
    }

    // Create an error log first
    await fetchJson(
      `${apiBaseUrl}/v1/observability/logs`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          actor: 'system',
          action: 'error',
          scope: 'api',
          target: 'endpoint',
          severityType: 'error',
          message: 'API error test message',
          sourceComponent: 'error-test-api',
        }),
      },
      201
    );
    
    await new Promise(res => setTimeout(res, 100));

    const params = new URLSearchParams({
      severityTypes: 'error',
      limit: '10',
    });
    
    // Fixed: Expect 200 for GET request, not 201
    const { data } = await fetchJson(
      `${apiBaseUrl}/v1/observability/logs?${params.toString()}`,
      undefined,
      200
    );

    expect(data.success).toBe(true);
    expect(Array.isArray(data.data.results)).toBe(true);
  });

  it('should get filter options via GET /v1/observability/logs/filters', async () => {
    if (!serverRunning) {
      console.warn('Skip: server not running');
      return;
    }

    const { data } = await fetchJson(
      `${apiBaseUrl}/v1/observability/logs/filters`,
      undefined,
      200
    );
    
    expect(data.success).toBe(true);
    expect(data.data).toBeDefined();
    expect(Array.isArray(data.data.severityTypes)).toBe(true);
    expect(Array.isArray(data.data.severityLevels)).toBe(true);
    expect(Array.isArray(data.data.sourceComponents)).toBe(true);
    expect(Array.isArray(data.data.patterns)).toBe(true);
  });

  it('should handle malformed JSON or server errors gracefully', async () => {
    if (!serverRunning) {
      console.warn('Skip: server not running');
      return;
    }

    const url = `${apiBaseUrl}/v1/observability/logs`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: 'invalid json {',
    });
    
    const status = res.status;
    expect([400, 500]).toContain(status);

    const contentType = res.headers.get('content-type') ?? '';
    if (contentType.includes('application/json')) {
      const responseData = await parseJsonSafe(res);
      expect(responseData.success).toBe(false);
      expect(responseData.error).toBeDefined();
      expect(typeof responseData.correlationId).toBe('string');
    }
  });

  it('should include correlationId in all responses', async () => {
    if (!serverRunning) {
      console.warn('Skip: server not running');
      return;
    }

    const res = await fetch(`${apiBaseUrl}/v1/observability/logs/filters`);
    const contentType = res.headers.get('content-type') ?? '';
    expect(contentType).toContain('application/json');

    const json = await parseJsonSafe(res);
    expect(typeof json.correlationId).toBe('string');
    expect(json.correlationId.length).toBeGreaterThan(0);
  });
});
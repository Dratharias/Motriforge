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

describe('Audit API Endpoints', () => {
  beforeAll(async () => {
    serverRunning = await isServerRunning();
    if (!serverRunning) {
      console.warn(`API server not reachable at ${apiBaseUrl}. Tests will be skipped.`);
    }
  });

  it('should create an audit entry via POST /v1/observability/audit', async () => {
    if (!serverRunning) {
      console.warn('Skip: server not running');
      return;
    }

    const payload = {
      entityType: 'user_session',
      entityId: 'session-api-test-123',
      action: 'login',
      reason: 'User successful authentication',
      createdBy: 'auth-service',
      userId: 'user-api-test-456',
      ipAddress: '192.168.1.100',
      userAgent: 'Mozilla/5.0 (Test Browser)'
    };

    const { data } = await fetchJson(
      `${apiBaseUrl}/v1/observability/audit`,
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
    expect(data.data.entityType).toBe('user_session');
    expect(data.data.entityId).toBe('session-api-test-123');
    expect(data.data.action).toBe('login');
    expect(typeof data.correlationId).toBe('string');
  });

  it('should validate audit request data and return 400 on invalid input', async () => {
    if (!serverRunning) {
      console.warn('Skip: server not running');
      return;
    }

    const invalidPayload = {
      entityType: '', // invalid - empty
      entityId: '', // invalid - empty
      action: '',   // invalid - empty
      createdBy: '' // invalid - empty
    };

    const url = `${apiBaseUrl}/v1/observability/audit`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(invalidPayload),
    });

    expect(res.status).toBe(400);

    const contentType = res.headers.get('content-type') ?? '';
    expect(contentType).toContain('application/json');
    const responseData = await parseJsonSafe(res);
    expect(responseData.success).toBe(false);
    expect(responseData.error).toBeDefined();
    expect(Array.isArray(responseData.details)).toBe(true);
  });

  it('should search audit entries via GET /v1/observability/audit', async () => {
    if (!serverRunning) {
      console.warn('Skip: server not running');
      return;
    }

    // Create an audit entry first
    await fetchJson(
      `${apiBaseUrl}/v1/observability/audit`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          entityType: 'user_profile',
          entityId: 'profile-search-test-789',
          action: 'update',
          reason: 'Search test audit entry',
          createdBy: 'search-test-service',
          userId: 'user-search-test-456'
        }),
      },
      201
    );
    
    // Wait a moment for processing
    await new Promise(res => setTimeout(res, 200));

    const params = new URLSearchParams({
      entityType: 'user_profile',
      limit: '10',
      offset: '0',
    });
    
    const { data } = await fetchJson(
      `${apiBaseUrl}/v1/observability/audit?${params.toString()}`,
      undefined,
      200
    );

    expect(data.success).toBe(true);
    expect(data.data).toBeDefined();
    expect(Array.isArray(data.data.results)).toBe(true);
    expect(data.data.total).toBeGreaterThanOrEqual(0);
    expect(typeof data.data.hasMore).toBe('boolean');
  });

  it('should filter audit entries by entity type', async () => {
    if (!serverRunning) {
      console.warn('Skip: server not running');
      return;
    }

    // Create test data with different entity types
    await fetchJson(
      `${apiBaseUrl}/v1/observability/audit`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          entityType: 'user_session',
          entityId: 'session-filter-test-1',
          action: 'login',
          createdBy: 'auth-service',
          userId: 'user-filter-test-123'
        })
      },
      201
    );

    await fetchJson(
      `${apiBaseUrl}/v1/observability/audit`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          entityType: 'user_profile',
          entityId: 'profile-filter-test-1',
          action: 'update',
          createdBy: 'profile-service',
          userId: 'user-filter-test-456'
        })
      },
      201
    );

    // Wait for processing
    await new Promise(res => setTimeout(res, 300));

    // Search for user_session entries
    const sessionParams = new URLSearchParams({
      entityType: 'user_session',
      limit: '10'
    });
    
    const { data: sessionData } = await fetchJson(
      `${apiBaseUrl}/v1/observability/audit?${sessionParams.toString()}`,
      undefined,
      200
    );

    expect(sessionData.success).toBe(true);
    expect(sessionData.data.results.length).toBeGreaterThanOrEqual(1);
    expect(sessionData.data.results.every((entry: any) => entry.entityType === 'user_session')).toBe(true);

    // Search for user_profile entries
    const profileParams = new URLSearchParams({
      entityType: 'user_profile',
      limit: '10'
    });
    
    const { data: profileData } = await fetchJson(
      `${apiBaseUrl}/v1/observability/audit?${profileParams.toString()}`,
      undefined,
      200
    );

    expect(profileData.success).toBe(true);
    expect(profileData.data.results.length).toBeGreaterThanOrEqual(1);
    expect(profileData.data.results.every((entry: any) => entry.entityType === 'user_profile')).toBe(true);
  });

  it('should filter audit entries by action', async () => {
    if (!serverRunning) {
      console.warn('Skip: server not running');
      return;
    }

    // Create audit entries with different actions
    await fetchJson(
      `${apiBaseUrl}/v1/observability/audit`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          entityType: 'test_entity',
          entityId: 'action-test-create',
          action: 'create',
          createdBy: 'action-test-service'
        })
      },
      201
    );

    await fetchJson(
      `${apiBaseUrl}/v1/observability/audit`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          entityType: 'test_entity',
          entityId: 'action-test-delete',
          action: 'delete',
          createdBy: 'action-test-service'
        })
      },
      201
    );

    // Wait for processing
    await new Promise(res => setTimeout(res, 300));

    // Search for create actions
    const createParams = new URLSearchParams({
      action: 'create',
      limit: '10'
    });
    
    const { data: createData } = await fetchJson(
      `${apiBaseUrl}/v1/observability/audit?${createParams.toString()}`,
      undefined,
      200
    );

    expect(createData.success).toBe(true);
    expect(createData.data.results.length).toBeGreaterThanOrEqual(1);
    expect(createData.data.results.every((entry: any) => entry.action === 'create')).toBe(true);
  });

  it('should handle pagination in search results', async () => {
    if (!serverRunning) {
      console.warn('Skip: server not running');
      return;
    }

    // Create multiple audit entries
    for (let i = 0; i < 5; i++) {
      await fetchJson(
        `${apiBaseUrl}/v1/observability/audit`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            entityType: 'pagination_test',
            entityId: `pagination-test-${i}`,
            action: 'test',
            createdBy: 'pagination-test-service'
          })
        },
        201
      );
    }

    // Wait for processing
    await new Promise(res => setTimeout(res, 500));

    // Test first page
    const firstPageParams = new URLSearchParams({
      entityType: 'pagination_test',
      limit: '3',
      offset: '0'
    });
    
    const { data: firstPageData } = await fetchJson(
      `${apiBaseUrl}/v1/observability/audit?${firstPageParams.toString()}`,
      undefined,
      200
    );

    expect(firstPageData.success).toBe(true);
    expect(firstPageData.data.results.length).toBeLessThanOrEqual(3);
    expect(firstPageData.data.offset).toBe(0);
    expect(firstPageData.data.limit).toBe(3);

    // Test second page if there are more results
    if (firstPageData.data.hasMore) {
      const secondPageParams = new URLSearchParams({
        entityType: 'pagination_test',
        limit: '3',
        offset: '3'
      });
      
      const { data: secondPageData } = await fetchJson(
        `${apiBaseUrl}/v1/observability/audit?${secondPageParams.toString()}`,
        undefined,
        200
      );

      expect(secondPageData.success).toBe(true);
      expect(secondPageData.data.offset).toBe(3);
      expect(secondPageData.data.limit).toBe(3);
    }
  });

  it('should handle malformed JSON gracefully', async () => {
    if (!serverRunning) {
      console.warn('Skip: server not running');
      return;
    }

    const url = `${apiBaseUrl}/v1/observability/audit`;
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

    // Test successful audit creation
    const { data } = await fetchJson(
      `${apiBaseUrl}/v1/observability/audit`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          entityType: 'correlation_test',
          entityId: 'correlation-test-123',
          action: 'test',
          createdBy: 'correlation-test-service'
        })
      },
      201
    );

    expect(data.success).toBe(true);
    expect(typeof data.correlationId).toBe('string');
    expect(data.correlationId).toBeTruthy();

    // Test search endpoint
    const searchParams = new URLSearchParams({
      entityType: 'correlation_test',
      limit: '1'
    });
    
    const { data: searchData } = await fetchJson(
      `${apiBaseUrl}/v1/observability/audit?${searchParams.toString()}`,
      undefined,
      200
    );

    expect(searchData.success).toBe(true);
    expect(typeof searchData.correlationId).toBe('string');
    expect(searchData.correlationId).toBeTruthy();
  });

  it('should handle date range filtering', async () => {
    if (!serverRunning) {
      console.warn('Skip: server not running');
      return;
    }

    // Create a test audit entry
    await fetchJson(
      `${apiBaseUrl}/v1/observability/audit`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          entityType: 'date_test',
          entityId: 'date-test-123',
          action: 'test',
          createdBy: 'date-test-service'
        })
      },
      201
    );

    // Wait for processing
    await new Promise(res => setTimeout(res, 200));

    // Search with date range that should include the entry (last hour)
    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
    
    const params = new URLSearchParams({
      entityType: 'date_test',
      startDate: oneHourAgo.toISOString(),
      endDate: now.toISOString(),
      limit: '10'
    });
    
    const { data } = await fetchJson(
      `${apiBaseUrl}/v1/observability/audit?${params.toString()}`,
      undefined,
      200
    );

    expect(data.success).toBe(true);
    expect(data.data.results.length).toBeGreaterThanOrEqual(1);
    expect(data.data.results.some((entry: any) => entry.entityId === 'date-test-123')).toBe(true);
  });
});
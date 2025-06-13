import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createServer } from 'http';
import { toNodeListener, createApp, eventHandler } from 'h3';
import handler from '../../src/entry-server';

describe('Logging API Endpoints', () => {
  let server: any;
  const baseUrl = 'http://localhost:3001';

  beforeAll(async () => {
    const app = createApp();
    app.use(eventHandler(handler));
    server = createServer(toNodeListener(app));
    await new Promise<void>((resolve) => {
      server.listen(3001, resolve);
    });
  });

  afterAll(async () => {
    if (server) {
      await new Promise<void>((resolve) => {
        server.close(resolve);
      });
    }
  });

  it('should create log entry via POST /api/v1/observability/logs', async () => {
    const logRequest = {
      actor: 'user',
      action: 'login',
      scope: 'security',
      target: 'session',
      severityType: 'info',
      severityLevel: 'medium',
      message: 'User login successful',
      context: { userId: 'api-test-user-123', ipAddress: '192.168.1.100' },
      sourceComponent: 'auth-api'
    };

    const response = await fetch(`${baseUrl}/api/v1/observability/logs`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(logRequest)
    });

    expect(response.status).toBe(201);

    const responseData = await response.json();
    expect(responseData.success).toBe(true);
    expect(responseData.data).toBeDefined();
    expect(responseData.data.id).toBeDefined();
    expect(responseData.data.pattern).toBe('user.login.security.session');
    expect(responseData.data.message).toBe('User login successful');
    expect(responseData.correlationId).toBeDefined();
  });

  it('should validate log request data', async () => {
    const invalidRequest = {
      actor: '', // Invalid - empty string
      action: 'login',
      scope: 'security',
      target: 'session',
      severityType: 'invalid_severity', // Invalid severity type
      message: '' // Invalid - empty message
    };

    const response = await fetch(`${baseUrl}/api/v1/observability/logs`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(invalidRequest)
    });

    expect(response.status).toBe(400);

    const responseData = await response.json();
    expect(responseData.success).toBe(false);
    expect(responseData.error).toBe('Invalid log request data');
    expect(responseData.details).toBeDefined();
    expect(Array.isArray(responseData.details)).toBe(true);
  });

  it('should search logs via GET /api/v1/observability/logs', async () => {
    // First create some logs to search
    await fetch(`${baseUrl}/api/v1/observability/logs`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        actor: 'user',
        action: 'create',
        scope: 'domain',
        target: 'resource',
        severityType: 'info',
        message: 'Search test log entry with unique keywords',
        sourceComponent: 'search-test-api'
      })
    });

    // Wait a moment for indexing
    await new Promise(resolve => setTimeout(resolve, 100));

    // Search for the log
    const searchParams = new URLSearchParams({
      searchText: 'unique keywords',
      limit: '10',
      offset: '0'
    });

    const response = await fetch(`${baseUrl}/api/v1/observability/logs?${searchParams}`);

    expect(response.status).toBe(200);

    const responseData = await response.json();
    expect(responseData.success).toBe(true);
    expect(responseData.data).toBeDefined();
    expect(responseData.data.results).toBeDefined();
    expect(Array.isArray(responseData.data.results)).toBe(true);
  });

  it('should filter logs by severity type', async () => {
    // Create error log
    await fetch(`${baseUrl}/api/v1/observability/logs`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        actor: 'system',
        action: 'error',
        scope: 'api',
        target: 'endpoint',
        severityType: 'error',
        message: 'API error test message',
        sourceComponent: 'error-test-api'
      })
    });

    // Search for error logs only
    const searchParams = new URLSearchParams({
      severityTypes: 'error',
      limit: '10'
    });

    const response = await fetch(`${baseUrl}/api/v1/observability/logs?${searchParams}`);

    expect(response.status).toBe(200);

    const responseData = await response.json();
    expect(responseData.success).toBe(true);

    if (responseData.data.results.length > 0) {
      responseData.data.results.forEach((result: any) => {
        expect(result.severityType).toBe('error');
      });
    }
  });

  it('should handle quick logging via POST /api/v1/observability/logs/quick', async () => {
    const quickLogRequest = {
      source: 'user-service-api',
      action: 'register',
      severityType: 'info',
      message: 'User registration completed successfully',
      context: { userId: 'quick-user-456', registrationMethod: 'email' }
    };

    const response = await fetch(`${baseUrl}/api/v1/observability/logs/quick`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(quickLogRequest)
    });

    expect(response.status).toBe(201);

    const responseData = await response.json();
    expect(responseData.success).toBe(true);
    expect(responseData.data).toBeDefined();
    expect(responseData.data.pattern).toContain('user'); // Auto-detected from source
    expect(responseData.data.message).toBe('User registration completed successfully');
  });

  it('should get filter options via GET /api/v1/observability/logs/filters', async () => {
    const response = await fetch(`${baseUrl}/api/v1/observability/logs/filters`);

    expect(response.status).toBe(200);

    const responseData = await response.json();
    expect(responseData.success).toBe(true);
    expect(responseData.data).toBeDefined();
    expect(responseData.data.severityTypes).toBeDefined();
    expect(responseData.data.severityLevels).toBeDefined();
    expect(responseData.data.sourceComponents).toBeDefined();
    expect(responseData.data.patterns).toBeDefined();
    expect(Array.isArray(responseData.data.severityTypes)).toBe(true);
  });

  it('should analyze patterns via GET /api/v1/observability/logs/analytics/patterns', async () => {
    // Create some logs first
    await fetch(`${baseUrl}/api/v1/observability/logs`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        actor: 'user',
        action: 'login',
        scope: 'security',
        target: 'session',
        severityType: 'info',
        message: 'Pattern analysis test log',
        sourceComponent: 'pattern-analysis-api'
      })
    });

    const searchParams = new URLSearchParams({
      hoursBack: '1'
    });

    const response = await fetch(`${baseUrl}/api/v1/observability/logs/analytics/patterns?${searchParams}`);

    expect(response.status).toBe(200);

    const responseData = await response.json();
    expect(responseData.success).toBe(true);
    expect(responseData.data).toBeDefined();
    expect(responseData.data.patterns).toBeDefined();
    expect(Array.isArray(responseData.data.patterns)).toBe(true);
    expect(responseData.data.analysisWindow).toBe('1 hours');
    expect(responseData.data.generatedAt).toBeDefined();
  });

  it('should validate pattern analysis parameters', async () => {
    const searchParams = new URLSearchParams({
      hoursBack: '200' // Invalid - exceeds max of 168
    });

    const response = await fetch(`${baseUrl}/api/v1/observability/logs/analytics/patterns?${searchParams}`);

    expect(response.status).toBe(400);

    const responseData = await response.json();
    expect(responseData.success).toBe(false);
    expect(responseData.error).toContain('hoursBack must be between 1 and 168');
  });

  it('should get logs by trace ID', async () => {
    const traceId = 'api-test-trace-123';

    // Create logs with same trace ID
    await fetch(`${baseUrl}/api/v1/observability/logs`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        actor: 'user',
        action: 'start',
        scope: 'workflow',
        target: 'process',
        severityType: 'info',
        message: 'Workflow started',
        sourceComponent: 'workflow-api',
        traceId
      })
    });

    await fetch(`${baseUrl}/api/v1/observability/logs`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        actor: 'system',
        action: 'complete',
        scope: 'workflow',
        target: 'process',
        severityType: 'info',
        message: 'Workflow completed',
        sourceComponent: 'workflow-api',
        traceId
      })
    });

    const response = await fetch(`${baseUrl}/api/v1/observability/logs/trace/${traceId}`);

    expect(response.status).toBe(200);

    const responseData = await response.json();
    expect(responseData.success).toBe(true);
    expect(responseData.data).toBeDefined();
    expect(responseData.data.traceId).toBe(traceId);
    expect(responseData.data.logs).toBeDefined();
    expect(Array.isArray(responseData.data.logs)).toBe(true);
    expect(responseData.data.count).toBeDefined();
  });

  it('should handle invalid trace ID requests', async () => {
    const response = await fetch(`${baseUrl}/api/v1/observability/logs/trace/`);

    expect(response.status).toBe(400);

    const responseData = await response.json();
    expect(responseData.success).toBe(false);
    expect(responseData.error).toBe('Trace ID required');
  });

  it('should handle search parameter validation', async () => {
    const searchParams = new URLSearchParams({
      limit: '2000', // Exceeds max limit
      offset: '-1' // Invalid negative offset
    });

    const response = await fetch(`${baseUrl}/api/v1/observability/logs?${searchParams}`);

    expect(response.status).toBe(400);

    const responseData = await response.json();
    expect(responseData.success).toBe(false);
    expect(responseData.error).toBe('Invalid search parameters');
    expect(responseData.details).toBeDefined();
  });

  it('should handle server errors gracefully', async () => {
    // Test with malformed JSON
    const response = await fetch(`${baseUrl}/api/v1/observability/logs`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: 'invalid json {'
    });

    expect(response.status).toBe(500);

    const responseData = await response.json();
    expect(responseData.success).toBe(false);
    expect(responseData.error).toBeDefined();
    expect(responseData.correlationId).toBeDefined();
  });

  it('should include correlation IDs in all responses', async () => {
    const response = await fetch(`${baseUrl}/api/v1/observability/logs/filters`);

    const responseData = await response.json();
    expect(responseData.correlationId).toBeDefined();
    expect(typeof responseData.correlationId).toBe('string');
    expect(responseData.correlationId.length).toBeGreaterThan(0);
  });

  it('should handle time range filtering', async () => {
    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);

    const searchParams = new URLSearchParams({
      timeFrom: oneHourAgo.toISOString(),
      timeTo: now.toISOString(),
      limit: '10'
    });

    const response = await fetch(`${baseUrl}/api/v1/observability/logs?${searchParams}`);

    expect(response.status).toBe(200);

    const responseData = await response.json();
    expect(responseData.success).toBe(true);
    expect(responseData.data.results).toBeDefined();
  });
});
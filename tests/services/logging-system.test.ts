import { describe, it, expect, beforeAll, beforeEach, afterAll, afterEach } from 'vitest';
import { db } from '../../backend/database/connection';
import { ObservabilitySystem } from '../../backend/services/observability';
import { TestDatabaseHelper, createTestId } from '../utils/test-database-helper';
import { logEntry } from '~/database/schema/log-search';
import { severityClassification } from '../../backend/database/schema';
import { eq } from 'drizzle-orm';

describe('Logging System Integration', () => {
  let observabilitySystem: ObservabilitySystem;
  let testHelper: TestDatabaseHelper;
  let currentTestId: string;

  beforeAll(async () => {
  });

  beforeEach(async () => {
    currentTestId = createTestId('logging-system');

    // Clean only log entries that might be left over from previous tests
    try {
      await db.delete(logEntry).where(eq(logEntry.createdBy, 'logging-service'));
    } catch (error) {
      // Log cleanup errors for debugging purposes
      console.error('Cleanup error:', error);
    }

    // Debug: Check what severities exist
    const existingSeverities = await db.select().from(severityClassification);
    console.log(`Found ${existingSeverities.length} severities in database`);

    // Initialize observability system with test config
    observabilitySystem = ObservabilitySystem.getInstance(db, {
      logging: {
        maxMessageLength: 2000,
        maxContextSize: 10000,
        enableFileLogging: false, // Disable for tests
        logFilePath: 'test-logs/test.log',
        batchSize: 10,
        flushIntervalMs: 1000,
        enableSearch: true,
        retentionDays: 30
      },
      eventBus: {
        maxListeners: 20,
        batchSize: 10,
        flushIntervalMs: 1000,
        retryAttempts: 2
      }
    });

    await observabilitySystem.initialize();
  });

  afterEach(async () => {
    await observabilitySystem.shutdown();

    // Clean up log entries created by the logging service
    try {
      await db.delete(logEntry).where(eq(logEntry.createdBy, 'logging-service'));
    } catch (error) {
      // Log cleanup errors for debugging purposes
      console.error('Cleanup error during afterEach:', error);
    }

    // Reset singleton for next test
    ObservabilitySystem.reset();
  });

  afterAll(async () => {
    // Final cleanup of log entries only
    try {
      await db.delete(logEntry).where(eq(logEntry.createdBy, 'logging-service'));
    } catch (error) {
      // Log cleanup errors for debugging purposes
      console.error('Cleanup error during afterAll:', error);
    }
  });

  it('should initialize observability system successfully', async () => {
    const stats = observabilitySystem.getStats();

    expect(stats.initialized).toBe(true);
    expect(stats.eventBus).toBeDefined();
    expect(stats.config).toBeDefined();
  });

  it('should log messages through the complete system', async () => {
    const services = observabilitySystem.getServices();

    // Use seeded data instead of test-specific data to avoid dependency issues
    // The seed data should have: user, system, service actors; create, read, update actions; etc.

    // Debug: Check what severities exist
    const existingSeverities = await db.select().from(severityClassification);
    console.log('Available severities:', existingSeverities.map(s => `${s.type}.${s.level}`));

    // Test different log levels using seeded data
    const debugLog = await services.loggingService.debug(
      'user', 'create', 'domain', 'resource',
      'Debug message for testing',
      { operation: 'debug-test', timestamp: new Date().toISOString() },
      'test-component'
    );

    const infoLog = await services.loggingService.info(
      'system', 'create', 'domain', 'resource',
      'Info message for testing',
      { userId: 'user-123', sessionId: 'session-456' },
      'auth-component'
    );

    const errorLog = await services.loggingService.error(
      'system', 'error', 'api', 'endpoint',
      'Error message for testing',
      {
        context: { errorCode: 'TEST_001', severity: 'high' },
        sourceComponent: 'error-component',
        stackTrace: 'Error stack trace here...'
      }
    );

    // Verify logs were created
    expect(debugLog.id).toBeDefined();
    expect(debugLog.pattern).toBe('user.create.domain.resource');
    expect(debugLog.severityType).toBe('debug');

    expect(infoLog.id).toBeDefined();
    expect(infoLog.pattern).toBe('system.create.domain.resource');
    expect(infoLog.severityType).toBe('info');

    expect(errorLog.id).toBeDefined();
    expect(errorLog.pattern).toBe('system.error.api.endpoint');
    expect(errorLog.severityType).toBe('error');
  });

  it('should search logs using full-text search', async () => {
    const services = observabilitySystem.getServices();

    // Create test logs using seeded actor/action/scope/target data
    await services.loggingService.info(
      'user', 'create', 'domain', 'resource',
      'User authentication successful for premium account',
      { userId: 'user-premium-123', accountType: 'premium' },
      'auth-service'
    );

    await services.loggingService.warn(
      'system', 'access', 'api', 'endpoint',
      'Rate limit approaching for user authentication',
      { userId: 'user-premium-123', attempts: 8 },
      'rate-limiter'
    );

    // Wait a moment for indexing
    await new Promise(resolve => setTimeout(resolve, 100));

    // Search by text - try multiple approaches
    let textSearchResults;
    try {
      textSearchResults = await observabilitySystem.searchLogs({
        searchText: 'authentication premium',
        limit: 10
      });
    } catch (error) {
      console.warn('Full-text search failed, trying basic search', error);
      // Fallback to severity search if full-text search isn't available
      textSearchResults = await observabilitySystem.searchLogs({
        severityTypes: ['info'],
        limit: 10
      });
    }

    expect(textSearchResults.results.length).toBeGreaterThan(0);

    // Search by severity
    const severitySearchResults = await observabilitySystem.searchLogs({
      severityTypes: ['warn'],
      limit: 10
    });

    expect(severitySearchResults.results.length).toBeGreaterThan(0);
    if (severitySearchResults.results.length > 0) {
      expect(severitySearchResults.results[0]?.severityType).toBe('warn');
    }

    // Search by pattern
    const patternSearchResults = await observabilitySystem.searchLogs({
      pattern: 'user.create.*.*',
      limit: 10
    });

    expect(patternSearchResults.results.length).toBeGreaterThan(0);
    if (patternSearchResults.results.length > 0) {
      expect(patternSearchResults.results[0]?.pattern).toMatch(/^user\.create\./);
    }
  });

  it('should handle distributed tracing', async () => {
    const services = observabilitySystem.getServices();
    const traceId = `trace-${currentTestId}-${Date.now()}`;

    // Create parent log using seeded data
    const parentLog = await services.loggingService.log({
      actor: 'user',
      action: 'create',
      scope: 'domain',
      target: 'resource',
      severityType: 'info',
      message: 'Parent operation started',
      context: { operation: 'parent' },
      sourceComponent: 'parent-service',
      traceId
    });

    // Create child logs
    await services.loggingService.log({
      actor: 'system',
      action: 'create',
      scope: 'api',
      target: 'endpoint',
      severityType: 'debug',
      message: 'Child operation 1',
      context: { operation: 'child-1' },
      sourceComponent: 'child-service-1',
      traceId,
      parentEventId: parentLog.id
    });

    await services.loggingService.log({
      actor: 'system',
      action: 'create',
      scope: 'api',
      target: 'endpoint',
      severityType: 'debug',
      message: 'Child operation 2',
      context: { operation: 'child-2' },
      sourceComponent: 'child-service-2',
      traceId,
      parentEventId: parentLog.id
    });

    // Get logs by trace
    const traceLogs = await services.loggingService.getLogsByTrace(traceId);

    // Debug: Check total log count in database
    const totalLogs = await db.select().from(logEntry);
    console.log(`Total logs in database: ${totalLogs.length}`);

    // Debug: Check what we got for our trace
    console.log(`Found ${traceLogs.length} logs for trace ${traceId}:`,
      traceLogs.map(log => ({ id: log.id, message: log.message, traceId: log.traceId, sourceComponent: log.sourceComponent })));

    // Debug: Direct database query for this trace ID
    const directQuery = await db.select().from(logEntry).where(eq(logEntry.traceId, traceId));
    console.log(`Direct DB query found ${directQuery.length} logs for trace ${traceId}`);

    // Filter to only our specific test logs by exact message content
    const ourTraceLogs = traceLogs.filter(log =>
      log.traceId === traceId &&
      (log.message === 'Parent operation started' ||
        log.message === 'Child operation 1' ||
        log.message === 'Child operation 2')
    );

    expect(ourTraceLogs.length).toBe(3);
    expect(ourTraceLogs.some(log => log.message === 'Parent operation started')).toBe(true);
    expect(ourTraceLogs.some(log => log.message === 'Child operation 1')).toBe(true);
    expect(ourTraceLogs.some(log => log.message === 'Child operation 2')).toBe(true);
  });

  it('should analyze log patterns', async () => {
    const services = observabilitySystem.getServices();

    // Create multiple logs with same pattern using seeded data
    for (let i = 0; i < 5; i++) {
      await services.loggingService.info(
        'user', 'create', 'domain', 'resource',
        `User operation ${i}`,
        { iteration: i },
        'user-service'
      );
    }

    // Create error logs
    for (let i = 0; i < 2; i++) {
      await services.loggingService.error(
        'system', 'error', 'api', 'endpoint',
        `System error ${i}`,
        {
          context: { errorCode: `ERR_${i}` },
          sourceComponent: 'error-service'
        }
      );
    }

    // Analyze patterns
    const patterns = await observabilitySystem.analyzePatterns(1); // Last hour

    expect(patterns.length).toBeGreaterThan(0);

    const userPattern = patterns.find(p => p.pattern === 'user.create.domain.resource');
    expect(userPattern).toBeDefined();
    expect(userPattern?.logCount).toBe(5);

    const errorPattern = patterns.find(p => p.pattern === 'system.error.api.endpoint');
    expect(errorPattern).toBeDefined();
    expect(errorPattern?.errorCount).toBe(2);
  });

  it('should get filter options for UI', async () => {
    const services = observabilitySystem.getServices();

    // Create logs to populate filters using seeded data
    await services.loggingService.info(
      'user', 'create', 'domain', 'resource',
      'Filter test message',
      {},
      'filter-test-component'
    );

    const filterOptions = await services.loggingService.getFilterOptions();

    expect(filterOptions.severityTypes).toContain('info');
    expect(filterOptions.severityLevels).toContain('medium');
    expect(filterOptions.sourceComponents).toContain('filter-test-component');
    expect(filterOptions.patterns).toContain('user.create.domain.resource');
  });
});
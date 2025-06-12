import { describe, it, expect, beforeAll, beforeEach, afterAll } from 'vitest';
import { db } from '../../backend/database/connection';
import { ObservabilitySystem } from '../../backend/services/observability';
import { 
  severityClassification,
  eventActorType,
  eventActionType,
  eventScopeType,
  eventTargetType,
} from '../../backend/database/schema';
import { eq } from 'drizzle-orm';
import { logEntry } from '~/database/schema/log-search';

describe('Logging System Integration', () => {
  let observabilitySystem: ObservabilitySystem;

  beforeAll(async () => {
    // Initialize observability system
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

  afterAll(async () => {
    await observabilitySystem.shutdown();
  });

  beforeEach(async () => {
    // Clean up test data - must delete dependent records first
    await db.delete(logEntry).where(eq(logEntry.createdBy, 'test-system'));
    
    await Promise.all([
      db.delete(severityClassification).where(eq(severityClassification.createdBy, 'test-system')),
      db.delete(eventActorType).where(eq(eventActorType.createdBy, 'test-system')),
      db.delete(eventActionType).where(eq(eventActionType.createdBy, 'test-system')),
      db.delete(eventScopeType).where(eq(eventScopeType.createdBy, 'test-system')),
      db.delete(eventTargetType).where(eq(eventTargetType.createdBy, 'test-system'))
    ]);

    // Set up test data
    await Promise.all([
      db.insert(severityClassification).values([
        { level: 'low', type: 'debug', requiresNotification: false, priorityOrder: 1, createdBy: 'test-system' },
        { level: 'medium', type: 'info', requiresNotification: false, priorityOrder: 4, createdBy: 'test-system' },
        { level: 'high', type: 'warn', requiresNotification: true, priorityOrder: 7, createdBy: 'test-system' },
        { level: 'highest', type: 'error', requiresNotification: true, priorityOrder: 12, createdBy: 'test-system' }
      ]),
      
      db.insert(eventActorType).values([
        { name: 'test-user', displayName: 'Test User', description: 'Test user actor', createdBy: 'test-system' },
        { name: 'test-system', displayName: 'Test System', description: 'Test system actor', createdBy: 'test-system' }
      ]),
      
      db.insert(eventActionType).values([
        { name: 'test-create', displayName: 'Test Create', description: 'Test create action', createdBy: 'test-system' },
        { name: 'test-login', displayName: 'Test Login', description: 'Test login action', createdBy: 'test-system' },
        { name: 'test-error', displayName: 'Test Error', description: 'Test error action', createdBy: 'test-system' }
      ]),
      
      db.insert(eventScopeType).values([
        { name: 'test-domain', displayName: 'Test Domain', description: 'Test domain scope', createdBy: 'test-system' },
        { name: 'test-api', displayName: 'Test API', description: 'Test API scope', createdBy: 'test-system' }
      ]),
      
      db.insert(eventTargetType).values([
        { name: 'test-resource', displayName: 'Test Resource', description: 'Test resource target', createdBy: 'test-system' },
        { name: 'test-endpoint', displayName: 'Test Endpoint', description: 'Test endpoint target', createdBy: 'test-system' }
      ])
    ]);
  });

  it('should initialize observability system successfully', async () => {
    const stats = observabilitySystem.getStats();
    
    expect(stats.initialized).toBe(true);
    expect(stats.eventBus).toBeDefined();
    expect(stats.config).toBeDefined();
  });

  it('should log messages through the complete system', async () => {
    const services = observabilitySystem.getServices();
    
    // Test different log levels
    const debugLog = await services.loggingService.debug(
      'test-user', 'test-create', 'test-domain', 'test-resource',
      'Debug message for testing',
      { operation: 'debug-test', timestamp: new Date().toISOString() },
      'test-component'
    );
    
    const infoLog = await services.loggingService.info(
      'test-system', 'test-login', 'test-api', 'test-endpoint',
      'Info message for testing',
      { userId: 'user-123', sessionId: 'session-456' },
      'auth-component'
    );
    
    const errorLog = await services.loggingService.error(
      'test-system', 'test-error', 'test-api', 'test-endpoint',
      'Error message for testing',
      {
        context: { errorCode: 'TEST_001', severity: 'high' },
        sourceComponent: 'error-component',
        stackTrace: 'Error stack trace here...'
      }
    );

    // Verify logs were created
    expect(debugLog.id).toBeDefined();
    expect(debugLog.pattern).toBe('test-user.test-create.test-domain.test-resource');
    expect(debugLog.severityType).toBe('debug');
    
    expect(infoLog.id).toBeDefined();
    expect(infoLog.pattern).toBe('test-system.test-login.test-api.test-endpoint');
    expect(infoLog.severityType).toBe('info');
    
    expect(errorLog.id).toBeDefined();
    expect(errorLog.pattern).toBe('test-system.test-error.test-api.test-endpoint');
    expect(errorLog.severityType).toBe('error');
  });

  it('should search logs using full-text search', async () => {
    const services = observabilitySystem.getServices();
    
    // Create test logs
    await services.loggingService.info(
      'test-user', 'test-create', 'test-domain', 'test-resource',
      'User authentication successful for premium account',
      { userId: 'user-premium-123', accountType: 'premium' },
      'auth-service'
    );
    
    await services.loggingService.warn(
      'test-system', 'test-login', 'test-api', 'test-endpoint',
      'Rate limit approaching for user authentication',
      { userId: 'user-premium-123', attempts: 8 },
      'rate-limiter'
    );

    // Wait a moment for indexing
    await new Promise(resolve => setTimeout(resolve, 100));

    // Search by text
    const textSearchResults = await observabilitySystem.searchLogs({
      searchText: 'authentication premium',
      limit: 10
    });
    
    expect(textSearchResults.results.length).toBeGreaterThan(0);
    expect(textSearchResults.results[0]?.message).toContain('authentication');

    // Search by severity
    const severitySearchResults = await observabilitySystem.searchLogs({
      severityTypes: ['warn'],
      limit: 10
    });
    
    expect(severitySearchResults.results.length).toBeGreaterThan(0);
    expect(severitySearchResults.results[0]?.severityType).toBe('warn');

    // Search by pattern
    const patternSearchResults = await observabilitySystem.searchLogs({
      pattern: 'test-user.test-create.*.*',
      limit: 10
    });
    
    expect(patternSearchResults.results.length).toBeGreaterThan(0);
    expect(patternSearchResults.results[0]?.pattern).toMatch(/^test-user\.test-create\./);
  });

  it('should handle distributed tracing', async () => {
    const services = observabilitySystem.getServices();
    const traceId = 'trace-test-123';
    
    // Create parent log
    const parentLog = await services.loggingService.log({
      actor: 'test-user',
      action: 'test-create',
      scope: 'test-domain',
      target: 'test-resource',
      severityType: 'info',
      message: 'Parent operation started',
      context: { operation: 'parent' },
      sourceComponent: 'parent-service',
      traceId
    });

    // Create child logs
    await services.loggingService.log({
      actor: 'test-system',
      action: 'test-create',
      scope: 'test-api',
      target: 'test-endpoint',
      severityType: 'debug',
      message: 'Child operation 1',
      context: { operation: 'child-1' },
      sourceComponent: 'child-service-1',
      traceId,
      parentEventId: parentLog.id
    });

    await services.loggingService.log({
      actor: 'test-system',
      action: 'test-create',
      scope: 'test-api',
      target: 'test-endpoint',
      severityType: 'debug',
      message: 'Child operation 2',
      context: { operation: 'child-2' },
      sourceComponent: 'child-service-2',
      traceId,
      parentEventId: parentLog.id
    });

    // Get logs by trace
    const traceLogs = await services.loggingService.getLogsByTrace(traceId);
    
    expect(traceLogs.length).toBe(3);
    expect(traceLogs.some(log => log.message === 'Parent operation started')).toBe(true);
    expect(traceLogs.some(log => log.message === 'Child operation 1')).toBe(true);
    expect(traceLogs.some(log => log.message === 'Child operation 2')).toBe(true);
  });

  it('should analyze log patterns', async () => {
    const services = observabilitySystem.getServices();
    
    // Create multiple logs with same pattern
    for (let i = 0; i < 5; i++) {
      await services.loggingService.info(
        'test-user', 'test-create', 'test-domain', 'test-resource',
        `User operation ${i}`,
        { iteration: i },
        'user-service'
      );
    }

    // Create error logs
    for (let i = 0; i < 2; i++) {
      await services.loggingService.error(
        'test-system', 'test-error', 'test-api', 'test-endpoint',
        `System error ${i}`,
        { context: { errorCode: `ERR_${i}` }, sourceComponent: 'error-service' }
      );
    }

    // Analyze patterns
    const patterns = await observabilitySystem.analyzePatterns(1); // Last hour
    
    expect(patterns.length).toBeGreaterThan(0);
    
    const userPattern = patterns.find(p => p.pattern === 'test-user.test-create.test-domain.test-resource');
    expect(userPattern).toBeDefined();
    expect(userPattern?.logCount).toBe(5);
    
    const errorPattern = patterns.find(p => p.pattern === 'test-system.test-error.test-api.test-endpoint');
    expect(errorPattern).toBeDefined();
    expect(errorPattern?.errorCount).toBe(2);
  });

  it('should get filter options for UI', async () => {
    const services = observabilitySystem.getServices();
    
    // Create logs to populate filters
    await services.loggingService.info(
      'test-user', 'test-create', 'test-domain', 'test-resource',
      'Filter test message',
      {},
      'filter-test-component'
    );

    const filterOptions = await services.loggingService.getFilterOptions();
    
    expect(filterOptions.severityTypes).toContain('info');
    expect(filterOptions.severityLevels).toContain('medium');
    expect(filterOptions.sourceComponents).toContain('filter-test-component');
    expect(filterOptions.patterns).toContain('test-user.test-create.test-domain.test-resource');
  });
});
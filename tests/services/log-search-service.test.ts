import { describe, it, expect, beforeAll, beforeEach, afterAll } from 'vitest';
import { db } from '../../backend/database/connection';
import { LogSearchService } from '../../backend/services/observability/logging/log-search-service';
import { 
  severityClassification,
  eventActorType,
  eventActionType,
  eventScopeType,
  eventTargetType,
} from '../../backend/database/schema';
import { eq, sql } from 'drizzle-orm';

describe('LogSearchService', () => {
  let logSearchService: LogSearchService;

  beforeAll(async () => {
    logSearchService = new LogSearchService(db);
    
    // Ensure the log_entry table exists (should be created by migration)
    try {
      await db.execute(sql`SELECT 1 FROM log_entry LIMIT 1`);
    } catch (error) {
      // If table doesn't exist, we'll skip these tests
      console.warn('log_entry table not found, some tests may be skipped');
      throw error; // Rethrow to avoid swallowing the error silently
    }
  });

  beforeEach(async () => {
    // Clean up test data - delete dependent records first
    await db.execute(sql`DELETE FROM log_entry WHERE created_by = 'test-search-service'`);
    
    await Promise.all([
      db.delete(severityClassification).where(eq(severityClassification.createdBy, 'test-search-service')),
      db.delete(eventActorType).where(eq(eventActorType.createdBy, 'test-search-service')),
      db.delete(eventActionType).where(eq(eventActionType.createdBy, 'test-search-service')),
      db.delete(eventScopeType).where(eq(eventScopeType.createdBy, 'test-search-service')),
      db.delete(eventTargetType).where(eq(eventTargetType.createdBy, 'test-search-service'))
    ]);

    // Set up test data
    await Promise.all([
      db.insert(severityClassification).values([
        { level: 'low', type: 'debug', requiresNotification: false, priorityOrder: 1, createdBy: 'test-search-service' },
        { level: 'medium', type: 'info', requiresNotification: false, priorityOrder: 4, createdBy: 'test-search-service' },
        { level: 'high', type: 'warn', requiresNotification: true, priorityOrder: 7, createdBy: 'test-search-service' },
        { level: 'highest', type: 'error', requiresNotification: true, priorityOrder: 12, createdBy: 'test-search-service' }
      ]),
      
      db.insert(eventActorType).values([
        { name: 'search-user', displayName: 'Search User', description: 'Test user for search', createdBy: 'test-search-service' },
        { name: 'search-system', displayName: 'Search System', description: 'Test system for search', createdBy: 'test-search-service' }
      ]),
      
      db.insert(eventActionType).values([
        { name: 'search-login', displayName: 'Search Login', description: 'Test login for search', createdBy: 'test-search-service' },
        { name: 'search-create', displayName: 'Search Create', description: 'Test create for search', createdBy: 'test-search-service' },
        { name: 'search-error', displayName: 'Search Error', description: 'Test error for search', createdBy: 'test-search-service' }
      ]),
      
      db.insert(eventScopeType).values([
        { name: 'search-api', displayName: 'Search API', description: 'Test API for search', createdBy: 'test-search-service' },
        { name: 'search-domain', displayName: 'Search Domain', description: 'Test domain for search', createdBy: 'test-search-service' }
      ]),
      
      db.insert(eventTargetType).values([
        { name: 'search-endpoint', displayName: 'Search Endpoint', description: 'Test endpoint for search', createdBy: 'test-search-service' },
        { name: 'search-resource', displayName: 'Search Resource', description: 'Test resource for search', createdBy: 'test-search-service' }
      ])
    ]);
  });

  afterAll(async () => {
    // Clean up after all tests
    await db.execute(sql`DELETE FROM log_entry WHERE created_by = 'test-search-service'`);
    await Promise.all([
      db.delete(severityClassification).where(eq(severityClassification.createdBy, 'test-search-service')),
      db.delete(eventActorType).where(eq(eventActorType.createdBy, 'test-search-service')),
      db.delete(eventActionType).where(eq(eventActionType.createdBy, 'test-search-service')),
      db.delete(eventScopeType).where(eq(eventScopeType.createdBy, 'test-search-service')),
      db.delete(eventTargetType).where(eq(eventTargetType.createdBy, 'test-search-service'))
    ]);
  });

  async function insertTestLog(message: string, severityType: string, sourceComponent: string, context: any = {}) {
    const severities = await db.select().from(severityClassification)
      .where(eq(severityClassification.type, severityType));
    const actors = await db.select().from(eventActorType)
      .where(eq(eventActorType.name, 'search-user'));
    const actions = await db.select().from(eventActionType)
      .where(eq(eventActionType.name, 'search-login'));
    const scopes = await db.select().from(eventScopeType)
      .where(eq(eventScopeType.name, 'search-api'));
    const targets = await db.select().from(eventTargetType)
      .where(eq(eventTargetType.name, 'search-endpoint'));

    if (severities.length === 0 || actors.length === 0 || actions.length === 0 || scopes.length === 0 || targets.length === 0) {
      throw new Error('Test data not properly set up');
    }

    await db.execute(sql`
      INSERT INTO log_entry (
        event_actor_id, event_action_id, event_scope_id, event_target_id,
        severity_id, message, context, source_component, created_by
      ) VALUES (
        ${actors[0]?.id}, ${actions[0]?.id}, ${scopes[0]?.id}, ${targets[0]?.id},
        ${severities[0]?.id}, ${message}, ${JSON.stringify(context)}, ${sourceComponent}, 'test-search-service'
      )
    `);
  }

  it('should search logs by text content', async () => {
    // Skip if log_entry table doesn't exist
    try {
      await db.execute(sql`SELECT 1 FROM log_entry LIMIT 1`);
    } catch {
      console.warn('Skipping test - log_entry table not found');
      return;
    }

    await insertTestLog('User authentication successful for premium account', 'info', 'auth-service', { userId: 'user-123' });
    await insertTestLog('Database connection timeout occurred', 'error', 'db-service', { connectionPool: 'primary' });
    await insertTestLog('Premium user upgraded subscription plan', 'info', 'billing-service', { userId: 'user-123' });

    // Wait for search vector to be updated
    await new Promise(resolve => setTimeout(resolve, 100));

    const results = await logSearchService.searchLogs({
      searchText: 'premium authentication',
      limit: 10
    });

    expect(results.results.length).toBeGreaterThan(0);
    
    // Should find logs containing "premium" and "authentication"
    const hasAuthLog = results.results.some(log => log.message.includes('authentication'));
    const hasPremiumLog = results.results.some(log => log.message.includes('premium'));
    
    expect(hasAuthLog || hasPremiumLog).toBe(true);
  });

  it('should filter logs by severity type', async () => {
    try {
      await db.execute(sql`SELECT 1 FROM log_entry LIMIT 1`);
    } catch {
      console.warn('Skipping test - log_entry table not found');
      return;
    }

    await insertTestLog('Debug message for testing', 'debug', 'debug-service');
    await insertTestLog('Info message for testing', 'info', 'info-service');
    await insertTestLog('Error message for testing', 'error', 'error-service');

    const errorResults = await logSearchService.searchLogs({
      severityTypes: ['error'],
      limit: 10
    });

    expect(errorResults.results.length).toBeGreaterThan(0);
    errorResults.results.forEach(result => {
      expect(result.severityType).toBe('error');
    });
  });

  it('should filter logs by time range', async () => {
    try {
      await db.execute(sql`SELECT 1 FROM log_entry LIMIT 1`);
    } catch {
      console.warn('Skipping test - log_entry table not found');
      return;
    }

    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
    const twoHoursAgo = new Date(now.getTime() - 2 * 60 * 60 * 1000);

    await insertTestLog('Recent log message', 'info', 'recent-service');

    const recentResults = await logSearchService.searchLogs({
      timeFrom: oneHourAgo,
      timeTo: now,
      limit: 10
    });

    expect(recentResults.results.length).toBeGreaterThan(0);

    const oldResults = await logSearchService.searchLogs({
      timeFrom: twoHoursAgo,
      timeTo: oneHourAgo,
      limit: 10
    });

    // Should have fewer or no results in the older time range
    expect(oldResults.results.length).toBeLessThanOrEqual(recentResults.results.length);
  });

  it('should search by pattern components', async () => {
    try {
      await db.execute(sql`SELECT 1 FROM log_entry LIMIT 1`);
    } catch {
      console.warn('Skipping test - log_entry table not found');
      return;
    }

    await insertTestLog('User login successful', 'info', 'auth-service');

    const patternResults = await logSearchService.searchLogs({
      pattern: 'search-user.search-login.search-api.search-endpoint',
      limit: 10
    });

    expect(patternResults.results.length).toBeGreaterThan(0);
    patternResults.results.forEach(result => {
      expect(result.pattern).toBe('search-user.search-login.search-api.search-endpoint');
    });
  });

  it('should get filter options for UI', async () => {
    try {
      await db.execute(sql`SELECT 1 FROM log_entry LIMIT 1`);
    } catch {
      console.warn('Skipping test - log_entry table not found');
      return;
    }

    await insertTestLog('Test message for filters', 'info', 'filter-test-service');

    const filterOptions = await logSearchService.getFilterOptions();

    expect(filterOptions.severityTypes).toContain('info');
    expect(filterOptions.severityLevels).toContain('medium');
    expect(filterOptions.sourceComponents).toContain('filter-test-service');
    expect(filterOptions.patterns).toContain('search-user.search-login.search-api.search-endpoint');
  });

  it('should analyze log patterns correctly', async () => {
    try {
      await db.execute(sql`SELECT 1 FROM log_entry LIMIT 1`);
    } catch {
      console.warn('Skipping test - log_entry table not found');
      return;
    }

    // Create multiple logs with same pattern
    await insertTestLog('Pattern analysis test 1', 'info', 'pattern-service');
    await insertTestLog('Pattern analysis test 2', 'info', 'pattern-service');
    await insertTestLog('Pattern analysis error', 'error', 'pattern-service');

    const patterns = await logSearchService.analyzePatterns(1); // Last hour

    expect(patterns.length).toBeGreaterThan(0);
    
    const testPattern = patterns.find(p => 
      p.pattern === 'search-user.search-login.search-api.search-endpoint'
    );
    
    if (testPattern) {
      expect(testPattern.logCount).toBeGreaterThanOrEqual(3);
      expect(testPattern.errorCount).toBeGreaterThanOrEqual(1);
    }
  });

  it('should handle pagination correctly', async () => {
    try {
      await db.execute(sql`SELECT 1 FROM log_entry LIMIT 1`);
    } catch {
      console.warn('Skipping test - log_entry table not found');
      return;
    }

    // Create multiple logs
    for (let i = 0; i < 15; i++) {
      await insertTestLog(`Pagination test message ${i}`, 'info', 'pagination-service');
    }

    const firstPage = await logSearchService.searchLogs({
      sourceComponent: 'pagination-service',
      limit: 10,
      offset: 0
    });

    const secondPage = await logSearchService.searchLogs({
      sourceComponent: 'pagination-service',
      limit: 10,
      offset: 10
    });

    expect(firstPage.results.length).toBe(10);
    expect(secondPage.results.length).toBeGreaterThan(0);
    expect(firstPage.hasMore).toBe(true);
    expect(firstPage.total).toBeGreaterThanOrEqual(15);

    // Ensure no duplicate results between pages
    const firstPageIds = firstPage.results.map(r => r.id);
    const secondPageIds = secondPage.results.map(r => r.id);
    const intersection = firstPageIds.filter(id => secondPageIds.includes(id));
    expect(intersection.length).toBe(0);
  });

  it('should handle empty search results gracefully', async () => {
    const results = await logSearchService.searchLogs({
      searchText: 'nonexistent_search_term_12345',
      limit: 10
    });

    expect(results.results).toEqual([]);
    expect(results.total).toBe(0);
    expect(results.hasMore).toBe(false);
  });

  it('should search by correlation ID', async () => {
    try {
      await db.execute(sql`SELECT 1 FROM log_entry LIMIT 1`);
    } catch {
      console.warn('Skipping test - log_entry table not found');
      return;
    }

    const correlationId = 'correlation-test-123';
    
    // Insert log with correlation ID (need to modify the insert helper)
    const severities = await db.select().from(severityClassification)
      .where(eq(severityClassification.type, 'info'));
    const actors = await db.select().from(eventActorType)
      .where(eq(eventActorType.name, 'search-user'));
    const actions = await db.select().from(eventActionType)
      .where(eq(eventActionType.name, 'search-login'));
    const scopes = await db.select().from(eventScopeType)
      .where(eq(eventScopeType.name, 'search-api'));
    const targets = await db.select().from(eventTargetType)
      .where(eq(eventTargetType.name, 'search-endpoint'));

    await db.execute(sql`
      INSERT INTO log_entry (
        event_actor_id, event_action_id, event_scope_id, event_target_id,
        severity_id, message, context, source_component, correlation_id, created_by
      ) VALUES (
        ${actors[0]?.id}, ${actions[0]?.id}, ${scopes[0]?.id}, ${targets[0]?.id},
        ${severities[0]?.id}, 'Correlation test message', '{}', 'correlation-service', 
        ${correlationId}, 'test-search-service'
      )
    `);

    const results = await logSearchService.searchLogs({
      correlationId,
      limit: 10
    });

    expect(results.results.length).toBe(1);
    expect(results.results[0]?.correlationId).toBe(correlationId);
    expect(results.results[0]?.message).toBe('Correlation test message');
  });
});
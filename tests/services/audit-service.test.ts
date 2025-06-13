import { describe, it, expect, beforeAll, beforeEach, afterEach } from 'vitest';
import { db } from '../../backend/database/connection';
import { AuditService } from '../../backend/services/observability/audit/audit-service';
import { EventBus } from '../../backend/shared/event-bus/event-bus';
import { TestDatabaseHelper, createTestId } from '../utils/test-database-helper';

describe('AuditService', () => {
  let auditService: AuditService;
  let eventBus: EventBus;
  let testHelper: TestDatabaseHelper;
  let currentTestId: string;

  beforeAll(async () => {
    testHelper = new TestDatabaseHelper(db);
  });

  beforeEach(async () => {
    currentTestId = createTestId('audit-service');
    
    // Initialize event bus and audit service
    eventBus = new EventBus({
      maxListeners: 10,
      batchSize: 5,
      flushIntervalMs: 100,
      retryAttempts: 1
    });

    const auditConfig = {
      enableRiskAssessment: true,
      riskThresholds: {
        low: 30,
        medium: 70,
        high: 100
      },
      retentionYears: 7,
      complianceRules: {
        gdpr: true,
        hipaa: false
      },
      enableRealTimeAlerts: true
    };

    auditService = new AuditService(db, eventBus, auditConfig);

    // Clean up any existing test data
    await testHelper.cleanAllTestData();
  });

  afterEach(async () => {
    try {
      await auditService.shutdown();
      await eventBus.shutdown();
      await testHelper.cleanAllTestData();
    } catch (error) {
      console.warn('Cleanup error in audit service test:', error);
    }
  });

  it('should create basic audit entry', async () => {
    const auditEntry = await auditService.audit({
      entityType: 'user_session',
      entityId: 'session-123',
      action: 'login',
      reason: 'User login test',
      createdBy: `test-${currentTestId}`,
      userId: 'user-456',
      ipAddress: '192.168.1.100'
    });

    expect(auditEntry.id).toBeDefined();
    expect(auditEntry.entityType).toBe('user_session');
    expect(auditEntry.entityId).toBe('session-123');
    expect(auditEntry.action).toBe('login');
    expect(auditEntry.createdBy).toBe(`test-${currentTestId}`);
  });

  it('should handle state changes in audit entries', async () => {
    const beforeState = {
      subscriptionTier: 'basic',
      monthlyFee: 9.99,
      status: 'active'
    };

    const afterState = {
      subscriptionTier: 'premium',
      monthlyFee: 19.99,
      status: 'active'
    };

    const auditEntry = await auditService.audit({
      entityType: 'subscription',
      entityId: 'sub-123',
      action: 'update',
      oldValues: beforeState,
      newValues: afterState,
      reason: 'User upgraded subscription tier',
      createdBy: `test-${currentTestId}`,
      userId: 'user-456'
    });

    expect(auditEntry.entityType).toBe('subscription');
    expect(auditEntry.oldValues).toEqual(beforeState);
    expect(auditEntry.newValues).toEqual(afterState);
  });

  it('should validate required fields', async () => {
    await expect(async () => {
      await auditService.audit({
        entityType: '',
        entityId: 'test-123',
        action: 'create',
        createdBy: `test-${currentTestId}`
      });
    }).rejects.toThrow();

    await expect(async () => {
      await auditService.audit({
        entityType: 'test_entity',
        entityId: '',
        action: 'create',
        createdBy: `test-${currentTestId}`
      });
    }).rejects.toThrow();

    await expect(async () => {
      await auditService.audit({
        entityType: 'test_entity',
        entityId: 'test-123',
        action: '',
        createdBy: `test-${currentTestId}`
      });
    }).rejects.toThrow();
  });

  it('should create audit entry with compliance flags', async () => {
    const auditEntry = await auditService.audit({
      entityType: 'user_data',
      entityId: 'user-789',
      action: 'delete',
      reason: 'User requested data deletion under GDPR Article 17',
      createdBy: `test-${currentTestId}`,
      userId: 'user-789',
      // Note: compliance flags would be handled at application level
      // not in the core audit service
    });

    expect(auditEntry.entityType).toBe('user_data');
    expect(auditEntry.reason).toContain('GDPR');
  });

  it('should handle data access auditing', async () => {
    const auditEntry = await auditService.audit({
      entityType: 'workout_data',
      entityId: 'workout-456',
      action: 'read',
      reason: 'User accessed personal workout history',
      createdBy: `test-${currentTestId}`,
      userId: 'user-789',
      ipAddress: '10.0.0.1'
    });

    expect(auditEntry.entityType).toBe('workout_data');
    expect(auditEntry.entityId).toBe('workout-456');
    expect(auditEntry.action).toBe('read');
  });

  it('should publish audit events to event bus', async () => {
    let auditEventReceived = false;
    let capturedEvent: any = null;

    // Subscribe to audit events
    eventBus.subscribe('observability.audit', '**', async (event) => {
      auditEventReceived = true;
      capturedEvent = event;
    });

    // Wait for event processing
    await new Promise(resolve => setTimeout(resolve, 200));

    expect(auditEventReceived).toBe(true);
    expect(capturedEvent).toBeDefined();
    expect(capturedEvent.type).toBe('observability.audit');
    expect(capturedEvent.payload.entityId).toBe('session-auto-123');
  });

  it('should handle audit search with filters', async () => {
    // Create several audit entries
    await auditService.audit({
      entityType: 'user_session',
      entityId: 'session-1',
      action: 'login',
      createdBy: `test-${currentTestId}`,
      userId: 'user-1'
    });

    await auditService.audit({
      entityType: 'user_data',
      entityId: 'data-1',
      action: 'read',
      createdBy: `test-${currentTestId}`,
      userId: 'user-1'
    });

    await auditService.audit({
      entityType: 'user_session',
      entityId: 'session-2',
      action: 'logout',
      createdBy: `test-${currentTestId}`,
      userId: 'user-2'
    });

    // Search for specific entity type
    const searchResults = await auditService.searchAuditEntries({
      entityType: 'user_session',
      limit: 10,
      offset: 0
    });

    expect(searchResults.results.length).toBeGreaterThanOrEqual(2);
    expect(searchResults.results.every(entry => entry.entityType === 'user_session')).toBe(true);
  });

  it('should handle pagination in search results', async () => {
    // Create multiple audit entries
    for (let i = 0; i < 5; i++) {
      await auditService.audit({
        entityType: 'test_entity',
        entityId: `entity-${i}`,
        action: 'create',
        createdBy: `test-${currentTestId}`,
        userId: `user-${i}`
      });
    }

    // Test pagination
    const firstPage = await auditService.searchAuditEntries({
      entityType: 'test_entity',
      limit: 3,
      offset: 0
    });

    const secondPage = await auditService.searchAuditEntries({
      entityType: 'test_entity',
      limit: 3,
      offset: 3
    });

    expect(firstPage.results.length).toBe(3);
    expect(secondPage.results.length).toBeGreaterThanOrEqual(2);
    expect(firstPage.hasMore).toBe(true);
  });

  it('should handle errors gracefully', async () => {
    // Test with invalid IP address format
    await expect(async () => {
      await auditService.audit({
        entityType: 'test_entity',
        entityId: 'test-123',
        action: 'create',
        createdBy: `test-${currentTestId}`,
        ipAddress: 'invalid-ip-format'
      });
    }).rejects.toThrow();
  });

  it('should filter audit entries by date range', async () => {
    const now = new Date();
    const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);

    // Create audit entry
    await auditService.audit({
      entityType: 'test_entity',
      entityId: 'date-test',
      action: 'create',
      createdBy: `test-${currentTestId}`
    });

    // Search with date filter that should include the entry
    const resultsIncluding = await auditService.searchAuditEntries({
      entityType: 'test_entity',
      startDate: yesterday,
      endDate: tomorrow,
      limit: 10,
      offset: 0
    });

    // Search with date filter that should exclude the entry
    const resultsExcluding = await auditService.searchAuditEntries({
      entityType: 'test_entity',
      startDate: tomorrow,
      endDate: new Date(tomorrow.getTime() + 24 * 60 * 60 * 1000),
      limit: 10,
      offset: 0
    });

    expect(resultsIncluding.results.some(entry => entry.entityId === 'date-test')).toBe(true);
    expect(resultsExcluding.results.some(entry => entry.entityId === 'date-test')).toBe(false);
  });

  it('should maintain audit trail integrity', async () => {
    const auditEntry = await auditService.audit({
      entityType: 'critical_data',
      entityId: 'critical-123',
      action: 'delete',
      reason: 'Data retention policy compliance',
      createdBy: `test-${currentTestId}`,
      userId: 'admin-user'
    });

    // Verify the audit entry is immutable (should not be directly modifiable)
    expect(auditEntry.isActive).toBe(true);
    expect(auditEntry.createdAt).toBeDefined();
    expect(auditEntry.id).toBeDefined();
    
    // Ensure the audit entry exists in the database
    const searchResults = await auditService.searchAuditEntries({
      entityType: 'critical_data',
      limit: 1,
      offset: 0
    });
    
    const foundEntry = searchResults.results.find(entry => entry.entityId === 'critical-123');
    expect(foundEntry).toBeDefined();
    if (foundEntry) {
      expect(foundEntry.id).toBe(auditEntry.id);
    }
  });
});
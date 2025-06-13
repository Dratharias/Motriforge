import { describe, it, expect, beforeAll, beforeEach, afterEach } from 'vitest';
import { db } from '../../backend/database/connection';
import { AuditService } from '../../backend/services/observability/audit/audit-service';
import { EventBus } from '../../backend/shared/event-bus/event-bus';
import { TestDatabaseHelper, createTestId } from '../utils/test-database-helper';

describe('Audit System Integration', () => {
  let auditService: AuditService;
  let eventBus: EventBus;
  let testHelper: TestDatabaseHelper;
  let currentTestId: string;

  beforeAll(async () => {
    testHelper = new TestDatabaseHelper(db);
  });

  beforeEach(async () => {
    currentTestId = createTestId('audit-integration');
    
    // Initialize event bus
    eventBus = new EventBus({
      maxListeners: 10,
      batchSize: 5,
      flushIntervalMs: 100,
      retryAttempts: 1
    });

    // Initialize audit service with test configuration
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
      console.warn('Cleanup error in audit system integration test:', error);
    }
  });

  it('should create and retrieve audit entries end-to-end', async () => {
    // Create an audit entry
    const auditEntry = await auditService.audit({
      entityType: 'user_account',
      entityId: 'user-integration-123',
      action: 'login',
      reason: 'User login attempt',
      createdBy: `test-${currentTestId}`,
      userId: 'user-123',
      ipAddress: '192.168.1.100',
      userAgent: 'Mozilla/5.0 (Test Browser)'
    });

    expect(auditEntry.id).toBeDefined();
    expect(auditEntry.entityType).toBe('user_account');
    expect(auditEntry.action).toBe('login');

    // Verify we can retrieve it via search
    const searchResults = await auditService.searchAuditEntries({
      entityType: 'user_account',
      limit: 10,
      offset: 0
    });

    const foundEntry = searchResults.results.find(entry => entry.id === auditEntry.id);
    expect(foundEntry).toBeDefined();
    expect(foundEntry?.entityId).toBe('user-integration-123');
  });

  it('should handle concurrent audit operations', async () => {
    const promises = [];

    // Create multiple audit entries concurrently
    for (let i = 0; i < 5; i++) {
      promises.push(
        auditService.audit({
          entityType: 'concurrent_test',
          entityId: `entity-${i}`,
          action: 'create',
          reason: `Concurrent test ${i}`,
          createdBy: `test-${currentTestId}`,
          userId: `user-${i}`
        })
      );
    }

    const auditEntries = await Promise.all(promises);

    // Verify all entries were created
    expect(auditEntries).toHaveLength(5);
    auditEntries.forEach((entry, index) => {
      expect(entry.id).toBeDefined();
      expect(entry.entityId).toBe(`entity-${index}`);
    });

    // Verify we can find all entries
    const searchResults = await auditService.searchAuditEntries({
      entityType: 'concurrent_test',
      limit: 10,
      offset: 0
    });

    expect(searchResults.results.length).toBe(5);
  });

  it('should integrate with event bus for real-time notifications', async () => {
    let eventsReceived: any[] = [];

    // Subscribe to audit events
    eventBus.subscribe('observability.audit', '**', async (event) => {
      eventsReceived.push(event);
    });

    // Create multiple audit entries
    await auditService.audit({
      entityType: 'event_test',
      entityId: 'event-1',
      action: 'create',
      reason: 'Event test 1',
      createdBy: `test-${currentTestId}`
    });

    await auditService.audit({
      entityType: 'event_test',
      entityId: 'event-2',
      action: 'update',
      reason: 'Event test 2',
      createdBy: `test-${currentTestId}`
    });

    // Wait for events to be processed
    await new Promise(resolve => setTimeout(resolve, 300));

    expect(eventsReceived.length).toBe(2);
    expect(eventsReceived[0].type).toBe('observability.audit');
    expect(eventsReceived[1].type).toBe('observability.audit');
  });

  it('should handle data state changes in audit trail', async () => {
    const originalData = {
      username: 'testuser',
      email: 'test@example.com',
      status: 'active'
    };

    const updatedData = {
      username: 'testuser',
      email: 'newemail@example.com',
      status: 'active'
    };

    // Create audit entry with state change
    const auditEntry = await auditService.audit({
      entityType: 'user_profile',
      entityId: 'profile-123',
      action: 'update',
      oldValues: originalData,
      newValues: updatedData,
      reason: 'User updated email address',
      createdBy: `test-${currentTestId}`,
      userId: 'user-123'
    });

    expect(auditEntry.oldValues).toEqual(originalData);
    expect(auditEntry.newValues).toEqual(updatedData);
    expect(auditEntry.reason).toContain('email');
  });

  it('should support compliance audit workflows', async () => {
    // Create a series of related audit entries for compliance
    const entries = [];

    // Data access
    entries.push(await auditService.audit({
      entityType: 'personal_data',
      entityId: 'gdpr-test-123',
      action: 'read',
      reason: 'User requested data export (GDPR Article 15)',
      createdBy: `test-${currentTestId}`,
      userId: 'gdpr-user-123'
    }));

    // Data modification
    entries.push(await auditService.audit({
      entityType: 'personal_data',
      entityId: 'gdpr-test-123',
      action: 'update',
      reason: 'User corrected personal information (GDPR Article 16)',
      createdBy: `test-${currentTestId}`,
      userId: 'gdpr-user-123'
    }));

    // Data deletion
    entries.push(await auditService.audit({
      entityType: 'personal_data',
      entityId: 'gdpr-test-123',
      action: 'delete',
      reason: 'User exercised right to be forgotten (GDPR Article 17)',
      createdBy: `test-${currentTestId}`,
      userId: 'gdpr-user-123'
    }));

    // Verify all compliance entries were created
    expect(entries).toHaveLength(3);
    entries.forEach(entry => {
      expect(entry.id).toBeDefined();
      expect(entry.reason).toContain('GDPR');
    });

    // Search for compliance-related entries
    const searchResults = await auditService.searchAuditEntries({
      entityType: 'personal_data',
      limit: 10,
      offset: 0
    });

    const gdprEntries = searchResults.results.filter(entry => 
      entry.reason?.includes('GDPR')
    );

    expect(gdprEntries.length).toBe(3);
  });

  it('should handle audit search with multiple filters', async () => {
    // Create test data with different characteristics
    const testData = [
      {
        entityType: 'user_session',
        entityId: 'session-1',
        action: 'login',
        createdBy: 'auth-service'
      },
      {
        entityType: 'user_session', 
        entityId: 'session-2',
        action: 'logout',
        createdBy: 'auth-service'
      },
      {
        entityType: 'user_data',
        entityId: 'data-1',
        action: 'read',
        createdBy: 'api-service'
      }
    ];

    // Create all test entries
    for (const data of testData) {
      await auditService.audit({
        ...data,
        reason: `Test for ${data.action}`,
        userId: 'filter-test-user'
      });
    }

    // Test filtering by entity type
    const sessionResults = await auditService.searchAuditEntries({
      entityType: 'user_session',
      limit: 10,
      offset: 0
    });

    expect(sessionResults.results.length).toBe(2);
    expect(sessionResults.results.every(entry => entry.entityType === 'user_session')).toBe(true);

    // Test filtering by action
    const loginResults = await auditService.searchAuditEntries({
      action: 'login',
      limit: 10,
      offset: 0
    });

    expect(loginResults.results.length).toBe(1);
    expect(loginResults.results[0]?.action).toBe('login');

    // Test filtering by createdBy
    const authServiceResults = await auditService.searchAuditEntries({
      createdBy: 'auth-service',
      limit: 10,
      offset: 0
    });

    expect(authServiceResults.results.length).toBe(2);
    expect(authServiceResults.results.every(entry => entry.createdBy === 'auth-service')).toBe(true);
  });

  it('should maintain audit data integrity under load', async () => {
    const batchSize = 10;
    const batches = 3;
    
    for (let batch = 0; batch < batches; batch++) {
      const promises = [];
      
      for (let i = 0; i < batchSize; i++) {
        promises.push(
          auditService.audit({
            entityType: 'load_test',
            entityId: `load-${batch}-${i}`,
            action: 'stress_test',
            reason: `Load test batch ${batch}, item ${i}`,
            createdBy: `test-${currentTestId}`,
            userId: `user-${batch}-${i}`
          })
        );
      }

      // Wait for each batch to complete before starting next
      await Promise.all(promises);
    }

    // Verify all entries were created correctly
    const searchResults = await auditService.searchAuditEntries({
      entityType: 'load_test',
      limit: 50,
      offset: 0
    });

    expect(searchResults.results.length).toBe(batchSize * batches);
    
    // Verify data integrity - each entry should be unique
    const entityIds = searchResults.results.map(entry => entry.entityId);
    const uniqueEntityIds = new Set(entityIds);
    expect(uniqueEntityIds.size).toBe(batchSize * batches);
  });

  it('should properly handle error conditions', async () => {
    // Test validation errors
    await expect(async () => {
      await auditService.audit({
        entityType: '', // Invalid: empty string
        entityId: 'test-123',
        action: 'test',
        createdBy: `test-${currentTestId}`
      });
    }).rejects.toThrow();

    // Test with missing required fields
    await expect(async () => {
      await auditService.audit({
        entityType: 'test_entity',
        entityId: 'test-123',
        action: '', // Invalid: empty action
        createdBy: `test-${currentTestId}`
      });
    }).rejects.toThrow();

    // Verify that valid entries still work after errors
    const validEntry = await auditService.audit({
      entityType: 'error_recovery_test',
      entityId: 'recovery-123',
      action: 'create',
      reason: 'Testing error recovery',
      createdBy: `test-${currentTestId}`
    });

    expect(validEntry.id).toBeDefined();
    expect(validEntry.entityType).toBe('error_recovery_test');
  });
});
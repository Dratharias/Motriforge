import { describe, it, expect, beforeEach } from 'vitest';
import { EventFactory } from '../../backend/shared/factories/event-factory';

describe('EventFactory', () => {
  let eventFactory: EventFactory;

  beforeEach(() => {
    eventFactory = new EventFactory('test-service');
  });

  it('should create basic observability event', () => {
    const event = eventFactory.createEvent({
      actor: 'user',
      action: 'create',
      scope: 'domain',
      target: 'resource',
      severityType: 'info',
      severityLevel: 'medium',
      userId: 'user-123',
      payload: { operation: 'test' }
    });

    expect(event.id).toBeDefined();
    expect(event.type).toBe('observability.event');
    expect(event.pattern).toBe('user.create.domain.resource');
    expect(event.payload.operation).toBe('test');
    expect(event.payload.userId).toBe('user-123');
    expect(event.metadata.timestamp).toBeInstanceOf(Date);
    expect(event.metadata.source).toBe('test-service');
    expect(event.metadata.severity?.type).toBe('info');
    expect(event.metadata.severity?.level).toBe('medium');
  });

  it('should create log event with proper structure', () => {
    const logEvent = eventFactory.createLogEvent({
      actor: 'system',
      action: 'error',
      scope: 'api',
      target: 'endpoint',
      severityType: 'error',
      severityLevel: 'high',
      message: 'Database connection failed',
      context: { connectionPool: 'primary', retryAttempt: 3 },
      sourceFile: 'database.ts',
      lineNumber: 42,
      stackTrace: 'Error: Connection timeout\n  at connect...',
      payload: { system: 'database' }
    });

    expect(logEvent.type).toBe('observability.log');
    expect(logEvent.pattern).toBe('system.error.api.endpoint');
    expect(logEvent.payload.message).toBe('Database connection failed');
    expect(logEvent.payload.context).toEqual({ connectionPool: 'primary', retryAttempt: 3 });
    expect(logEvent.payload.sourceFile).toBe('database.ts');
    expect(logEvent.payload.lineNumber).toBe(42);
    expect(logEvent.payload.stackTrace).toContain('Connection timeout');
    expect(logEvent.metadata.severity?.type).toBe('error');
    expect(logEvent.metadata.severity?.level).toBe('high');
  });

  it('should create audit event with compliance data', () => {
    const auditEvent = eventFactory.createAuditEvent({
      actor: 'user',
      action: 'update',
      scope: 'profile',
      target: 'user_data',
      severityType: 'audit',
      severityLevel: 'high',
      auditType: 'data_access',
      resourceId: 'user-profile-456',
      beforeState: { email: 'old@example.com' },
      afterState: { email: 'new@example.com' },
      ipAddress: '192.168.1.100',
      userAgent: 'Mozilla/5.0...',
      riskScore: 75,
      payload: { userId: 'user-456' }
    });

    expect(auditEvent.type).toBe('observability.audit');
    expect(auditEvent.payload.auditType).toBe('data_access');
    expect(auditEvent.payload.resourceId).toBe('user-profile-456');
    expect(auditEvent.payload.beforeState).toEqual({ email: 'old@example.com' });
    expect(auditEvent.payload.afterState).toEqual({ email: 'new@example.com' });
    expect(auditEvent.payload.ipAddress).toBe('192.168.1.100');
    expect(auditEvent.payload.riskScore).toBe(75);
    expect(auditEvent.metadata.severity?.type).toBe('audit');
    expect(auditEvent.metadata.severity?.level).toBe('high');
  });

  it('should create error event with automatic severity defaults', () => {
    const errorEvent = eventFactory.createErrorEvent({
      actor: 'service',
      action: 'process',
      scope: 'payment',
      target: 'transaction',
      errorType: 'validation',
      errorCode: 'INVALID_CARD',
      message: 'Credit card validation failed',
      stackTrace: 'ValidationError: Invalid card number...',
      context: { cardType: 'visa', lastFour: '1234' },
      payload: { transactionId: 'txn-789' }
    });

    expect(errorEvent.type).toBe('observability.error');
    expect(errorEvent.payload.errorType).toBe('validation');
    expect(errorEvent.payload.errorCode).toBe('INVALID_CARD');
    expect(errorEvent.payload.message).toBe('Credit card validation failed');
    expect(errorEvent.payload.context).toEqual({ cardType: 'visa', lastFour: '1234' });
    expect(errorEvent.metadata.severity?.type).toBe('error');
    expect(errorEvent.metadata.severity?.level).toBe('high'); // Auto default for error
  });

  it('should create lifecycle event for data management', () => {
    const lifecycleEvent = eventFactory.createLifecycleEvent({
      actor: 'system',
      action: 'archive',
      scope: 'data',
      target: 'user_records',
      lifecycleType: 'archival',
      resourceType: 'user_data',
      resourceId: 'user-old-123',
      retentionPolicy: '7_years',
      dataSize: 1024000,
      payload: { reason: 'data_retention_policy' }
    });

    expect(lifecycleEvent.type).toBe('observability.lifecycle');
    expect(lifecycleEvent.payload.lifecycleType).toBe('archival');
    expect(lifecycleEvent.payload.resourceType).toBe('user_data');
    expect(lifecycleEvent.payload.resourceId).toBe('user-old-123');
    expect(lifecycleEvent.payload.retentionPolicy).toBe('7_years');
    expect(lifecycleEvent.payload.dataSize).toBe(1024000);
    expect(lifecycleEvent.metadata.severity?.type).toBe('lifecycle');
    expect(lifecycleEvent.metadata.severity?.level).toBe('medium'); // Auto default for lifecycle
  });

  it('should create event batch with shared correlation ID', () => {
    const requests = [
      {
        actor: 'user',
        action: 'login',
        scope: 'security',
        target: 'session',
        payload: { step: 'authentication' }
      },
      {
        actor: 'user',
        action: 'create',
        scope: 'security',
        target: 'session',
        payload: { step: 'session_creation' }
      },
      {
        actor: 'user',
        action: 'complete',
        scope: 'security',
        target: 'login',
        payload: { step: 'login_complete' }
      }
    ];

    const events = eventFactory.createEventBatch(requests);

    expect(events.length).toBe(3);
    
    // All events should have the same correlation ID
    const correlationIds = events.map(e => e.metadata.correlationId);
    expect(new Set(correlationIds).size).toBe(1);

    // But different event IDs
    const eventIds = events.map(e => e.id);
    expect(new Set(eventIds).size).toBe(3);

    // Check specific events
    expect(events[0]?.pattern).toBe('user.login.security.session');
    expect(events[1]?.pattern).toBe('user.create.security.session');
    expect(events[2]?.pattern).toBe('user.complete.security.login');
  });

  it('should create child event with inherited context', () => {
    const parentEvent = eventFactory.createEvent({
      actor: 'user',
      action: 'start',
      scope: 'workflow',
      target: 'process',
      payload: { workflowId: 'wf-123', userId: 'user-456' },
      traceId: 'trace-parent',
      correlationId: 'corr-parent'
    });

    const childEvent = eventFactory.createChildEvent(parentEvent, {
      action: 'step',
      payload: { step: 1, stepName: 'validation' }
    });

    expect(childEvent.pattern).toBe('user.step.workflow.process');
    expect(childEvent.payload.parentEventId).toBe(parentEvent.id);
    expect(childEvent.payload.traceId).toBe('trace-parent');
    expect(childEvent.metadata.correlationId).toBe('corr-parent');
    expect(childEvent.payload.workflowId).toBe('wf-123'); // Inherited from parent
    expect(childEvent.payload.step).toBe(1); // New payload data
  });

  it('should validate event patterns', () => {
    // Valid patterns
    expect(eventFactory.validatePattern('user', 'create', 'domain', 'resource')).toBe(true);
    expect(eventFactory.validatePattern('sys_admin', 'update_config', 'api_v2', 'endpoint_auth')).toBe(true);

    // Invalid patterns
    expect(eventFactory.validatePattern('', 'create', 'domain', 'resource')).toBe(false);
    expect(eventFactory.validatePattern('user', '', 'domain', 'resource')).toBe(false);
    expect(eventFactory.validatePattern('USER', 'create', 'domain', 'resource')).toBe(false); // uppercase
    expect(eventFactory.validatePattern('user-name', 'create', 'domain', 'resource')).toBe(false); // hyphen
    expect(eventFactory.validatePattern('123user', 'create', 'domain', 'resource')).toBe(false); // starts with number
    expect(eventFactory.validatePattern('a'.repeat(51), 'create', 'domain', 'resource')).toBe(false); // too long
  });

  it('should create event from source with auto-detection', () => {
    // User source detection
    const userEvent = eventFactory.createEventFromSource(
      'user-service-auth',
      'authenticate',
      { userId: 'user-123' }
    );

    expect(userEvent.pattern).toBe('user.authenticate.domain.resource');
    expect(userEvent.metadata.source).toBe('user-service-auth');

    // System source detection
    const systemEvent = eventFactory.createEventFromSource(
      'system-monitor',
      'health_check',
      { status: 'healthy' }
    );

    expect(systemEvent.pattern).toBe('system.health_check.system.service');

    // Service source detection
    const serviceEvent = eventFactory.createEventFromSource(
      'api-service-gateway',
      'route_request',
      { endpoint: '/api/v1/users' }
    );

    expect(serviceEvent.pattern).toBe('service.route_request.api.endpoint');

    // Unknown source detection
    const unknownEvent = eventFactory.createEventFromSource(
      'unknown-component',
      'process',
      { data: 'test' }
    );

    expect(unknownEvent.pattern).toBe('system.process.system.unknown');
  });

  it('should use default severity levels correctly', () => {
    const debugEvent = eventFactory.createEvent({
      actor: 'system',
      action: 'trace',
      scope: 'debug',
      target: 'log',
      severityType: 'debug',
      payload: {}
    });

    const auditEvent = eventFactory.createEvent({
      actor: 'user',
      action: 'access',
      scope: 'data',
      target: 'record',
      severityType: 'audit',
      payload: {}
    });

    expect(debugEvent.metadata.severity?.level).toBe('low');
    expect(auditEvent.metadata.severity?.level).toBe('medium');
  });

  it('should handle singleton pattern correctly', () => {
    const factory1 = EventFactory.getInstance('service-1');
    const factory2 = EventFactory.getInstance('service-2');
    
    // Should return the same instance
    expect(factory1).toBe(factory2);
    
    // Should use the first provided source
    const event = factory1.createEvent({
      actor: 'test',
      action: 'test',
      scope: 'test',
      target: 'test',
      payload: {}
    });
    
    expect(event.metadata.source).toBe('service-1');
  });
});
import { describe, it, expect, beforeAll, beforeEach } from 'vitest';
import { db } from '../../backend/database/connection';
import { EventService } from '../../backend/services/observability/event-service';
import { 
  severityClassification,
  eventActorType,
  eventActionType,
  eventScopeType,
  eventTargetType,
  eventLog
} from '../../backend/database/schema';
import { eq } from 'drizzle-orm';

describe('EventService', () => {
  let eventService: EventService;

  beforeAll(() => {
    eventService = new EventService(db);
  });

  beforeEach(async () => {
    // Clean up test data
    await Promise.all([
      db.delete(eventLog).where(eq(eventLog.createdBy, 'test')),
      db.delete(severityClassification).where(eq(severityClassification.createdBy, 'test')),
      db.delete(eventActorType).where(eq(eventActorType.createdBy, 'test')),
      db.delete(eventActionType).where(eq(eventActionType.createdBy, 'test')),
      db.delete(eventScopeType).where(eq(eventScopeType.createdBy, 'test')),
      db.delete(eventTargetType).where(eq(eventTargetType.createdBy, 'test'))
    ]);

    // Set up test data
    await db.insert(severityClassification).values({
      level: 'medium',
      type: 'info',
      requiresNotification: false,
      priorityOrder: 1,
      createdBy: 'test',
      isActive: true
    });

    await db.insert(eventActorType).values({
      name: 'test-user',
      displayName: 'Test User',
      description: 'Test user actor',
      createdBy: 'test',
      isActive: true
    });

    await db.insert(eventActionType).values({
      name: 'test-create',
      displayName: 'Test Create',
      description: 'Test create action',
      createdBy: 'test',
      isActive: true
    });

    await db.insert(eventScopeType).values({
      name: 'test-domain',
      displayName: 'Test Domain',
      description: 'Test domain scope',
      createdBy: 'test',
      isActive: true
    });

    await db.insert(eventTargetType).values({
      name: 'test-resource',
      displayName: 'Test Resource',
      description: 'Test resource target',
      createdBy: 'test',
      isActive: true
    });
  });

  it('should process valid event with Actor.Action.Scope.Target pattern', async () => {
    const eventRequest = {
      actor: 'test-user',
      action: 'test-create',
      scope: 'test-domain',
      target: 'test-resource',
      severityType: 'info',
      severityLevel: 'medium',
      userId: 'user-123',
      eventData: { message: 'Test event processing' },
      contextData: { source: 'unit-test' },
      createdBy: 'test'
    };

    const result = await eventService.processEvent(eventRequest);

    expect(result.status).toBe('success');
    expect(result.id).toBeDefined();
    expect(result.pattern).toBe('test-user.test-create.test-domain.test-resource');
    expect(result.eventData).toEqual({ message: 'Test event processing' });
  });

  it('should validate Actor.Action.Scope.Target pattern', async () => {
    const validPattern = await eventService.validatePattern(
      'test-user', 
      'test-create', 
      'test-domain', 
      'test-resource'
    );
    expect(validPattern).toBe(true);

    const invalidPattern = await eventService.validatePattern(
      'invalid-actor', 
      'test-create', 
      'test-domain', 
      'test-resource'
    );
    expect(invalidPattern).toBe(false);
  });

  it('should handle invalid pattern gracefully', async () => {
    const eventRequest = {
      actor: 'invalid-actor',
      action: 'test-create',
      scope: 'test-domain',
      target: 'test-resource',
      severityType: 'info',
      eventData: { message: 'Test with invalid actor' },
      createdBy: 'test'
    };

    const result = await eventService.processEvent(eventRequest);

    expect(result.status).toBe('failed');
    expect(result.errorDetails).toContain('Unknown actor');
  });

  it('should get events by pattern', async () => {
    // First create an event
    const eventRequest = {
      actor: 'test-user',
      action: 'test-create',
      scope: 'test-domain',
      target: 'test-resource',
      severityType: 'info',
      eventData: { message: 'Pattern search test' },
      createdBy: 'test'
    };

    await eventService.processEvent(eventRequest);

    // Then search for it
    const events = await eventService.getEventsByPattern(
      'test-user',
      'test-create', 
      'test-domain',
      'test-resource'
    );

    expect(events.length).toBeGreaterThan(0);
    expect(events[0].eventData).toEqual({ message: 'Pattern search test' });
  });

  it('should handle distributed tracing', async () => {
    const traceId = 'trace-123';
    
    const parentEvent = {
      actor: 'test-user',
      action: 'test-create',
      scope: 'test-domain',
      target: 'test-resource',
      severityType: 'info',
      traceId,
      eventData: { message: 'Parent event' },
      createdBy: 'test'
    };

    const parentResult = await eventService.processEvent(parentEvent);

    const childEvent = {
      actor: 'test-user',
      action: 'test-create',
      scope: 'test-domain',
      target: 'test-resource',
      severityType: 'info',
      traceId,
      parentEventId: parentResult.id,
      eventData: { message: 'Child event' },
      createdBy: 'test'
    };

    await eventService.processEvent(childEvent);

    const traceEvents = await eventService.getEventsByTrace(traceId);
    expect(traceEvents.length).toBe(2);

    const childEvents = await eventService.getChildEvents(parentResult.id);
    expect(childEvents.length).toBe(1);
    expect(childEvents[0].eventData).toEqual({ message: 'Child event' });
  });
});
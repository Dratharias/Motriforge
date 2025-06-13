import { describe, it, expect, beforeAll, beforeEach, afterEach, afterAll } from 'vitest';
import { db } from '../../backend/database/connection';
import { EventService } from '../../backend/services/observability/event-service';
import { TestDatabaseHelper, createTestId } from '../utils/test-database-helper';

describe('EventService', () => {
  let eventService: EventService;
  let testHelper: TestDatabaseHelper;
  let currentTestId: string;

  beforeAll(async () => {
    eventService = new EventService(db);
    testHelper = new TestDatabaseHelper(db);
    
    // Minimal cleanup before starting tests
    try {
      await testHelper.cleanTestData('test-event-service');
    } catch (error) {
      console.warn('Initial cleanup warning:', error);
    }
  });

  beforeEach(async () => {
    currentTestId = createTestId('event-service');
  });

  afterEach(async () => {
    // Clean up after each test with timeout protection
    if (currentTestId) {
      try {
        await testHelper.cleanTestData(`test-${currentTestId}`);
      } catch (error) {
        console.warn('Test cleanup warning:', error);
      }
    }
  }, 30000); // Increased timeout

  afterAll(async () => {
    // Final cleanup with timeout protection
    try {
      await testHelper.cleanTestData('test-event-service');
    } catch (error) {
      console.warn('Final cleanup warning:', error);
    }
  }, 30000); // Increased timeout

  it('should process valid event with Actor.Action.Scope.Target pattern', async () => {
    const testData = await testHelper.setupBasicTestData(currentTestId);

    const eventRequest = {
      actor: `${testData.testId}-user`,
      action: `${testData.testId}-create`,
      scope: `${testData.testId}-domain`,
      target: `${testData.testId}-resource`,
      severityType: 'info',
      severityLevel: 'medium',
      userId: 'user-123',
      eventData: { message: 'Test event processing' },
      contextData: { source: 'unit-test' },
      createdBy: testData.createdBy
    };

    const result = await eventService.processEvent(eventRequest);

    expect(result.status).toBe('success');
    expect(result.id).toBeDefined();
    expect(result.pattern).toBe(`${testData.testId}-user.${testData.testId}-create.${testData.testId}-domain.${testData.testId}-resource`);
    expect(result.eventData).toEqual({ message: 'Test event processing' });
  });

  it('should validate Actor.Action.Scope.Target pattern', async () => {
    const testData = await testHelper.setupBasicTestData(currentTestId);

    const validPattern = await eventService.validatePattern(
      `${testData.testId}-user`,
      `${testData.testId}-create`,
      `${testData.testId}-domain`,
      `${testData.testId}-resource`
    );
    expect(validPattern).toBe(true);

    const invalidPattern = await eventService.validatePattern(
      'invalid-actor',
      `${testData.testId}-create`,
      `${testData.testId}-domain`,
      `${testData.testId}-resource`
    );
    expect(invalidPattern).toBe(false);
  });

  it('should handle invalid pattern gracefully', async () => {
    const testData = await testHelper.setupBasicTestData(currentTestId);

    const eventRequest = {
      actor: 'invalid-actor',
      action: `${testData.testId}-create`,
      scope: `${testData.testId}-domain`,
      target: `${testData.testId}-resource`,
      severityType: 'info',
      eventData: { message: 'Test with invalid actor' },
      createdBy: testData.createdBy
    };

    const result = await eventService.processEvent(eventRequest);

    expect(result.status).toBe('failed');
    expect(result.errorDetails).toContain('Unknown actor');
  });

  it('should get events by pattern', async () => {
    const testData = await testHelper.setupBasicTestData(currentTestId);

    // First create an event
    const eventRequest = {
      actor: `${testData.testId}-user`,
      action: `${testData.testId}-create`,
      scope: `${testData.testId}-domain`,
      target: `${testData.testId}-resource`,
      severityType: 'info',
      eventData: { message: 'Pattern search test' },
      createdBy: testData.createdBy
    };

    await eventService.processEvent(eventRequest);

    // Then search for it
    const events = await eventService.getEventsByPattern(
      `${testData.testId}-user`,
      `${testData.testId}-create`,
      `${testData.testId}-domain`,
      `${testData.testId}-resource`
    );

    expect(events.length).toBeGreaterThan(0);
    expect(events[0].eventData).toEqual({ message: 'Pattern search test' });
  });

  it('should handle distributed tracing', async () => {
    const testData = await testHelper.setupBasicTestData(currentTestId);
    const traceId = `trace-${testData.testId}`;

    const parentEvent = {
      actor: `${testData.testId}-user`,
      action: `${testData.testId}-create`,
      scope: `${testData.testId}-domain`,
      target: `${testData.testId}-resource`,
      severityType: 'info',
      traceId,
      eventData: { message: 'Parent event' },
      createdBy: testData.createdBy
    };

    const parentResult = await eventService.processEvent(parentEvent);

    const childEvent = {
      actor: `${testData.testId}-user`,
      action: `${testData.testId}-create`,
      scope: `${testData.testId}-domain`,
      target: `${testData.testId}-resource`,
      severityType: 'info',
      traceId,
      parentEventId: parentResult.id,
      eventData: { message: 'Child event' },
      createdBy: testData.createdBy
    };

    await eventService.processEvent(childEvent);

    const traceEvents = await eventService.getEventsByTrace(traceId);
    expect(traceEvents.length).toBe(2);

    const childEvents = await eventService.getChildEvents(parentResult.id);
    expect(childEvents.length).toBe(1);
    expect(childEvents[0].eventData).toEqual({ message: 'Child event' });
  });

  it('should use seeded data for common patterns', async () => {
    // Test using the actual seeded data instead of creating test-specific data
    const eventRequest = {
      actor: 'user', // From seed data
      action: 'create', // From seed data
      scope: 'domain', // From seed data
      target: 'resource', // From seed data
      severityType: 'info',
      severityLevel: 'low', // Use available severity from seed data
      userId: 'user-456',
      eventData: { message: 'Test with seeded data' },
      contextData: { source: 'seed-test' },
      createdBy: `test-${currentTestId}`
    };

    const result = await eventService.processEvent(eventRequest);

    expect(result.status).toBe('success');
    expect(result.id).toBeDefined();
    expect(result.pattern).toBe('user.create.domain.resource');
    expect(result.eventData).toEqual({ message: 'Test with seeded data' });
  });
});
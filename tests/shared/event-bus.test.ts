import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { EventBus, ObservabilityEvent, EventHandler } from '../../backend/shared/event-bus/event-bus';

describe('EventBus', () => {
  let eventBus: EventBus;

  beforeEach(() => {
    eventBus = new EventBus({
      maxListeners: 10,
      batchSize: 5,
      flushIntervalMs: 100,
      retryAttempts: 2
    });
  });

  afterEach(async () => {
    await eventBus.shutdown();
  });

  it('should create EventBus with default config', () => {
    const defaultBus = new EventBus();
    expect(defaultBus).toBeDefined();
    defaultBus.shutdown();
  });

  it('should register and handle events', async () => {
    const mockHandler: EventHandler = {
      name: 'test-handler',
      handle: vi.fn().mockResolvedValue(undefined),
      canHandle: vi.fn().mockReturnValue(true)
    };

    eventBus.registerHandler('test.event', mockHandler);

    const testEvent: ObservabilityEvent = {
      id: 'test-1',
      type: 'test.event',
      pattern: 'user.create.domain.resource',
      payload: { test: 'data' },
      metadata: {
        timestamp: new Date(),
        correlationId: 'corr-1',
        source: 'test'
      }
    };

    await eventBus.publish(testEvent);

    // Wait for batch processing
    await new Promise(resolve => setTimeout(resolve, 150));

    expect(mockHandler.handle).toHaveBeenCalledWith(testEvent);
  });

  it('should handle pattern matching in subscriptions', async () => {
    let receivedEvent: ObservabilityEvent | undefined;

    eventBus.subscribe('observability.log', 'user.*.domain.*', async (event: ObservabilityEvent) => {
      receivedEvent = event;
    });

    const matchingEvent: ObservabilityEvent = {
      id: 'test-2',
      type: 'observability.log',
      pattern: 'user.create.domain.resource',
      payload: { message: 'test log' },
      metadata: {
        timestamp: new Date(),
        correlationId: 'corr-2',
        source: 'test'
      }
    };

    const nonMatchingEvent: ObservabilityEvent = {
      id: 'test-3',
      type: 'observability.log',
      pattern: 'system.create.api.endpoint',
      payload: { message: 'system log' },
      metadata: {
        timestamp: new Date(),
        correlationId: 'corr-3',
        source: 'test'
      }
    };

    await eventBus.publish(matchingEvent);
    await eventBus.publish(nonMatchingEvent);

    // Wait for processing
    await new Promise(resolve => setTimeout(resolve, 150));

    expect(receivedEvent).toBeDefined();
    expect(receivedEvent?.pattern).toBe('user.create.domain.resource');
  });

  it('should batch events efficiently', async () => {
    const handledEvents: ObservabilityEvent[] = [];

    const batchHandler: EventHandler = {
      name: 'batch-handler',
      handle: async (event) => {
        handledEvents.push(event);
      },
      canHandle: () => true
    };

    eventBus.registerHandler('batch.test', batchHandler);

    // Publish multiple events quickly
    const events: ObservabilityEvent[] = [];
    for (let i = 0; i < 7; i++) {
      const event: ObservabilityEvent = {
        id: `batch-${i}`,
        type: 'batch.test',
        pattern: 'system.batch.test.event',
        payload: { index: i },
        metadata: {
          timestamp: new Date(),
          correlationId: `batch-corr-${i}`,
          source: 'batch-test'
        }
      };
      events.push(event);
    }

    await eventBus.publishBatch(events);

    // Wait for batch processing
    await new Promise(resolve => setTimeout(resolve, 200));

    expect(handledEvents.length).toBe(7);
  });

  it('should retry failed handlers', async () => {
    let attempts = 0;

    const failingHandler: EventHandler = {
      name: 'failing-handler',
      handle: async () => {
        attempts++;
        if (attempts < 3) {
          throw new Error('Simulated failure');
        }
      },
      canHandle: () => true
    };

    eventBus.registerHandler('retry.test', failingHandler);

    const testEvent: ObservabilityEvent = {
      id: 'retry-1',
      type: 'retry.test',
      pattern: 'system.retry.test.handler',
      payload: { test: 'retry' },
      metadata: {
        timestamp: new Date(),
        correlationId: 'retry-corr-1',
        source: 'retry-test'
      }
    };

    await eventBus.publish(testEvent);

    // Wait for retries
    await new Promise(resolve => setTimeout(resolve, 500));

    expect(attempts).toBe(3); // Initial attempt + 2 retries
  });

  it('should emit handler failure events', async () => {
    let failureEvent: any = null;

    eventBus.on('handler_failure', (event) => {
      failureEvent = event;
    });

    const alwaysFailingHandler: EventHandler = {
      name: 'always-failing-handler',
      handle: async () => {
        throw new Error('Always fails');
      },
      canHandle: () => true
    };

    eventBus.registerHandler('fail.test', alwaysFailingHandler);

    const testEvent: ObservabilityEvent = {
      id: 'fail-1',
      type: 'fail.test',
      pattern: 'system.fail.test.handler',
      payload: { test: 'failure' },
      metadata: {
        timestamp: new Date(),
        correlationId: 'fail-corr-1',
        source: 'fail-test'
      }
    };

    await eventBus.publish(testEvent);

    // Wait for failure processing
    await new Promise(resolve => setTimeout(resolve, 500));

    expect(failureEvent).toBeDefined();
    expect(failureEvent.handlerName).toBe('always-failing-handler');
    expect(failureEvent.originalEvent.id).toBe('fail-1');
  });

  it('should provide accurate statistics', () => {
    const handler1: EventHandler = {
      name: 'handler-1',
      handle: vi.fn(),
      canHandle: () => true
    };

    const handler2: EventHandler = {
      name: 'handler-2',
      handle: vi.fn(),
      canHandle: () => true
    };

    eventBus.registerHandler('type1', handler1);
    eventBus.registerHandler('type1', handler2);
    eventBus.registerHandler('type2', handler1);

    const stats = eventBus.getStats();

    expect(stats.handlersCount).toBe(3);
    expect(stats.eventTypes).toContain('type1');
    expect(stats.eventTypes).toContain('type2');
    expect(stats.queuedEvents).toBe(0);
  });

  it('should handle wildcard patterns correctly', async () => {
    const receivedEvents: ObservabilityEvent[] = [];

    eventBus.subscribe('observability.audit', '**', async (event) => {
      receivedEvents.push(event);
    });

    eventBus.subscribe('observability.audit', 'user.*.**', async (event) => {
      receivedEvents.push(event);
    });

    const events: ObservabilityEvent[] = [
      {
        id: 'wild-1',
        type: 'observability.audit',
        pattern: 'user.login.security.session',
        payload: {},
        metadata: { timestamp: new Date(), correlationId: 'wild-1', source: 'test' }
      },
      {
        id: 'wild-2',
        type: 'observability.audit',
        pattern: 'system.error.api.endpoint',
        payload: {},
        metadata: { timestamp: new Date(), correlationId: 'wild-2', source: 'test' }
      }
    ];

    await eventBus.publishBatch(events);
    await new Promise(resolve => setTimeout(resolve, 150));

    // First subscription (**) should match both events
    // Second subscription (user.*.**) should match only the first event
    // So we should have 3 total handler invocations
    expect(receivedEvents.length).toBe(3);
  });

  it('should handle graceful shutdown', async () => {
    const handler: EventHandler = {
      name: 'shutdown-handler',
      handle: vi.fn().mockResolvedValue(undefined),
      canHandle: () => true
    };

    eventBus.registerHandler('shutdown.test', handler);

    // Add some events to the queue
    await eventBus.publish({
      id: 'shutdown-1',
      type: 'shutdown.test',
      pattern: 'system.shutdown.test.event',
      payload: {},
      metadata: { timestamp: new Date(), correlationId: 'shutdown-1', source: 'test' }
    });

    // Shutdown should process remaining events
    await eventBus.shutdown();

    expect(handler.handle).toHaveBeenCalled();
  });
});
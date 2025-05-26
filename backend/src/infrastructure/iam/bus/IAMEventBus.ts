import { Types } from 'mongoose';
import { DomainEvent, EventType } from '@/types/iam/interfaces';
import { LoggerFactory } from '@/shared-kernel/infrastructure/logging/factory/LoggerFactory';

export interface IEventHandler<TEvent extends DomainEvent> {
  handle(event: TEvent): Promise<void>;
}

export class IAMEventBus {
  private readonly logger = LoggerFactory.getContextualLogger('IAMEventBus');
  private readonly handlers = new Map<EventType, IEventHandler<any>[]>();
  private readonly eventStore: DomainEvent[] = []; // In production, use persistent storage

  registerHandler<TEvent extends DomainEvent>(
    eventType: EventType,
    handler: IEventHandler<TEvent>
  ): void {
    if (!this.handlers.has(eventType)) {
      this.handlers.set(eventType, []);
    }
    
    this.handlers.get(eventType)!.push(handler);
    this.logger.debug('Event handler registered', { eventType });
  }

  async publish(event: DomainEvent): Promise<void> {
    const contextLogger = this.logger.withData({ 
      eventType: event.type,
      aggregateId: event.aggregateId.toString()
    });

    try {
      contextLogger.debug('Publishing event');

      // Store event
      this.eventStore.push(event);

      // Get handlers for this event type
      const handlers = this.handlers.get(event.type) || [];

      if (handlers.length === 0) {
        contextLogger.debug('No handlers registered for event type');
        return;
      }

      // Publish to all handlers in parallel
      const handlePromises = handlers.map(handler => 
        this.handleEventSafely(handler, event, contextLogger)
      );

      await Promise.all(handlePromises);

      contextLogger.debug('Event published successfully', { 
        handlerCount: handlers.length 
      });

    } catch (error) {
      contextLogger.error('Failed to publish event', error as Error);
      throw error;
    }
  }

  async publishBatch(events: DomainEvent[]): Promise<void> {
    this.logger.info('Publishing event batch', { eventCount: events.length });

    const publishPromises = events.map(event => this.publish(event));
    await Promise.all(publishPromises);

    this.logger.info('Event batch published successfully');
  }

  private async handleEventSafely(
    handler: IEventHandler<any>,
    event: DomainEvent,
    contextLogger: any
  ): Promise<void> {
    try {
      await handler.handle(event);
      contextLogger.debug('Event handler completed successfully');
    } catch (error) {
      contextLogger.error('Event handler failed', error as Error, {
        handlerName: handler.constructor.name
      });
      // Don't rethrow - we want other handlers to continue processing
    }
  }

  // Event replay functionality
  async replayEvents(aggregateId: Types.ObjectId, fromVersion?: number): Promise<DomainEvent[]> {
    this.logger.info('Replaying events', { 
      aggregateId: aggregateId.toString(), 
      fromVersion 
    });

    const events = this.eventStore.filter(event => {
      const matches = event.aggregateId.equals(aggregateId);
      // In a real implementation, you would filter by version too
      return matches;
    });

    this.logger.info('Events replayed', { eventCount: events.length });
    return events;
  }

  // Get event history
  getEventHistory(aggregateId?: Types.ObjectId, eventType?: EventType): DomainEvent[] {
    let events = [...this.eventStore];

    if (aggregateId) {
      events = events.filter(event => event.aggregateId.equals(aggregateId));
    }

    if (eventType) {
      events = events.filter(event => event.type === eventType);
    }

    return events.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
  }
}


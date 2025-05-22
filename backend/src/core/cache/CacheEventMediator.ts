import { EventMediator } from '../events/EventMediator';
import { Event } from '../events/models/Event';
import { LoggerFacade } from '../logging/LoggerFacade';
import { EventSubscriber } from '../events/EventSubscriber';
import { Subscription } from '../events/models/Subscription';
import { EventType } from '../../types/events/enums/eventTypes';

/**
 * Mediator for cache-related events
 */
export class CacheEventMediator {
  private readonly eventMediator: EventMediator;
  private readonly logger: LoggerFacade;

  constructor(eventMediator: EventMediator, logger: LoggerFacade) {
    this.eventMediator = eventMediator;
    this.logger = logger.withComponent('CacheEventMediator');
  }

  /**
   * Subscribe to cache events
   */
  public subscribe(
    eventTypes: EventType[],
    subscriber: EventSubscriber
  ): Subscription {
    return this.eventMediator.subscribe(eventTypes, subscriber);
  }

  /**
   * Publish a cache event
   */
  public publish(event: Event): void {
    try {
      this.eventMediator.publish(event);
    } catch (error) {
      this.logger.error('Error publishing cache event', error as Error, {
        eventType: event.type
      });
    }
  }

  /**
   * Publish a cache event asynchronously
   */
  public async publishAsync(event: Event): Promise<void> {
    try {
      await this.eventMediator.publishAsync(event);
    } catch (error) {
      this.logger.error('Error publishing cache event asynchronously', error as Error, {
        eventType: event.type
      });
    }
  }

  /**
   * Unsubscribe from cache events
   */
  public unsubscribe(subscription: Subscription): void {
    this.eventMediator.unsubscribe(subscription);
  }
}
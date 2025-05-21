import { EventType } from './types/EventType';
import { Event } from './models/Event';
import { EventMediator } from './EventMediator';
import { EventRegistry } from './EventRegistry';
import { EventPublisher } from './publishers/EventPublisher';
import { EventContextProvider } from './EventContextProvider';
import { EventHandler } from './handlers/EventHandler';
import { Subscription } from './models/Subscription';
import { v4 as uuidv4 } from 'uuid';
import { LoggerFacade } from '../logging/LoggerFacade';
import { EventMetadata } from './models/EventMetadata';

/**
 * Configuration for the event facade
 */
export interface EventFacadeConfig {
  /** Whether to validate events against schemas */
  validateEvents: boolean;
  
  /** Whether to enrich events with context */
  enrichEvents: boolean;
}

/**
 * Main entry point for the event system
 * 
 * Provides a simplified interface for working with events
 */
export class EventFacade {
  /** Event mediator for distributing events */
  private readonly eventMediator: EventMediator;
  
  /** Event registry for event type definitions */
  private readonly eventRegistry: EventRegistry;
  
  /** Event publisher for creating and publishing events */
  private readonly eventPublisher: EventPublisher;
  
  /** Context provider for event context */
  private readonly contextProvider: EventContextProvider;
  
  /** Logger for the facade */
  private readonly logger: LoggerFacade;
  
  /** Configuration */
  private readonly config: EventFacadeConfig;

  constructor(
    eventMediator: EventMediator,
    eventRegistry: EventRegistry,
    eventPublisher: EventPublisher,
    contextProvider: EventContextProvider,
    logger: LoggerFacade,
    config: Partial<EventFacadeConfig> = {}
  ) {
    this.eventMediator = eventMediator;
    this.eventRegistry = eventRegistry;
    this.eventPublisher = eventPublisher;
    this.contextProvider = contextProvider;
    this.logger = logger.withComponent('EventFacade');
    
    this.config = {
      validateEvents: true,
      enrichEvents: true,
      ...config
    };
  }

  /**
   * Publish an event
   * 
   * @param eventType Type of event to publish
   * @param payload Data associated with the event
   */
  public publish(eventType: EventType, payload: any): void {
    try {
      // Create and publish the event
      const event = this.createEvent(eventType, payload);
      this.eventPublisher.publishEvent(event);
    } catch (error) {
      this.logger.error(`Failed to publish event: ${eventType}`, error as Error, {
        eventType,
        payload
      });
      
      throw error;
    }
  }

  /**
   * Publish an event asynchronously
   * 
   * @param eventType Type of event to publish
   * @param payload Data associated with the event
   * @returns Promise that resolves when the event is published
   */
  public async publishAsync(eventType: EventType, payload: any): Promise<void> {
    try {
      // Create and publish the event asynchronously
      const event = this.createEvent(eventType, payload);
      await this.eventPublisher.publishEventAsync(event);
    } catch (error) {
      this.logger.error(`Failed to publish event asynchronously: ${eventType}`, error as Error, {
        eventType,
        payload
      });
      
      throw error;
    }
  }

  /**
   * Create an event (without publishing it)
   * 
   * @param type Event type
   * @param payload Event payload
   * @returns The created event
   */
  public createEvent(type: EventType, payload: any): Event {
    return this.eventPublisher.createEvent(type, payload);
  }

  /**
   * Create a typed event
   * 
   * @param eventType The specific event type
   * @param payload Event payload
   * @param options Additional event creation options
   * @returns The created typed event
   */
  public createTypedEvent<T extends Event>(
    eventType: EventType,
    payload: any,
    options?: Partial<{
      source: string;
      correlationId: string;
      metadata: Partial<EventMetadata>;
    }>
  ): T {
    return this.eventPublisher.createTypedEvent<T>(eventType, payload, options);
  }

  /**
   * Subscribe to one or more event types
   * 
   * @param eventTypes Event types to subscribe to
   * @param handler Handler function for events
   * @returns Subscription that can be used to unsubscribe
   */
  public subscribe(eventTypes: EventType[], handler: EventHandler): Subscription {
    // Create a subscriber adapter for the handler
    const subscriber = this.createSubscriber(handler, eventTypes);
    
    // Subscribe with the mediator
    return this.eventMediator.subscribe(eventTypes, subscriber);
  }

  /**
   * Subscribe to a single event for one occurrence only
   * 
   * @param eventType Event type to subscribe to
   * @param handler Handler function for the event
   * @returns Subscription that can be used to unsubscribe
   */
  public subscribeOnce(eventType: EventType, handler: EventHandler): Subscription {
    const subscription = this.subscribe([eventType], {
      handleEvent: async (event: Event) => {
        // Call the original handler
        await handler.handleEvent(event);
        
        // Unsubscribe after handling
        subscription.cancel();
      }
    });
    
    return subscription;
  }

  /**
   * Subscribe to all events
   * 
   * @param handler Handler function for events
   * @returns Subscription that can be used to unsubscribe
   */
  public subscribeToAll(handler: EventHandler): Subscription {
    return this.subscribe(['*'], handler);
  }

  /**
   * Get all registered event types
   * 
   * @returns Array of event type names
   */
  public getEventTypes(): string[] {
    return this.eventRegistry.getAllEventTypes()
      .map(def => def.name);
  }

  /**
   * Create a subscriber adapter for a handler
   * 
   * @param handler The handler to adapt
   * @param eventTypes Event types the handler is interested in
   * @returns A subscriber that delegates to the handler
   */
  private createSubscriber(handler: EventHandler, eventTypes: EventType[]): any {
    const subscriberId = uuidv4();
    
    return {
      handleEvent: (event: Event) => handler.handleEvent(event),
      getSubscriptionTypes: () => eventTypes,
      getPriority: () => 0, // Default priority
      getId: () => subscriberId
    };
  }
}

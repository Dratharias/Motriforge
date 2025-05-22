import { EventFacadeConfig, EventHandler, EventType } from "@/types/events";
import { LoggerFacade } from "../logging";
import { EventContextProvider } from "./EventContextProvider";
import { EventMediator } from "./EventMediator";
import { EventRegistry } from "./EventRegistry";
import { EventMetadata } from "./models/EventMetadata";
import { Subscription } from "./models/Subscription";
import { EventPublisher } from "./EventPublisher";
import { Event as DomainEvent } from "./models/Event";

/**
 * Main entry point for the event system
 * 
 * Provides a simplified interface for working with events
 */
export class EventFacade {
  private readonly eventMediator: EventMediator;
  private readonly eventRegistry: EventRegistry;
  private readonly eventPublisher: EventPublisher;
  private readonly contextProvider: EventContextProvider;
  private readonly logger: LoggerFacade;
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
  public createEvent(type: EventType, payload: any): DomainEvent {
    const event = this.eventPublisher.createEvent(type, payload);
    
    // Enrich event with context if enabled
    if (this.config.enrichEvents) {
      return this.contextProvider.enrichEventWithContext(event);
    }
    
    return event;
  }

  /**
   * Create a typed event
   * 
   * @param eventType The specific event type
   * @param payload Event payload
   * @param options Additional event creation options
   * @returns The created typed event
   */
  public createTypedEvent<T extends DomainEvent>(
    eventType: EventType,
    payload: any,
    options?: Partial<{
      source: string;
      correlationId: string;
      metadata: Partial<EventMetadata>;
    }>
  ): T {
    const event = this.eventPublisher.createTypedEvent<T>(eventType, payload, options);
    
    // Enrich event with context if enabled
    if (this.config.enrichEvents) {
      return this.contextProvider.enrichEventWithContext(event) as T;
    }
    
    return event;
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
      handleEvent: async (event: DomainEvent) => {
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
   * Get the current event context
   * 
   * @returns The current event context
   */
  public getContext() {
    return this.contextProvider.getContext();
  }

  /**
   * Run a function with a specific event context
   * 
   * @param context The context to use
   * @param fn The function to run
   * @returns The result of the function
   */
  public withContext<T>(context: any, fn: () => T): T {
    return this.contextProvider.withContext(context, fn);
  }

  /**
   * Create a subscriber adapter for a handler
   * 
   * @param handler The handler to adapt
   * @param eventTypes Event types the handler is interested in
   * @returns A subscriber that delegates to the handler
   */
  private createSubscriber(handler: EventHandler, eventTypes: EventType[]): any {
    const subscriberId = crypto.randomUUID();
    
    return {
      handleEvent: (event: DomainEvent) => handler.handleEvent(event),
      getSubscriptionTypes: () => eventTypes,
      getPriority: () => 0, // Default priority
      getId: () => subscriberId
    };
  }
}
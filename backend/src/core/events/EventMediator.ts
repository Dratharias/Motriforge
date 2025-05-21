import { EventType } from './types/EventType';
import { Event } from './models/Event';
import { EventSubscriber } from './EventSubscriber';
import { EventQueue } from './EventQueue';
import { EventPublisher } from './publishers/EventPublisher';
import { LoggerFacade } from '../logging/LoggerFacade';
import { EventMetrics } from './EventMetrics';
import { Subscription } from './models/Subscription';
import { v4 as uuidv4 } from 'uuid';

/**
 * Configuration for the event mediator
 */
export interface EventMediatorConfig {
  /** Whether to use async processing */
  asyncProcessing: boolean;
  
  /** Number of worker threads for async processing */
  workerCount: number;
}

/**
 * Central mediator for the event system
 */
export class EventMediator {
  /** Map of event types to subscriber sets */
  private readonly subscribers: Map<EventType, Set<EventSubscriber>> = new Map();
  
  /** Queue for async event processing */
  private readonly eventQueue: EventQueue;
  
  /** Reference to the event publisher */
  private readonly eventPublisher: EventPublisher;
  
  /** Logger for mediator operations */
  private readonly logger: LoggerFacade;
  
  /** Metrics tracking */
  private readonly metrics: EventMetrics;
  
  /** Configuration */
  private readonly config: EventMediatorConfig;
  
  /** Map of subscription IDs to subscriber info */
  private readonly subscriptionInfo: Map<string, {
    subscriber: EventSubscriber,
    eventTypes: EventType[]
  }> = new Map();

  constructor(
    eventPublisher: EventPublisher,
    logger: LoggerFacade,
    metrics: EventMetrics,
    config: Partial<EventMediatorConfig> = {}
  ) {
    this.eventPublisher = eventPublisher;
    this.logger = logger.withComponent('EventMediator');
    this.metrics = metrics;
    
    this.config = {
      asyncProcessing: true,
      workerCount: 2,
      ...config
    };
    
    // Initialize event queue for async processing
    this.eventQueue = new EventQueue(
      this.processEvent.bind(this),
      logger,
      metrics,
      this.config.workerCount
    );
    
    // Set mediator in publisher (to avoid circular dependency)
    this.eventPublisher.setMediator(this);
  }

  /**
   * Initialize the mediator
   */
  public async initialize(): Promise<void> {
    if (this.config.asyncProcessing) {
      this.eventQueue.start();
    }
    
    this.logger.info('Event mediator initialized', {
      asyncProcessing: this.config.asyncProcessing,
      workerCount: this.config.workerCount
    });
  }

  /**
   * Subscribe to one or more event types
   * 
   * @param eventTypes Array of event types to subscribe to
   * @param subscriber The subscriber to notify
   * @returns A subscription that can be used to unsubscribe
   */
  public subscribe(eventTypes: EventType[], subscriber: EventSubscriber): Subscription {
    const subscriptionId = uuidv4();
    
    // Store subscription info for lookup
    this.subscriptionInfo.set(subscriptionId, {
      subscriber,
      eventTypes: [...eventTypes]
    });
    
    // Register subscriber for each event type
    for (const eventType of eventTypes) {
      if (!this.subscribers.has(eventType)) {
        this.subscribers.set(eventType, new Set<EventSubscriber>());
      }
      
      this.subscribers.get(eventType)!.add(subscriber);
    }
    
    this.logger.debug(`Subscriber ${subscriber.getId()} subscribed to ${eventTypes.join(', ')}`);
    
    // Create subscription with cancel callback
    const subscription = new Subscription({
      id: subscriptionId,
      subscriberId: subscriber.getId(),
      eventTypes,
      onCancel: () => this.unsubscribe(subscription)
    });
    
    return subscription;
  }

  /**
   * Publish an event to all interested subscribers
   * 
   * @param event The event to publish
   */
  public publish(event: Event): void {
    if (this.config.asyncProcessing) {
      // Add to queue for async processing
      this.eventQueue.enqueue(event);
    } else {
      // Process synchronously
      this.processEvent(event).catch(error => {
        this.logger.error('Error processing event synchronously', error as Error, {
          eventId: event.id,
          eventType: event.type
        });
      });
    }
  }

  /**
   * Publish an event asynchronously
   * 
   * @param event The event to publish
   * @returns Promise that resolves when the event is published
   */
  public async publishAsync(event: Event): Promise<void> {
    try {
      // Simply delegate to the synchronous version
      // The actual asynchronous behavior is handled by the queue
      this.publish(event);
    } catch (error) {
      this.logger.error('Error publishing event asynchronously', error as Error, {
        eventId: event.id,
        eventType: event.type
      });
      throw error;
    }
  }

  /**
   * Cancel a subscription
   * 
   * @param subscription The subscription to cancel
   */
  public unsubscribe(subscription: Subscription): void {
    const info = this.subscriptionInfo.get(subscription.id);
    
    if (!info) {
      this.logger.warn(`Attempted to unsubscribe unknown subscription: ${subscription.id}`);
      return;
    }
    
    const { subscriber, eventTypes } = info;
    
    // Remove subscriber from each event type
    for (const eventType of eventTypes) {
      const subscribers = this.subscribers.get(eventType);
      
      if (subscribers) {
        subscribers.delete(subscriber);
        
        // Clean up empty sets
        if (subscribers.size === 0) {
          this.subscribers.delete(eventType);
        }
      }
    }
    
    // Remove subscription info
    this.subscriptionInfo.delete(subscription.id);
    
    this.logger.debug(`Subscriber ${subscriber.getId()} unsubscribed from ${eventTypes.join(', ')}`);
  }

  /**
   * Get all subscribers for a specific event type
   * 
   * @param eventType The event type to get subscribers for
   * @returns Array of subscribers
   */
  public getSubscribers(eventType: EventType): EventSubscriber[] {
    const directSubscribers = this.subscribers.get(eventType) || new Set<EventSubscriber>();
    
    // Also include wildcard subscribers
    const wildcardSubscribers = this.subscribers.get('*') || new Set<EventSubscriber>();
    
    // Include namespace wildcard subscribers (e.g., "user.*" for "user.created")
    const namespace = eventType.split('.')[0];
    const namespaceWildcard = `${namespace}.*` as EventType;
    const namespaceSubscribers = this.subscribers.get(namespaceWildcard) || new Set<EventSubscriber>();
    
    // Combine all subscribers
    const allSubscribers = new Set<EventSubscriber>([
      ...directSubscribers,
      ...wildcardSubscribers,
      ...namespaceSubscribers
    ]);
    
    return Array.from(allSubscribers);
  }

  /**
   * Process a single event
   * 
   * @param event The event to process
   */
  private async processEvent(event: Event): Promise<void> {
    const startTime = Date.now();
    
    try {
      // Get all interested subscribers
      const subscribers = this.getSubscribers(event.type);
      
      if (subscribers.length === 0) {
        this.logger.debug(`No subscribers for event type: ${event.type}`, {
          eventId: event.id
        });
        return;
      }
      
      // Sort subscribers by priority
      const prioritizedSubscribers = this.prioritizeHandlers(subscribers);
      
      // Notify each subscriber
      for (const subscriber of prioritizedSubscribers) {
        const subscriberStartTime = Date.now();
        
        try {
          await this.notifySubscriber(subscriber, event);
          
          const subscriberDuration = Date.now() - subscriberStartTime;
          
          this.metrics.recordHandlerExecution(
            subscriber.getId(),
            event.type,
            subscriberDuration
          );
        } catch (error) {
          this.logger.error(`Error in subscriber ${subscriber.getId()} handling event ${event.type}`, error as Error, {
            eventId: event.id,
            eventType: event.type,
            subscriberId: subscriber.getId()
          });
          
          // Continue with other subscribers
        }
      }
      
      const duration = Date.now() - startTime;
      
      this.metrics.recordEventProcessed(event.type, duration);
      
      this.logger.debug(`Processed event ${event.type} in ${duration}ms`, {
        eventId: event.id,
        eventType: event.type,
        subscriberCount: subscribers.length,
        duration
      });
    } catch (error) {
      this.metrics.recordEventError(event.type, error as Error);
      
      this.logger.error(`Error processing event: ${event.type}`, error as Error, {
        eventId: event.id,
        eventType: event.type
      });
      
      throw error;
    }
  }

  /**
   * Notify a single subscriber about an event
   * 
   * @param subscriber The subscriber to notify
   * @param event The event to notify about
   */
  private async notifySubscriber(subscriber: EventSubscriber, event: Event): Promise<void> {
    try {
      // Call subscriber's handleEvent method
      const result = subscriber.handleEvent(event);
      
      // Handle async subscribers
      if (result instanceof Promise) {
        await result;
      }
    } catch (error) {
      this.logger.error(`Error in subscriber ${subscriber.getId()}`, error as Error, {
        eventId: event.id,
        eventType: event.type,
        subscriberId: subscriber.getId()
      });
      
      // Rethrow to allow mediator to handle
      throw error;
    }
  }

  /**
   * Sort handlers by priority (highest first)
   * 
   * @param handlers Array of subscribers to sort
   * @returns Sorted array of subscribers
   */
  private prioritizeHandlers(handlers: EventSubscriber[]): EventSubscriber[] {
    return [...handlers].sort((a, b) => b.getPriority() - a.getPriority());
  }
}

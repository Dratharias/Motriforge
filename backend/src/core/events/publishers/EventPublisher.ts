import { Event } from '../models/Event';
import { EventType } from '../types/EventType';
import { EventMetrics } from '../EventMetrics';
import { EventContextProvider } from '../EventContextProvider';
import { LoggerFacade } from '../../logging/LoggerFacade';
import { EventMetadata } from '../models/EventMetadata';
import { EventRegistry } from '../EventRegistry';
import { EventEnricher } from '../EventEnricher';
import { DistributedEventPublisher } from './DistributedEventPublisher';
import { EventMediator } from '../EventMediator';

/**
 * Configuration for the event publisher
 */
export interface EventPublisherConfig {
  /** Whether to enable distributed publishing */
  enableDistributedPublishing: boolean;
  
  /** Event types to always publish to distributed publisher */
  alwaysDistributeEventTypes: string[];
  
  /** Whether to log events when published */
  logEvents: boolean;
  
  /** Log level to use for event logging */
  logLevel: string;
  
  /** Whether to validate events against schemas */
  validateEvents: boolean;
  
  /** Whether to enrich events with context */
  enrichEvents: boolean;
}

/**
 * Responsible for creating and publishing events
 */
export class EventPublisher {
  /** Event mediator instance */
  private mediator: EventMediator | undefined;
  
  /** Configuration */
  private readonly config: EventPublisherConfig;
  
  /** Event registry for validation */
  private readonly registry: EventRegistry;
  
  /** Metrics tracking */
  private readonly metrics: EventMetrics;
  
  /** Context provider */
  private readonly contextProvider: EventContextProvider;
  
  /** Event enricher for adding extra data */
  private readonly eventEnricher: EventEnricher;
  
  /** Logger */
  private readonly logger: LoggerFacade;
  
  /** Optional distributed publisher for cross-service events */
  private readonly distributedPublisher?: DistributedEventPublisher;

  constructor(
    registry: EventRegistry,
    metrics: EventMetrics,
    contextProvider: EventContextProvider,
    eventEnricher: EventEnricher,
    logger: LoggerFacade,
    config: Partial<EventPublisherConfig> = {},
    distributedPublisher?: DistributedEventPublisher
  ) {
    this.registry = registry;
    this.metrics = metrics;
    this.contextProvider = contextProvider;
    this.eventEnricher = eventEnricher;
    this.logger = logger.withComponent('EventPublisher');
    this.distributedPublisher = distributedPublisher;
    
    this.config = {
      enableDistributedPublishing: false,
      alwaysDistributeEventTypes: [],
      logEvents: true,
      logLevel: 'debug',
      validateEvents: true,
      enrichEvents: true,
      ...config
    };
  }

  /**
   * Set the mediator (called after construction to avoid circular dependency)
   * 
   * @param mediator The event mediator
   */
  public setMediator(mediator: any): void {
    this.mediator = mediator;
  }

  /**
   * Publish an event to the event system
   * 
   * @param event The event to publish
   */
  public publishEvent(event: Event): void {
    try {
      let processedEvent = event;
      
      // Validate event if enabled
      if (this.config.validateEvents && this.registry.hasEventType(event.type)) {
        const validation = this.registry.validateEvent(event);
        
        if (!validation.valid) {
          this.logger.warn(`Invalid event payload for type ${event.type}`, {
            eventId: event.id,
            eventType: event.type,
            errors: validation.errors
          });
          
          // We could choose to throw here, but we'll continue processing
        }
      }
      
      // Enrich event if enabled
      if (this.config.enrichEvents) {
        processedEvent = this.enrichEvent(event);
      }
      
      // Log event if enabled
      if (this.config.logEvents) {
        this.logEvent(processedEvent);
      }
      
      // Track metrics
      this.recordMetrics(processedEvent);
      
      // Publish to distributed system if applicable
      if (this.shouldPublishToDistributed(processedEvent)) {
        this.publishToDistributed(processedEvent).catch(err => {
          this.logger.error('Failed to publish to distributed system', err as Error, {
            eventId: processedEvent.id,
            eventType: processedEvent.type
          });
        });
      }
      
      // Publish to local mediator
      if (this.mediator) {
        this.mediator.publish(processedEvent);
      } else {
        this.logger.error('Cannot publish event: mediator is not set', undefined, {
          eventId: processedEvent.id,
          eventType: processedEvent.type
        });
      }
    } catch (error) {
      this.logger.error('Error publishing event', error as Error, {
        eventId: event.id,
        eventType: event.type
      });
      
      // Rethrow to allow caller to handle
      throw error;
    }
  }

  /**
   * Publish an event asynchronously
   * 
   * @param event The event to publish
   * @returns Promise that resolves when the event is published
   */
  public async publishEventAsync(event: Event): Promise<void> {
    // For now, we just call the sync version
    // In a real system, this might use a different path
    this.publishEvent(event);
  }

  /**
   * Create a new event
   * 
   * @param type Event type
   * @param payload Event payload
   * @returns The created event
   */
  public createEvent(type: EventType, payload: any): Event {
    const metadata = new EventMetadata({
      origin: 'event-publisher'
    });
    
    const context = this.contextProvider.getContext();
    
    return new Event({
      type,
      payload,
      metadata,
      context,
      source: 'event-publisher'
    });
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
    options: Partial<{
      source: string;
      correlationId: string;
      metadata: Partial<EventMetadata>;
    }> = {}
  ): T {
    const { source, correlationId, metadata } = options;
    
    // Create event with the specific type and options
    const event = new Event({
      type: eventType,
      payload,
      source: source ?? 'event-publisher',
      correlationId,
      metadata,
      context: this.contextProvider.getContext()
    });
    
    return event as T;
  }

  /**
   * Enrich an event with additional data
   * 
   * @param event The event to enrich
   * @returns The enriched event
   */
  private enrichEvent(event: Event): Event {
    // First apply general context enrichment
    let enrichedEvent = this.contextProvider.enrichEventWithContext(event);
    
    // Then apply specific enrichers
    enrichedEvent = this.eventEnricher.enrichEvent(enrichedEvent);
    
    return enrichedEvent;
  }

  /**
   * Log an event for debugging
   * 
   * @param event The event to log
   */
  private logEvent(event: Event): void {
    // Log at the configured level
    if (this.config.logLevel === 'debug') {
      this.logger.debug(`Event published: ${event.type}`, {
        eventId: event.id,
        eventType: event.type,
        payload: event.payload
      });
    } else if (this.config.logLevel === 'info') {
      this.logger.info(`Event published: ${event.type}`, {
        eventId: event.id,
        eventType: event.type
      });
    }
  }

  /**
   * Record metrics for an event
   * 
   * @param event The event to record metrics for
   */
  private recordMetrics(event: Event): void {
    this.metrics.recordEventPublished(event.type);
  }

  /**
   * Check if an event should be published to distributed system
   * 
   * @param event The event to check
   * @returns True if the event should be distributed
   */
  private shouldPublishToDistributed(event: Event): boolean {
    if (!this.config.enableDistributedPublishing || !this.distributedPublisher) {
      return false;
    }
    
    // Always distribute specific event types
    if (this.config.alwaysDistributeEventTypes.includes(event.type)) {
      return true;
    }
    
    // Check for explicit routing key
    if (event.metadata.routingKey) {
      return true;
    }
    
    // Check if event type definition has distributedPublish flag
    const eventType = this.registry.getEventType(event.type);
    if (eventType?.metadata?.distributed) {
      return true;
    }
    
    return false;
  }

  /**
   * Publish an event to the distributed system
   * 
   * @param event The event to publish
   */
  private async publishToDistributed(event: Event): Promise<void> {
    if (!this.distributedPublisher) {
      throw new Error('Distributed publisher is not configured');
    }
    
    // Determine channel from routing key or event type
    const channel = event.metadata.routingKey ?? event.type.split('.')[0];
    
    await this.distributedPublisher.publishToChannel(channel, event);
    
    this.logger.debug(`Published to distributed channel: ${channel}`, {
      eventId: event.id,
      eventType: event.type,
      channel
    });
  }
}

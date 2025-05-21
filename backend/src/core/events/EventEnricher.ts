import { Event } from './models/Event';
import { LoggerFacade } from '../logging/LoggerFacade';

/**
 * Type for an event enricher function
 */
export type EventEnricherFn = (event: Event) => Event;

/**
 * Service that enriches events with additional data before publishing
 */
export class EventEnricher {
  /** Map of event type to enricher functions */
  private readonly enrichers: Map<string, EventEnricherFn[]> = new Map();
  
  /** Global enrichers that apply to all events */
  private readonly globalEnrichers: EventEnricherFn[] = [];
  
  /** Logger instance */
  private readonly logger: LoggerFacade;

  constructor(logger: LoggerFacade) {
    this.logger = logger.withComponent('EventEnricher');
  }

  /**
   * Add an enricher for a specific event type
   * 
   * @param eventType The event type to enrich
   * @param enricher Function that enriches the event
   */
  public addEnricher(eventType: string, enricher: EventEnricherFn): void {
    if (!this.enrichers.has(eventType)) {
      this.enrichers.set(eventType, []);
    }
    
    this.enrichers.get(eventType)!.push(enricher);
    
    this.logger.debug(`Added enricher for event type: ${eventType}`);
  }

  /**
   * Add a global enricher that applies to all events
   * 
   * @param enricher Function that enriches all events
   */
  public addGlobalEnricher(enricher: EventEnricherFn): void {
    this.globalEnrichers.push(enricher);
    this.logger.debug('Added global event enricher');
  }

  /**
   * Apply all relevant enrichers to an event
   * 
   * @param event The event to enrich
   * @returns The enriched event
   */
  public enrichEvent(event: Event): Event {
    try {
      let enrichedEvent = event;
      
      // Apply global enrichers first
      for (const enricher of this.globalEnrichers) {
        enrichedEvent = this.safelyEnrich(enrichedEvent, enricher);
      }
      
      // Apply type-specific enrichers
      const typeEnrichers = this.enrichers.get(event.type);
      if (typeEnrichers) {
        for (const enricher of typeEnrichers) {
          enrichedEvent = this.safelyEnrich(enrichedEvent, enricher);
        }
      }
      
      // Apply namespace enrichers (e.g., for 'user.created', apply 'user.*' enrichers)
      const namespace = event.type.split('.')[0];
      const namespaceKey = `${namespace}.*`;
      
      const namespaceEnrichers = this.enrichers.get(namespaceKey);
      if (namespaceEnrichers) {
        for (const enricher of namespaceEnrichers) {
          enrichedEvent = this.safelyEnrich(enrichedEvent, enricher);
        }
      }
      
      return enrichedEvent;
    } catch (error) {
      this.logger.error('Error enriching event', error as Error, {
        eventId: event.id,
        eventType: event.type
      });
      
      // Return the original event if enrichment fails
      return event;
    }
  }

  /**
   * Remove all enrichers for a specific event type
   * 
   * @param eventType The event type to remove enrichers for
   * @returns True if enrichers were removed, false if none existed
   */
  public removeEnricher(eventType: string): boolean {
    const hadEnrichers = this.enrichers.has(eventType);
    this.enrichers.delete(eventType);
    
    if (hadEnrichers) {
      this.logger.debug(`Removed enrichers for event type: ${eventType}`);
    }
    
    return hadEnrichers;
  }

  /**
   * Clear all enrichers (both global and type-specific)
   */
  public clearAllEnrichers(): void {
    this.enrichers.clear();
    this.globalEnrichers.length = 0;
    this.logger.debug('Cleared all event enrichers');
  }

  /**
   * Safely apply an enricher to an event, catching any errors
   * 
   * @param event The event to enrich
   * @param enricher The enricher function to apply
   * @returns The enriched event or the original if enrichment fails
   */
  private safelyEnrich(event: Event, enricher: EventEnricherFn): Event {
    try {
      return enricher(event);
    } catch (error) {
      this.logger.error('Error in event enricher', error as Error, {
        eventId: event.id,
        eventType: event.type
      });
      
      // Return the original event if enricher fails
      return event;
    }
  }
}

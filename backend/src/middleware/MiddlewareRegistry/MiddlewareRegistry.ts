import { ContextualLogger } from '@/shared-kernel/infrastructure/logging/ContextualLogger';
import { 
  RegistryEvent, 
  IRegistryEventListener 
} from '@/types/middleware/registry/registry-types';
import { RegistryEventType } from '@/types/middleware/registry/enums';

/**
 * Manages event emission and listener management for the middleware registry
 */
export class RegistryEventManager {
  private readonly listeners: IRegistryEventListener[];
  private readonly logger: ContextualLogger;
  private readonly eventHistory: RegistryEvent[];
  private readonly maxHistorySize: number;

  constructor(logger: ContextualLogger, maxHistorySize: number = 1000) {
    this.listeners = [];
    this.logger = logger;
    this.eventHistory = [];
    this.maxHistorySize = maxHistorySize;
  }

  /**
   * Adds a registry event listener
   */
  addEventListener(listener: IRegistryEventListener): void {
    this.listeners.push(listener);
    
    this.logger.debug('Registry event listener added', {
      listenerCount: this.listeners.length
    });
  }

  /**
   * Removes a registry event listener
   */
  removeEventListener(listener: IRegistryEventListener): void {
    const index = this.listeners.indexOf(listener);
    if (index > -1) {
      this.listeners.splice(index, 1);
      
      this.logger.debug('Registry event listener removed', {
        listenerCount: this.listeners.length
      });
    }
  }

  /**
   * Emits a registry event to all listeners
   */
  emit(type: RegistryEventType, middlewareName: string, metadata?: Record<string, any>): void {
    const event: RegistryEvent = {
      type,
      middlewareName,
      timestamp: new Date(),
      metadata
    };

    // Add to history
    this.addToHistory(event);

    // Emit to all listeners
    this.listeners.forEach(listener => {
      try {
        listener.onRegistryEvent(event);
      } catch (error) {
        this.logger.error('Error in registry event listener', error as Error, {
          eventType: type,
          middlewareName,
          listenerError: true
        });
      }
    });

    this.logger.debug('Registry event emitted', {
      eventType: type,
      middlewareName,
      listenerCount: this.listeners.length,
      metadata
    });
  }

  /**
   * Gets the event history
   */
  getEventHistory(limit?: number): readonly RegistryEvent[] {
    const events = [...this.eventHistory].reverse(); // Most recent first
    return limit ? events.slice(0, limit) : events;
  }

  /**
   * Gets events by type
   */
  getEventsByType(type: RegistryEventType, limit?: number): readonly RegistryEvent[] {
    const filteredEvents = this.eventHistory
      .filter(event => event.type === type)
      .reverse(); // Most recent first
    
    return limit ? filteredEvents.slice(0, limit) : filteredEvents;
  }

  /**
   * Gets events for a specific middleware
   */
  getEventsForMiddleware(middlewareName: string, limit?: number): readonly RegistryEvent[] {
    const filteredEvents = this.eventHistory
      .filter(event => event.middlewareName === middlewareName)
      .reverse(); // Most recent first
    
    return limit ? filteredEvents.slice(0, limit) : filteredEvents;
  }

  /**
   * Clears event history
   */
  clearHistory(): void {
    const previousSize = this.eventHistory.length;
    this.eventHistory.length = 0;
    
    this.logger.info('Registry event history cleared', {
      previousEventCount: previousSize
    });
  }

  /**
   * Gets listener count
   */
  getListenerCount(): number {
    return this.listeners.length;
  }

  /**
   * Removes all listeners
   */
  clearListeners(): void {
    const previousCount = this.listeners.length;
    this.listeners.length = 0;
    
    this.logger.info('All registry event listeners cleared', {
      previousListenerCount: previousCount
    });
  }

  /**
   * Gets event statistics
   */
  getEventStats(): EventStats {
    const totalEvents = this.eventHistory.length;
    const eventsByType: Record<string, number> = {};

    // Count events by type
    for (const event of this.eventHistory) {
      eventsByType[event.type] = (eventsByType[event.type] || 0) + 1;
    }

    // Calculate events per hour for recent activity
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const recentEventCount = this.eventHistory.filter(
      event => event.timestamp > oneHourAgo
    ).length;

    return {
      totalEvents,
      eventsByType,
      recentEventCount,
      eventsPerHour: recentEventCount,
      oldestEvent: this.eventHistory[0]?.timestamp,
      newestEvent: this.eventHistory[this.eventHistory.length - 1]?.timestamp
    };
  }

  /**
   * Adds event to history with size management
   */
  private addToHistory(event: RegistryEvent): void {
    this.eventHistory.push(event);

    // Maintain maximum history size
    if (this.eventHistory.length > this.maxHistorySize) {
      this.eventHistory.shift(); // Remove oldest event
    }
  }
}

/**
 * Event statistics interface
 */
export interface EventStats {
  readonly totalEvents: number;
  readonly eventsByType: Record<string, number>;
  readonly recentEventCount: number;
  readonly eventsPerHour: number;
  readonly oldestEvent?: Date;
  readonly newestEvent?: Date;
}
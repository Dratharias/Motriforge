import { EventEmitter } from 'events';
import { createId } from '@paralleldrive/cuid2';

export interface ObservabilityEvent {
  id: string;
  type: string;
  pattern: string; // actor.action.scope.target
  payload: Record<string, any>;
  metadata: {
    timestamp: Date;
    correlationId: string;
    source: string;
    severity?: {
      type: string;
      level: string;
    };
  };
}

export interface EventHandler {
  name: string;
  handle(event: ObservabilityEvent): Promise<void>;
  canHandle(eventType: string, pattern: string): boolean;
}

export interface EventBusConfig {
  maxListeners: number;
  batchSize: number;
  flushIntervalMs: number;
  retryAttempts: number;
}

export class EventBus extends EventEmitter {
  private readonly handlers: Map<string, EventHandler[]> = new Map();
  private batchedEvents: ObservabilityEvent[] = [];
  private flushTimer: NodeJS.Timeout | null = null;
  private readonly config: EventBusConfig;

  constructor(config: Partial<EventBusConfig> = {}) {
    super();
    this.config = {
      maxListeners: 50,
      batchSize: 100,
      flushIntervalMs: 5000,
      retryAttempts: 3,
      ...config
    };
    
    this.setMaxListeners(this.config.maxListeners);
    this.setupBatchProcessor();
  }

  /**
   * Register an event handler
   */
  registerHandler(eventType: string, handler: EventHandler): void {
    if (!this.handlers.has(eventType)) {
      this.handlers.set(eventType, []);
    }
    
    this.handlers.get(eventType)!.push(handler);
    console.log(`Registered handler ${handler.name} for event type ${eventType}`);
  }

  /**
   * Publish an event to the bus
   */
  async publish(event: ObservabilityEvent): Promise<void> {
    // Add to batch for processing
    this.batchedEvents.push(event);
    
    // Emit immediately for real-time handlers
    this.emit(event.type, event);
    
    // Process batch if it reaches size limit
    if (this.batchedEvents.length >= this.config.batchSize) {
      await this.processBatch();
    }
  }

  /**
   * Publish multiple events efficiently
   */
  async publishBatch(events: ObservabilityEvent[]): Promise<void> {
    this.batchedEvents.push(...events);
    
    // Emit all events
    events.forEach(event => this.emit(event.type, event));
    
    // Process if batch is large enough
    if (this.batchedEvents.length >= this.config.batchSize) {
      await this.processBatch();
    }
  }

  /**
   * Subscribe to events with pattern matching
   */
  subscribe(eventType: string, pattern: string, callback: (event: ObservabilityEvent) => Promise<void>): void {
    const handler: EventHandler = {
      name: `callback-${createId()}`,
      handle: callback,
      canHandle: (type: string, eventPattern: string) => {
        return type === eventType && this.matchesPattern(eventPattern, pattern);
      }
    };
    
    this.registerHandler(eventType, handler);
  }

  /**
   * Process batched events
   */
  private async processBatch(): Promise<void> {
    if (this.batchedEvents.length === 0) return;
    
    const batch = [...this.batchedEvents];
    this.batchedEvents = [];
    
    console.log(`Processing batch of ${batch.length} events`);
    
    // Group events by type for efficient processing
    const eventsByType = new Map<string, ObservabilityEvent[]>();
    
    batch.forEach(event => {
      if (!eventsByType.has(event.type)) {
        eventsByType.set(event.type, []);
      }
      eventsByType.get(event.type)!.push(event);
    });
    
    // Process each event type
    for (const [eventType, events] of eventsByType) {
      await this.processEventType(eventType, events);
    }
  }

  /**
   * Process events of a specific type
   */
  private async processEventType(eventType: string, events: ObservabilityEvent[]): Promise<void> {
    const handlers = this.handlers.get(eventType) || [];
    
    for (const handler of handlers) {
      const applicableEvents = events.filter(event => 
        handler.canHandle(eventType, event.pattern)
      );
      
      if (applicableEvents.length > 0) {
        try {
          // Process events concurrently for this handler
          await Promise.all(
            applicableEvents.map(event => 
              this.executeWithRetry(handler, event)
            )
          );
        } catch (error) {
          console.error(`Handler ${handler.name} failed:`, error);
        }
      }
    }
  }

  /**
   * Execute handler with retry logic
   */
  private async executeWithRetry(handler: EventHandler, event: ObservabilityEvent): Promise<void> {
    let lastError: Error | null = null;
    
    for (let attempt = 1; attempt <= this.config.retryAttempts; attempt++) {
      try {
        await handler.handle(event);
        return; // Success
      } catch (error) {
        lastError = error as Error;
        console.warn(`Handler ${handler.name} attempt ${attempt} failed:`, error);
        
        if (attempt < this.config.retryAttempts) {
          // Exponential backoff
          await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 100));
        }
      }
    }
    
    // All retries failed
    console.error(`Handler ${handler.name} failed after ${this.config.retryAttempts} attempts:`, lastError);
    
    // Emit failure event for error tracking
    this.emit('handler_failure', {
      handlerName: handler.name,
      originalEvent: event,
      error: lastError
    });
  }

  /**
   * Pattern matching for event filtering
   */
  private matchesPattern(eventPattern: string, subscriptionPattern: string): boolean {
    // Support wildcards: * = any component, ** = any remaining components
    const eventParts = eventPattern.split('.');
    const patternParts = subscriptionPattern.split('.');
    
    return this.matchPatternParts(eventParts, patternParts);
  }

  private matchPatternParts(eventParts: string[], patternParts: string[]): boolean {
    let eventIndex = 0;
    let patternIndex = 0;
    
    while (eventIndex < eventParts.length && patternIndex < patternParts.length) {
      const patternPart = patternParts[patternIndex];
      
      if (patternPart === '**') {
        // Match remaining components
        return true;
      } else if (patternPart === '*' || patternPart === eventParts[eventIndex]) {
        // Match single component or exact match
        eventIndex++;
        patternIndex++;
      } else {
        // No match
        return false;
      }
    }
    
    // Both should be fully consumed, unless pattern ends with **
    return eventIndex === eventParts.length && 
           (patternIndex === patternParts.length || 
            (patternIndex === patternParts.length - 1 && patternParts[patternIndex] === '**'));
  }

  /**
   * Setup batch processing timer
   */
  private setupBatchProcessor(): void {
    this.flushTimer = setInterval(async () => {
      if (this.batchedEvents.length > 0) {
        await this.processBatch();
      }
    }, this.config.flushIntervalMs);
  }

  /**
   * Graceful shutdown
   */
  async shutdown(): Promise<void> {
    console.log('Shutting down EventBus...');
    
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
    }
    
    // Process remaining events
    await this.processBatch();
    
    this.removeAllListeners();
    console.log('EventBus shutdown complete');
  }

  /**
   * Get statistics
   */
  getStats(): {
    handlersCount: number;
    queuedEvents: number;
    eventTypes: string[];
  } {
    return {
      handlersCount: Array.from(this.handlers.values()).reduce((sum, handlers) => sum + handlers.length, 0),
      queuedEvents: this.batchedEvents.length,
      eventTypes: Array.from(this.handlers.keys())
    };
  }
}

// Singleton instance
export const eventBus = new EventBus();
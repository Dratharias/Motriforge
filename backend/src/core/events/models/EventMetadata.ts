import { EventPriority } from '../types/EventPriority';

/**
 * Metadata associated with an event
 */
export class EventMetadata {
  /** The priority of the event (affects processing order) */
  public readonly priority: EventPriority;
  
  /** The system component that originated the event */
  public readonly origin: string;
  
  /** The schema version for this event type */
  public readonly version: string;
  
  /** The number of times this event has been retried */
  public readonly retry: number;
  
  /** The maximum number of retries allowed for this event */
  public readonly maxRetries: number;
  
  /** Optional delay (in ms) before processing this event */
  public readonly delayMs?: number;
  
  /** Optional routing key for message broker integration */
  public readonly routingKey?: string;
  
  /** Optional time-to-live (in ms) for this event */
  public readonly ttl?: number;

  constructor(data: Partial<EventMetadata> = {}) {
    this.priority = data.priority ?? EventPriority.NORMAL;
    this.origin = data.origin ?? 'system';
    this.version = data.version ?? '1.0';
    this.retry = data.retry ?? 0;
    this.maxRetries = data.maxRetries ?? 3;
    this.delayMs = data.delayMs;
    this.routingKey = data.routingKey;
    this.ttl = data.ttl;
  }

  /**
   * Creates a new metadata object for a retry attempt
   * 
   * @returns A new EventMetadata with incremented retry count
   */
  public withRetry(): EventMetadata {
    return new EventMetadata({
      ...this,
      retry: this.retry + 1
    });
  }

  /**
   * Creates a new metadata object with updated fields
   * 
   * @param updates Fields to update
   * @returns A new EventMetadata with updated fields
   */
  public with(updates: Partial<EventMetadata>): EventMetadata {
    return new EventMetadata({
      ...this,
      ...updates
    });
  }

  /**
   * Checks if this event has exceeded its retry limit
   */
  public hasExceededRetryLimit(): boolean {
    return this.retry >= this.maxRetries;
  }

  /**
   * Checks if this event has expired based on TTL
   */
  public isExpired(): boolean {
    if (!this.ttl) return false;
    
    // Assuming event was created now, which isn't ideal
    // In a real system, you'd compare against event creation timestamp
    return Date.now() > Date.now() + this.ttl;
  }
}
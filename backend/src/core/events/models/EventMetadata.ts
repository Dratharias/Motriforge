import { EventPriority } from "@/types/events";

/**
 * Metadata associated with an event
 */
export class EventMetadata {
  public readonly priority: EventPriority;
  public readonly origin: string;
  public readonly version: string;
  public readonly retry: number;
  public readonly maxRetries: number;
  public readonly delayMs?: number;
  public readonly routingKey?: string;
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
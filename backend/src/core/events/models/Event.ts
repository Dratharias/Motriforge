import { EventType } from '../types/EventType';
import { EventMetadata } from './EventMetadata';
import { EventContext } from './EventContext';
import { v4 as uuidv4 } from 'uuid';

/**
 * Represents an event in the system
 */
export class Event {
  /** Unique identifier for the event */
  public readonly id: string;
  
  /** Type of the event */
  public readonly type: EventType;
  
  /** Timestamp when the event was created */
  public readonly timestamp: Date;
  
  /** Event payload/data */
  public readonly payload: any;
  
  /** Event metadata */
  public readonly metadata: EventMetadata;
  
  /** Source component that created the event */
  public readonly source: string;
  
  /** Correlation ID for distributed tracing */
  public readonly correlationId?: string;
  
  /** Context information about the event */
  public readonly context?: EventContext;
  
  /** Schema version of the event */
  public readonly version: string;
  
  /** Whether the event has been acknowledged by handlers */
  private _isAcknowledged: boolean = false;

  constructor(data: {
    id?: string;
    type: EventType;
    payload: any;
    metadata?: Partial<EventMetadata>;
    source?: string;
    correlationId?: string;
    context?: EventContext;
    version?: string;
    timestamp?: Date;
  }) {
    this.id = data.id ?? uuidv4();
    this.type = data.type;
    this.timestamp = data.timestamp ?? new Date();
    this.payload = data.payload;
    this.metadata = new EventMetadata(data.metadata ?? {});
    this.source = data.source ?? 'system';
    this.correlationId = data.correlationId;
    this.context = data.context ? new EventContext(data.context) : undefined;
    this.version = data.version ?? '1.0';
  }

  /**
   * Mark the event as acknowledged
   */
  public acknowledge(): void {
    this._isAcknowledged = true;
  }

  /**
   * Check if the event has been acknowledged
   */
  public get isAcknowledged(): boolean {
    return this._isAcknowledged;
  }

  /**
   * Get the payload with type safety
   * 
   * @returns The payload cast to the specified type
   */
  public getTypedPayload<T>(): T {
    return this.payload as T;
  }

  /**
   * Check if the payload has a specific property
   * 
   * @param key The property key to check
   * @returns True if the property exists in the payload
   */
  public hasPayloadProperty(key: string): boolean {
    return this.payload && typeof this.payload === 'object' && key in this.payload;
  }

  /**
   * Create a new event with updated content
   * 
   * @param updates Updates to apply to the event
   * @returns A new Event instance with the updates applied
   */
  public with(updates: Partial<Omit<Event, 'id' | 'timestamp' | 'metadata'> & { metadata?: Partial<EventMetadata> }>): Event {
    return new Event({
      id: this.id,
      type: updates.type ?? this.type,
      payload: updates.payload ?? this.payload,
      metadata: updates.metadata ?? this.metadata,
      source: updates.source ?? this.source,
      correlationId: updates.correlationId ?? this.correlationId,
      context: updates.context ?? this.context,
      version: updates.version ?? this.version,
      timestamp: this.timestamp
    });
  }

  /**
   * Create a new event for a retry attempt
   * 
   * @returns A new Event with incremented retry count
   */
  public forRetry(): Event {
    return this.with({
      metadata: this.metadata.withRetry()
    });
  }

  /**
   * Converts the event to a plain object for serialization
   */
  public toJSON(): Record<string, any> {
    return {
      id: this.id,
      type: this.type,
      timestamp: this.timestamp.toISOString(),
      payload: this.payload,
      metadata: this.metadata,
      source: this.source,
      correlationId: this.correlationId,
      context: this.context?.toObject(),
      version: this.version,
      isAcknowledged: this._isAcknowledged
    };
  }

  /**
   * Creates an Event instance from a serialized object
   * 
   * @param data Serialized event data
   * @returns A new Event instance
   */
  public static fromJSON(data: Record<string, any>): Event {
    const event = new Event({
      id: data.id,
      type: data.type,
      payload: data.payload,
      metadata: data.metadata,
      source: data.source,
      correlationId: data.correlationId,
      context: data.context ? new EventContext(data.context) : undefined,
      version: data.version,
      timestamp: new Date(data.timestamp)
    });
    
    if (data.isAcknowledged) {
      event.acknowledge();
    }
    
    return event;
  }
}

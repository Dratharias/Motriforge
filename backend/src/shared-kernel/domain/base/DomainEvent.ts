import { ObjectId } from 'mongodb';

/**
 * Base class for all domain events.
 * Implements the Domain Event pattern from DDD.
 */
export abstract class DomainEvent {
  public readonly eventId: ObjectId;
  public readonly occurredOn: Date;
  public readonly eventVersion: number;
  public readonly aggregateId: ObjectId;
  public readonly aggregateType: string;
  public readonly contextName: string;

  constructor(
    aggregateId: ObjectId,
    aggregateType: string,
    contextName: string,
    eventVersion: number = 1
  ) {
    this.eventId = new ObjectId();
    this.occurredOn = new Date();
    this.aggregateId = aggregateId;
    this.aggregateType = aggregateType;
    this.contextName = contextName;
    this.eventVersion = eventVersion;
  }

  /**
   * Gets the name of the event type
   */
  public abstract get eventType(): string;

  /**
   * Gets the event payload/data
   */
  public abstract get eventData(): Record<string, any>;

  /**
   * Gets metadata associated with the event
   */
  public get metadata(): Record<string, any> {
    return {
      eventId: this.eventId.toHexString(),
      occurredOn: this.occurredOn.toISOString(),
      eventVersion: this.eventVersion,
      aggregateId: this.aggregateId.toHexString(),
      aggregateType: this.aggregateType,
      contextName: this.contextName,
      eventType: this.eventType
    };
  }

  /**
   * Serializes the event to a plain object
   */
  public toJSON(): Record<string, any> {
    return {
      ...this.metadata,
      data: this.eventData
    };
  }

  /**
   * Gets a string representation of the event
   */
  public toString(): string {
    return `${this.eventType}@${this.contextName}(${this.aggregateId.toHexString()})`;
  }

  /**
   * Checks if this event is of a specific type
   */
  public isOfType(eventType: string): boolean {
    return this.eventType === eventType;
  }

  /**
   * Checks if this event belongs to a specific context
   */
  public isFromContext(contextName: string): boolean {
    return this.contextName === contextName;
  }

  /**
   * Checks if this event belongs to a specific aggregate
   */
  public isFromAggregate(aggregateId: ObjectId): boolean {
    return this.aggregateId.equals(aggregateId);
  }

  /**
   * Checks if this event is newer than another event
   */
  public isNewerThan(other: DomainEvent): boolean {
    return this.occurredOn > other.occurredOn;
  }

  /**
   * Gets the age of the event in milliseconds
   */
  public getAge(): number {
    return Date.now() - this.occurredOn.getTime();
  }

  /**
   * Checks if the event occurred within a specified time window
   */
  public occurredWithin(milliseconds: number): boolean {
    return this.getAge() <= milliseconds;
  }

  /**
   * Creates a correlation ID for event tracking
   */
  public getCorrelationId(): string {
    return `${this.contextName}.${this.aggregateType}.${this.aggregateId.toHexString()}`;
  }

  /**
   * Validates the event structure
   */
  public validate(): void {
    if (!this.eventId) {
      throw new Error('Event ID is required');
    }
    if (!this.aggregateId) {
      throw new Error('Aggregate ID is required');
    }
    if (!this.aggregateType) {
      throw new Error('Aggregate type is required');
    }
    if (!this.contextName) {
      throw new Error('Context name is required');
    }
    if (!this.eventType) {
      throw new Error('Event type is required');
    }
    if (this.eventVersion < 1) {
      throw new Error('Event version must be greater than 0');
    }
  }
}
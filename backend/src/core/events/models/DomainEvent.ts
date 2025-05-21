import { Event } from './Event';
import { EventType } from '../types/EventType';
import { EventMetadata } from './EventMetadata';
import { EventContext } from './EventContext';

/**
 * Interface representing a reference to an entity
 */
export interface EntityReference {
  /** The type of entity (e.g., 'user', 'exercise', 'workout') */
  entityType: string;
  
  /** The unique identifier of the entity */
  entityId: string;
}

/**
 * Base class for domain events that are related to specific entities
 * 
 * @template T The type of the event payload data
 */
export class DomainEvent<T> extends Event {
  /**
   * Type of entity this event relates to (e.g., 'user', 'exercise', 'workout')
   */
  public readonly entityType: string;
  
  /**
   * ID of the entity this event relates to
   */
  public readonly entityId: string;
  
  /**
   * Action that was performed (e.g., 'created', 'updated', 'deleted')
   */
  public readonly action: string;
  
  /**
   * The ID of the user who initiated the action
   */
  public readonly userId?: string;
  
  /**
   * The data payload for this event
   */
  public readonly data: T;

  constructor(data: {
    entityType: string;
    entityId: string;
    action: string;
    data: T;
    userId?: string;
    metadata?: Partial<EventMetadata>;
    context?: EventContext;
    correlationId?: string;
    source?: string;
    type?: EventType;
  }) {
    // Construct the event type if not provided
    // Format: entityType.action (e.g., 'user.created')
    const type = data.type ?? `${data.entityType}.${data.action}` as EventType;
    
    // Call the parent Event constructor
    super({
      type,
      payload: data.data,
      metadata: data.metadata,
      context: data.context,
      correlationId: data.correlationId,
      source: data.source ?? 'domain'
    });
    
    this.entityType = data.entityType;
    this.entityId = data.entityId;
    this.action = data.action;
    this.userId = data.userId;
    this.data = data.data;
  }

  /**
   * Get a reference to the entity this event relates to
   * 
   * @returns An EntityReference containing the entity type and ID
   */
  public getEntityReference(): EntityReference {
    return {
      entityType: this.entityType,
      entityId: this.entityId
    };
  }

  /**
   * Create a new DomainEvent with updated content
   * 
   * @param updates Updates to apply to the event
   * @returns A new DomainEvent instance with the updates applied
   */
  public with(updates: Partial<Omit<DomainEvent<T>, 'id' | 'timestamp' | 'metadata'> & { metadata?: Partial<EventMetadata>, data?: T }>): DomainEvent<T> {
    return new DomainEvent<T>({
      entityType: updates.entityType ?? this.entityType,
      entityId: updates.entityId ?? this.entityId,
      action: updates.action ?? this.action,
      data: updates.data ?? this.data,
      userId: updates.userId ?? this.userId,
      metadata: updates.metadata ?? this.metadata,
      context: updates.context ?? this.context,
      correlationId: updates.correlationId ?? this.correlationId,
      source: updates.source ?? this.source,
      type: updates.type ?? this.type
    });
  }

  /**
   * Converts the domain event to a plain object for serialization
   */
  public toJSON(): Record<string, any> {
    return {
      ...super.toJSON(),
      entityType: this.entityType,
      entityId: this.entityId,
      action: this.action,
      userId: this.userId,
      data: this.data
    };
  }

  /**
   * Creates a DomainEvent instance from a serialized object
   * 
   * @param data Serialized domain event data
   * @returns A new DomainEvent instance
   */
  public static fromJSON<T>(data: Record<string, any>): DomainEvent<T> {
    return new DomainEvent<T>({
      entityType: data.entityType,
      entityId: data.entityId,
      action: data.action,
      data: data.data,
      userId: data.userId,
      metadata: data.metadata,
      context: data.context ? new EventContext(data.context) : undefined,
      correlationId: data.correlationId,
      source: data.source,
      type: data.type
    });
  }
}
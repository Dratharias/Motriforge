import { DomainEvent } from './DomainEvent';
import { EventType } from '../types/EventType';
import { EventMetadata } from './EventMetadata';
import { EventContext } from './EventContext';

/**
 * Represents user-related events in the system
 */
export class UserEvent<T = any> extends DomainEvent<T> {
  /**
   * Create a new UserEvent instance
   * 
   * @param data Configuration for the user event
   */
  constructor(data: {
    userId: string;
    action: string;
    data: T;
    metadata?: Partial<EventMetadata>;
    context?: EventContext;
    correlationId?: string;
    source?: string;
    type?: EventType;
  }) {
    // Call parent constructor with entity type set to 'user'
    super({
      entityType: 'user',
      entityId: data.userId,
      action: data.action,
      data: data.data,
      userId: data.userId, // User events always have the subject user as the actor
      metadata: data.metadata,
      context: data.context,
      correlationId: data.correlationId,
      source: data.source,
      type: data.type
    });
  }

  /**
   * Access the user ID through the entityId
   * 
   * Note: We don't override the userId property inherited from DomainEvent
   * but the entityId will always contain the userId value
   */
  public getUserId(): string {
    return this.entityId;
  }

  /**
   * Create a new UserEvent with updated content
   * 
   * @param updates Updates to apply to the event
   * @returns A new UserEvent instance with the updates applied
   */
  public with(updates: Partial<Omit<UserEvent<T>, 'id' | 'timestamp' | 'metadata' | 'entityType' | 'entityId'> & { 
    metadata?: Partial<EventMetadata>; 
    data?: T;
    userId?: string; // Allow updating userId which will update entityId
  }>): UserEvent<T> {
    // UserEvent maintains the entityType as 'user'
    return new UserEvent<T>({
      userId: updates.userId ?? this.entityId, // Use entityId as the source of userId
      action: updates.action ?? this.action,
      data: updates.data ?? this.data,
      metadata: updates.metadata ?? this.metadata,
      context: updates.context ?? this.context,
      correlationId: updates.correlationId ?? this.correlationId,
      source: updates.source ?? this.source,
      type: updates.type ?? this.type
    });
  }

  /**
   * Create a user created event
   * 
   * @param userId ID of the created user
   * @param userData User data
   * @param actorId ID of the user who performed the action (if different)
   * @returns A new UserEvent for the created user
   */
  public static created<TData>(userId: string, userData: TData, actorId?: string): UserEvent<TData> {
    return new UserEvent<TData>({
      userId,
      action: 'created',
      data: userData,
      context: actorId ? new EventContext({ userId: actorId }) : undefined
    });
  }

  /**
   * Create a user updated event
   * 
   * @param userId ID of the updated user
   * @param userData Updated user data
   * @param actorId ID of the user who performed the action (if different)
   * @returns A new UserEvent for the updated user
   */
  public static updated<TData>(userId: string, userData: TData, actorId?: string): UserEvent<TData> {
    return new UserEvent<TData>({
      userId,
      action: 'updated',
      data: userData,
      context: actorId ? new EventContext({ userId: actorId }) : undefined
    });
  }

  /**
   * Create a user deleted event
   * 
   * @param userId ID of the deleted user
   * @param userData Optional deletion metadata
   * @param actorId ID of the user who performed the action (if different)
   * @returns A new UserEvent for the deleted user
   */
  public static deleted<TData = Record<string, any>>(userId: string, userData?: TData, actorId?: string): UserEvent<TData> {
    return new UserEvent<TData>({
      userId,
      action: 'deleted',
      data: userData ?? ({} as TData),
      context: actorId ? new EventContext({ userId: actorId }) : undefined
    });
  }
}
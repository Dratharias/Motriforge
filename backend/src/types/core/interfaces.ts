import { Types } from 'mongoose';
import { Role, Action, ResourceType, Severity, EventType, ErrorType } from './enums.js';

/**
 * Core user interface representing essential user information
 */
export interface IUser {
  readonly id: Types.ObjectId;
  readonly email: string;
  readonly role: Role;
  readonly status: string;
  readonly organization: Types.ObjectId;
  readonly createdAt: Date;
  readonly lastActiveAt?: Date;
}

/**
 * Base entity interface that all domain entities implement
 */
export interface IEntity {
  readonly id: Types.ObjectId;
  readonly createdAt: Date;
  readonly updatedAt: Date;
  readonly createdBy: Types.ObjectId;
  readonly isActive: boolean;
  readonly isDraft: boolean;
}

/**
 * Core error information structure
 */
export interface IError {
  readonly code: string;
  readonly message: string;
  readonly severity: Severity;
  readonly timestamp: Date;
  readonly context?: string;
  readonly origin?: string;
  readonly stack?: string;
  readonly traceId?: string;
  readonly userId?: string;
}

/**
 * Wrapper for categorized errors with metadata
 */
export interface IErrorWrapper {
  readonly type: ErrorType;
  readonly error: IError;
  readonly metadata?: Record<string, unknown>;
}

/**
 * Core event structure for system-wide event handling
 */
export interface IEvent {
  readonly id: string;
  readonly type: EventType;
  readonly timestamp: Date;
  readonly source: string;
  readonly payload: unknown;
  readonly originUserId?: string;
  readonly sessionId?: string;
  readonly traceId?: string;
  readonly context?: string;
  readonly handledBy?: readonly string[];
  readonly metadata?: Record<string, unknown>;
}

/**
 * Interface for handling events in the system
 */
export interface IEventHandler {
  /**
   * Check if this handler supports the given event type
   */
  supports(eventType: EventType): boolean;
  
  /**
   * Handle the event
   */
  handle(event: IEvent): Promise<void>;
  
  /**
   * Optional priority for handler ordering (higher = first)
   */
  readonly priority?: number;
}

/**
 * Resource permission definition for IAM system
 */
export interface IResourcePermission {
  readonly resource: ResourceType;
  readonly actions: readonly Action[];
  readonly conditions?: Record<string, unknown>;
}
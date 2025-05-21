import { Event } from './Event';
import { EventType } from '../types/EventType';
import { EventMetadata } from './EventMetadata';
import { EventContext } from './EventContext';
import { EventPriority } from '../types/EventPriority';

/**
 * Severity levels for system events
 */
export enum SeverityLevel {
  DEBUG = 'debug',
  INFO = 'info',
  NOTICE = 'notice',
  WARNING = 'warning',
  ERROR = 'error',
  CRITICAL = 'critical',
  ALERT = 'alert',
  EMERGENCY = 'emergency'
}

/**
 * System component types
 */
export enum SystemComponent {
  API = 'api',
  DATABASE = 'database',
  CACHE = 'cache',
  AUTH = 'auth',
  QUEUE = 'queue',
  SCHEDULER = 'scheduler',
  FILE_STORAGE = 'file-storage',
  SEARCH = 'search',
  NOTIFICATION = 'notification',
  WORKER = 'worker',
  MONITORING = 'monitoring',
  CONFIG = 'config'
}

/**
 * Represents system-level events that are not tied to specific domain entities
 */
export class SystemEvent<T = any> extends Event {
  /**
   * The system component that generated the event
   */
  public readonly component: string;
  
  /**
   * The action that occurred
   */
  public readonly action: string;
  
  /**
   * The severity level of the event
   */
  public readonly severity: SeverityLevel;
  
  /**
   * Event details
   */
  public readonly details: T;

  /**
   * Create a new SystemEvent instance
   * 
   * @param data Configuration for the system event
   */
  constructor(data: {
    component: string | SystemComponent;
    action: string;
    severity: SeverityLevel;
    details: T;
    metadata?: Partial<EventMetadata>;
    context?: EventContext;
    correlationId?: string;
    source?: string;
    type?: EventType;
  }) {
    // Construct the event type if not provided
    // Format: system.{component}.{action} (e.g., 'system.database.connection.lost')
    const type = data.type ?? `system.${data.component}.${data.action}` as EventType;
    
    // Call the parent Event constructor
    super({
      type,
      payload: data.details,
      metadata: {
        priority: data.severity >= SeverityLevel.ERROR ? EventPriority.HIGH : EventPriority.NORMAL,
        ...data.metadata
      },
      context: data.context,
      correlationId: data.correlationId,
      source: data.source ?? 'system'
    });
    
    this.component = data.component;
    this.action = data.action;
    this.severity = data.severity;
    this.details = data.details;
  }

  /**
   * Create a new SystemEvent with updated content
   * 
   * @param updates Updates to apply to the event
   * @returns A new SystemEvent instance with the updates applied
   */
  public with(updates: Partial<Omit<SystemEvent<T>, 'id' | 'timestamp' | 'metadata'> & { metadata?: Partial<EventMetadata>, details?: T }>): SystemEvent<T> {
    return new SystemEvent<T>({
      component: updates.component ?? this.component,
      action: updates.action ?? this.action,
      severity: updates.severity ?? this.severity,
      details: updates.details ?? this.details,
      metadata: updates.metadata ?? this.metadata,
      context: updates.context ?? this.context,
      correlationId: updates.correlationId ?? this.correlationId,
      source: updates.source ?? this.source,
      type: updates.type ?? this.type
    });
  }

  /**
   * Converts the system event to a plain object for serialization
   */
  public toJSON(): Record<string, any> {
    return {
      ...super.toJSON(),
      component: this.component,
      action: this.action,
      severity: this.severity,
      details: this.details
    };
  }

  /**
   * Creates a SystemEvent instance from a serialized object
   * 
   * @param data Serialized system event data
   * @returns A new SystemEvent instance
   */
  public static fromJSON<T>(data: Record<string, any>): SystemEvent<T> {
    return new SystemEvent<T>({
      component: data.component,
      action: data.action,
      severity: data.severity,
      details: data.details,
      metadata: data.metadata,
      context: data.context ? new EventContext(data.context) : undefined,
      correlationId: data.correlationId,
      source: data.source,
      type: data.type
    });
  }

  /**
   * Create a system error event
   * 
   * @param component The system component where the error occurred
   * @param action The action during which the error occurred
   * @param error The error details
   * @returns A new SystemEvent for the error
   */
  public static error<TDetails = { message: string, error?: Error }>(
    component: string | SystemComponent,
    action: string,
    error: Error | string,
    additionalDetails?: Record<string, any>
  ): SystemEvent<TDetails> {
    const errorMessage = typeof error === 'string' ? error : error.message;
    const errorObj = typeof error === 'string' ? undefined : error;
    
    const details = {
      message: errorMessage,
      error: errorObj,
      ...additionalDetails
    } as unknown as TDetails;
    
    return new SystemEvent<TDetails>({
      component,
      action,
      severity: SeverityLevel.ERROR,
      details
    });
  }

  /**
   * Create a system startup event
   * 
   * @param component The system component that started
   * @param details Additional startup details
   * @returns A new SystemEvent for the startup
   */
  public static started<TDetails = { version: string, environment: string }>(
    component: string | SystemComponent,
    details: Partial<TDetails>
  ): SystemEvent<TDetails> {
    return new SystemEvent<TDetails>({
      component,
      action: 'started',
      severity: SeverityLevel.INFO,
      details: details as TDetails
    });
  }

  /**
   * Create a system shutdown event
   * 
   * @param component The system component that is shutting down
   * @param details Additional shutdown details
   * @returns A new SystemEvent for the shutdown
   */
  public static stopping<TDetails = { reason: string }>(
    component: string | SystemComponent,
    details: Partial<TDetails>
  ): SystemEvent<TDetails> {
    return new SystemEvent<TDetails>({
      component,
      action: 'stopping',
      severity: SeverityLevel.INFO,
      details: details as TDetails
    });
  }

  /**
   * Create a configuration change event
   * 
   * @param component The system component whose configuration changed
   * @param settings The changed settings
   * @returns A new SystemEvent for the configuration change
   */
  public static configChanged<TDetails = { settings: Record<string, any>, changedBy?: string }>(
    component: string | SystemComponent,
    settings: Record<string, any>,
    changedBy?: string
  ): SystemEvent<TDetails> {
    return new SystemEvent<TDetails>({
      component,
      action: 'config.changed',
      severity: SeverityLevel.NOTICE,
      details: {
        settings,
        changedBy
      } as unknown as TDetails
    });
  }
}
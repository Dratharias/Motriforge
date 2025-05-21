import { EventType } from '../types/EventType';
import { v4 as uuidv4 } from 'uuid';

/**
 * Options for event subscriptions
 */
export interface SubscriptionOptions {
  /** Whether this is a one-time subscription */
  once?: boolean;
  
  /** Whether to receive events that occurred before subscription */
  includePast?: boolean;
  
  /** Timestamp to receive events from (only applicable if includePast is true) */
  fromTimestamp?: Date;
  
  /** Custom filter function for additional filtering beyond event type */
  filter?: (event: any) => boolean;
}

/**
 * Represents a subscription to one or more event types
 */
export class Subscription {
  /** Unique identifier for this subscription */
  public readonly id: string;
  
  /** ID of the subscriber */
  public readonly subscriberId: string;
  
  /** Event types the subscriber is interested in */
  public readonly eventTypes: EventType[];
  
  /** When the subscription was created */
  public readonly createdAt: Date;
  
  /** Additional subscription options */
  public readonly options?: SubscriptionOptions;
  
  /** Whether the subscription is active */
  private _active: boolean = true;
  
  /** Callback to be invoked when cancelling (for cleanup) */
  private _onCancel?: () => void;

  constructor(data: {
    id?: string;
    subscriberId: string;
    eventTypes: EventType[];
    options?: SubscriptionOptions;
    onCancel?: () => void;
  }) {
    this.id = data.id ?? uuidv4();
    this.subscriberId = data.subscriberId;
    this.eventTypes = [...data.eventTypes];
    this.createdAt = new Date();
    this.options = data.options;
    this._onCancel = data.onCancel;
  }

  /**
   * Cancels this subscription
   */
  public cancel(): void {
    if (!this._active) return;
    
    this._active = false;
    
    if (this._onCancel) {
      this._onCancel();
    }
  }

  /**
   * Checks if this subscription is active
   */
  public isActive(): boolean {
    return this._active;
  }

  /**
   * Checks if this subscription is interested in a specific event type
   * 
   * @param eventType The event type to check
   * @returns True if this subscription matches the event type
   */
  public matches(eventType: EventType): boolean {
    // Check if this subscription is interested in all events
    if (this.eventTypes.includes('*')) {
      return true;
    }
    
    // Check if this subscription is interested in a namespace of events
    for (const type of this.eventTypes) {
      // Handle wildcard at the end, e.g., 'user.*'
      if (type.endsWith('.*')) {
        const namespace = type.slice(0, -2);
        if (eventType.startsWith(namespace + '.')) {
          return true;
        }
      }
      // Regular exact match
      else if (type === eventType) {
        return true;
      }
    }
    
    return false;
  }

  /**
   * Sets the cancellation callback
   * 
   * @param callback Function to call when subscription is cancelled
   */
  public setOnCancel(callback: () => void): void {
    this._onCancel = callback;
  }
}

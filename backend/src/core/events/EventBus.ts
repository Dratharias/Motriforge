import { Event as DomainEvent } from './models/Event';
import { EventMediator } from './EventMediator';
import { v4 as uuidv4 } from 'uuid';
import { EventType, SubscriptionOptions } from '@/types/events';
import { Subscription } from './models/Subscription';

/**
 * EventBus provides a pub/sub interface for the event system
 * 
 * This is a simplified facade over the EventMediator that uses
 * callbacks instead of requiring the implementation of interfaces.
 */
export class EventBus {
  private readonly mediator: EventMediator;
  private readonly eventTypes: EventType[] = [];
  private readonly subscribers: Map<string, Set<(event: DomainEvent) => void>> = new Map();
  private readonly subscriptionIds: Map<string, string> = new Map();

  constructor(mediator: EventMediator) {
    this.mediator = mediator;
  }

  /**
   * Register a callback for an event type
   * 
   * @param eventType The event type to listen for
   * @param callback The function to call when the event occurs
   */
  public on(eventType: EventType, callback: (event: DomainEvent) => void): void {
    // Ensure we have a set for this event type
    if (!this.subscribers.has(eventType)) {
      this.subscribers.set(eventType, new Set());
      
      // Subscribe to this event type if it's our first subscriber
      this.subscribeToEventType(eventType);
    }
    
    // Add the callback to the set
    this.subscribers.get(eventType)!.add(callback);
  }

  /**
   * Unregister a callback for an event type
   * 
   * @param eventType The event type to unregister from
   * @param callback The callback function to remove
   */
  public off(eventType: EventType, callback: (event: DomainEvent) => void): void {
    const callbacks = this.subscribers.get(eventType);
    
    if (callbacks) {
      // Remove the callback
      callbacks.delete(callback);
      
      // Clean up if this was the last subscriber
      if (callbacks.size === 0) {
        this.subscribers.delete(eventType);
        this.unsubscribeFromEventType(eventType);
      }
    }
  }

  /**
   * Register a one-time callback for an event type
   * 
   * @param eventType The event type to listen for
   * @param callback The function to call when the event occurs
   */
  public once(eventType: EventType, callback: (event: DomainEvent) => void): void {
    // Create a wrapper that will remove itself after execution
    const wrapper = (event: DomainEvent) => {
      // First remove this wrapper to prevent re-execution
      this.off(eventType, wrapper);
      
      // Then call the original callback
      callback(event);
    };
    
    // Register the wrapper
    this.on(eventType, wrapper);
  }

  /**
   * Emit an event to all subscribers
   * 
   * @param eventType The type of event to emit
   * @param data The event data
   */
  public emit(eventType: EventType, data: any): void {
    // Create a simple event
    const event = new DomainEvent({
      type: eventType,
      payload: data,
      source: 'event-bus'
    });
    
    // Publish through the mediator
    this.mediator.publish(event);
  }

  /**
   * Emit an event asynchronously
   * 
   * @param eventType The type of event to emit
   * @param data The event data
   * @returns Promise that resolves when the event is published
   */
  public async emitAsync(eventType: EventType, data: any): Promise<void> {
    // Create a simple event
    const event = new DomainEvent({
      type: eventType,
      payload: data,
      source: 'event-bus'
    });
    
    // Publish through the mediator asynchronously
    await this.mediator.publishAsync(event);
  }

  /**
   * Advanced subscription with options
   * 
   * @param options Subscription options with required callback and event types
   * @returns A subscription that can be used to unsubscribe
   */
  public subscribe(options: {
    eventTypes: EventType[];
    callback: (event: DomainEvent) => void;
  } & Omit<SubscriptionOptions, 'filter'> & {
    filter?: (event: DomainEvent) => boolean; // Override filter with more specific Event type
  }): Subscription {
    const { eventTypes, callback, once, filter } = options;
    
    // Create a subscriber adapter
    const subscriberId = uuidv4();
    
    const subscriber = {
      handleEvent: (event: DomainEvent) => {
        // Apply filter if provided
        if (filter && !filter(event)) {
          return;
        }
        
        // Call the callback
        callback(event);
        
        // If once, unsubscribe after handling
        if (once) {
          this.mediator.unsubscribe(subscription);
        }
      },
      getSubscriptionTypes: () => eventTypes,
      getPriority: () => 0,
      getId: () => subscriberId
    };
    
    // Subscribe with the mediator
    const subscription = this.mediator.subscribe(eventTypes, subscriber);
    
    return subscription;
  }

  /**
   * Subscribe to a specific event type with the mediator
   * 
   * @param eventType The event type to subscribe to
   */
  private subscribeToEventType(eventType: EventType): void {
    if (this.subscriptionIds.has(eventType)) {
      return; // Already subscribed
    }
    
    // Create a subscriber that will forward to all callbacks
    const subscriberId = uuidv4();
    
    const subscriber = {
      handleEvent: (event: DomainEvent) => {
        // Forward to all callbacks for this event type
        const callbacks = this.subscribers.get(event.type);
        
        if (callbacks) {
          for (const callback of callbacks) {
            try {
              callback(event);
            } catch (error) {
              console.error(`Error in event callback for ${event.type}:`, error);
            }
          }
        }
      },
      getSubscriptionTypes: () => [eventType],
      getPriority: () => 0,
      getId: () => subscriberId
    };
    
    // Subscribe with the mediator
    const subscription = this.mediator.subscribe([eventType], subscriber);
    
    // Store the subscription ID for later unsubscribe
    this.subscriptionIds.set(eventType, subscription.id);
    
    // Track this event type
    this.eventTypes.push(eventType);
  }

  /**
   * Unsubscribe from a specific event type
   * 
   * @param eventType The event type to unsubscribe from
   */
  private unsubscribeFromEventType(eventType: EventType): void {
    const subscriptionId = this.subscriptionIds.get(eventType);
    
    if (subscriptionId) {
      // Find the subscription and cancel it
      const subscription = new Subscription({
        id: subscriptionId,
        subscriberId: 'event-bus',
        eventTypes: [eventType]
      });
      
      this.mediator.unsubscribe(subscription);
      
      // Clean up
      this.subscriptionIds.delete(eventType);
      
      const index = this.eventTypes.indexOf(eventType);
      if (index !== -1) {
        this.eventTypes.splice(index, 1);
      }
    }
  }

  /**
   * Clear all subscriptions
   */
  public clear(): void {
    // Make a copy of event types to prevent modification during iteration
    const types = [...this.eventTypes];
    
    // Unsubscribe from each type
    for (const type of types) {
      this.unsubscribeFromEventType(type);
    }
    
    // Clear all collections
    this.subscribers.clear();
    this.subscriptionIds.clear();
    this.eventTypes.length = 0;
  }
}
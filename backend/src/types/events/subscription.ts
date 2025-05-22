import { EventType } from "./enums";
import { Event as DomainEvent } from "@/core/events/models/Event";

/**
 * Options for event subscriptions
 */
export interface SubscriptionOptions {
  once?: boolean;
  includePast?: boolean;
  fromTimestamp?: Date;
  filter?: (event: DomainEvent) => boolean;
}

/**
 * Interface for event subscribers that can receive and handle events
 * from the event system.
 */
export interface EventSubscriber {
  /**
   * Handle an event received from the event mediator
   * 
   * @param event The event to handle
   * @returns A promise that resolves when the event is handled, or void if sync processing
   */
  handleEvent(event: DomainEvent): void | Promise<void>;
  
  /**
   * Get the event types this subscriber is interested in
   * 
   * @returns Array of event types this subscriber wants to receive
   */
  getSubscriptionTypes(): EventType[];
  
  /**
   * Get the priority of this subscriber (higher priority subscribers
   * are notified first)
   * 
   * @returns The priority value (higher number = higher priority)
   */
  getPriority(): number;
  
  /**
   * Get the unique identifier for this subscriber
   * 
   * @returns The subscriber's unique ID
   */
  getId(): string;
}
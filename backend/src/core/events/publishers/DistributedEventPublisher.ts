import { Event } from '../models/Event';
import { Subscription } from '../models/Subscription';

/**
 * Interface for distributed event publishers that can
 * publish events to external systems and services
 */
export interface DistributedEventPublisher {
  /**
   * Publish an event to a specific channel
   * 
   * @param channel The channel to publish to
   * @param event The event to publish
   * @returns A promise that resolves when the event is published
   */
  publishToChannel(channel: string, event: Event): Promise<void>;
  
  /**
   * Subscribe to events from a specific channel
   * 
   * @param channel The channel to subscribe to
   * @param handler The handler for received events
   * @returns A subscription that can be used to unsubscribe
   */
  subscribe(channel: string, handler: (event: Event) => Promise<void>): Subscription;
  
  /**
   * Unsubscribe from a channel
   * 
   * @param subscription The subscription to cancel
   * @returns A promise that resolves when unsubscribed
   */
  unsubscribe(subscription: Subscription): Promise<void>;
  
  /**
   * Get a list of available channels
   * 
   * @returns Array of available channel names
   */
  getAvailableChannels(): string[];
}

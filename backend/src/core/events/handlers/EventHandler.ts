import { Event } from '../models/Event';

/**
 * Interface for event handlers that process events
 * from the event system.
 * 
 * Event handlers are simpler than subscribers as they only
 * need to implement a single method and don't need to
 * specify which events they handle (that's done at registration time).
 */
export interface EventHandler {
  /**
   * Handle an event received from the event system
   * 
   * @param event The event to handle
   * @returns A promise that resolves when the event is handled, or void if sync processing
   */
  handleEvent(event: Event): Promise<void> | void;
}
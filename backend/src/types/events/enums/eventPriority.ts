/**
 * Defines the priority levels for events in the system
 */
export enum EventPriority {
  /** High priority events that should be processed immediately */
  HIGH = "high",
  
  /** Normal priority events (default) */
  NORMAL = "normal",
  
  /** Low priority events that can be processed when resources are available */
  LOW = "low",
  
  /** Bulk processing events that can be batched */
  BULK = "bulk"
}
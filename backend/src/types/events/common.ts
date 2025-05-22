/**
 * Configuration for the event facade
 */
export interface EventFacadeConfig {
  validateEvents: boolean;
  enrichEvents: boolean;
}

/**
 * Configuration for the event mediator
 */
export interface EventMediatorConfig {
  asyncProcessing: boolean;
  workerCount: number;
}


/**
 * Configuration for the event queue
 */
export interface EventQueueConfig {
  maxRetries: number;
  enableDeadLetterQueue: boolean;
  maxDeadLetterQueueSize: number;
  logDeadLetterEvents: boolean;
}

/**
 * Interface representing a reference to an entity
 */
export interface EntityReference {
  entityType: string;
  entityId: string;
}
/**
 * Valid domain namespaces for events
 */
export type EventNamespace = 
  | 'user'
  | 'auth'
  | 'organization'
  | 'exercise'
  | 'workout'
  | 'program'
  | 'activity'
  | 'media'
  | 'system'
  | 'cache'
  | 'content'
  | 'notification'
  | 'search'
  | 'progression'
  | 'trainer'
  | 'client'
  | 'metrics';

/**
 * Valid action types for events
 */
export type EventAction = 
  | 'created'
  | 'updated'
  | 'deleted'
  | 'activated'
  | 'deactivated'
  | 'started'
  | 'completed'
  | 'failed'
  | 'added'
  | 'removed'
  | 'changed'
  | 'enabled'
  | 'disabled'
  | 'login'
  | 'logout'
  | 'reset'
  | 'invalidated'
  | 'cleared'
  | 'assigned'
  | 'achieved'
  | 'recorded'
  | 'slow'
  | 'processing';

/**
 * Represents an event type identifier following the namespaced pattern.
 * 
 * Event types follow a namespaced structure using dots as separators.
 * Format: `namespace.resource.action` or `namespace.action`
 * 
 * Examples: "user.created", "auth.login", "organization.member.added"
 */
export type EventType = 
  | `${EventNamespace}.${string}.${EventAction}`
  | `${EventNamespace}.${EventAction}`
  | `${EventNamespace}.*`
  | '*';  // Wildcard for all events

/**
 * Common system event types used throughout the application
 */
export enum SystemEventTypes {
  // User events
  USER_CREATED = "user.created",
  USER_UPDATED = "user.updated",
  USER_DELETED = "user.deleted",
  USER_ACTIVATED = "user.activated",
  USER_DEACTIVATED = "user.deactivated",
  
  // Auth events
  AUTH_LOGIN = "auth.login",
  AUTH_LOGOUT = "auth.logout",
  AUTH_PASSWORD_CHANGED = "auth.password.changed",
  AUTH_PASSWORD_RESET = "auth.password.reset",
  AUTH_MFA_ENABLED = "auth.mfa.enabled",
  AUTH_MFA_DISABLED = "auth.mfa.disabled",
  
  // Organization events
  ORG_CREATED = "organization.created",
  ORG_UPDATED = "organization.updated",
  ORG_DELETED = "organization.deleted",
  ORG_MEMBER_ADDED = "organization.member.added",
  ORG_MEMBER_REMOVED = "organization.member.removed",
  ORG_MEMBER_ROLE_CHANGED = "organization.member.role.changed",
  
  // System events
  SYSTEM_STARTED = "system.started",
  SYSTEM_STOPPING = "system.stopping",
  SYSTEM_ERROR = "system.error",
  SYSTEM_CONFIG_CHANGED = "system.config.changed",
  
  // Cache events
  CACHE_INVALIDATED = "cache.invalidated",
  CACHE_CLEARED = "cache.cleared",
  
  // Content events
  CONTENT_CREATED = "content.created",
  CONTENT_UPDATED = "content.updated",
  CONTENT_DELETED = "content.deleted",
  
  // Metrics events
  METRICS_SLOW_PROCESSING = "metrics.slow.processing",
  METRICS_ERROR_RECORDED = "metrics.error.recorded",
  METRICS_RESET = "metrics.reset"
}

/**
 * Metrics-specific event types
 */
export enum MetricsEventTypes {
  SLOW_PROCESSING = "metrics.slow.processing",
  ERROR_RECORDED = "metrics.error.recorded",
  METRICS_RESET = "metrics.reset",
  THRESHOLD_EXCEEDED = "metrics.threshold.exceeded",
  PERFORMANCE_WARNING = "metrics.performance.warning",
  BATCH_PROCESSED = "metrics.batch.processed",
  QUEUE_SIZE_CHANGED = "metrics.queue.size.changed"
}

/**
 * Checks if an event type belongs to a certain namespace
 * 
 * @param eventType The event type to check
 * @param namespace The namespace to check against
 * @returns True if the event belongs to the namespace
 */
export function isInNamespace(eventType: EventType, namespace: EventNamespace): boolean {
  return eventType.startsWith(`${namespace}.`);
}

/**
 * Extracts the namespace from an event type
 * 
 * @param eventType The event type to extract from
 * @returns The namespace of the event type
 */
export function getNamespace(eventType: EventType): string {
  const parts = eventType.split('.');
  return parts.length > 0 ? parts[0] : '';
}

/**
 * Extracts the action from an event type (the last part)
 * 
 * @param eventType The event type to extract from
 * @returns The action part of the event type
 */
export function getAction(eventType: EventType): string {
  const parts = eventType.split('.');
  return parts.length > 0 ? parts[parts.length - 1] : '';
}
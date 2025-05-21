import { EventType } from '../events/types/EventType';

/**
 * Event types for cache operations
 */
export const CacheEventTypes = {
  HIT: 'cache.hit' as EventType,
  MISS: 'cache.miss' as EventType,
  SET: 'cache.set' as EventType,
  DELETE: 'cache.delete' as EventType,
  CLEAR: 'cache.clear' as EventType,
  CLEAR_ALL: 'cache.clear.all' as EventType,
  ERROR: 'cache.error' as EventType,
  EXPIRED: 'cache.expired' as EventType,
  EVICTED: 'cache.evicted' as EventType
};

/**
 * Type representing all possible cache event types
 */
export type CacheEventType = typeof CacheEventTypes[keyof typeof CacheEventTypes];
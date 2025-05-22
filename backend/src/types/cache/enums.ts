import { EventType } from '../../types/events/enums/eventTypes';

/**
 * Defined domains for cache partitioning
 */
export enum CacheDomain {
  AUTH = 'auth',
  USER = 'user',
  PERMISSION = 'permission',
  ORGANIZATION = 'organization',
  API = 'api',
  SYSTEM = 'system',
  DEFAULT = 'default'
}


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

/**
 * Eviction strategies for cache entries
 */
export enum EvictionStrategy {
  LRU = 'lru',
  LFU = 'lfu',
  FIFO = 'fifo',
  RANDOM = 'random'
}


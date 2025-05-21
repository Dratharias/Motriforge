/**
 * Eviction strategies for cache entries
 */
export enum EvictionStrategy {
  /**
   * Least Recently Used
   */
  LRU = 'lru',
  
  /**
   * Least Frequently Used
   */
  LFU = 'lfu',
  
  /**
   * First In, First Out
   */
  FIFO = 'fifo',
  
  /**
   * Random eviction
   */
  RANDOM = 'random'
}

/**
 * Policy for cache behavior
 */
export interface CachePolicy {
  /**
   * Default TTL for entries in milliseconds
   */
  ttl: number;
  
  /**
   * Maximum number of entries in the cache
   */
  maxEntries?: number;
  
  /**
   * Maximum size of the cache in bytes
   */
  maxSize?: number;
  
  /**
   * Strategy for evicting entries when the cache is full
   */
  evictionStrategy: EvictionStrategy;
  
  /**
   * Threshold in bytes for when to compress entries
   */
  compressionThreshold?: number;
  
  /**
   * How often to refresh entries in the background (milliseconds)
   */
  refreshInterval?: number;
  
  /**
   * How long to serve stale data while revalidating (milliseconds)
   */
  staleWhileRevalidate?: number;
  
  /**
   * How long to serve stale data if an error occurs (milliseconds)
   */
  staleIfError?: number;
}

/**
 * Create a cache policy with defaults
 */
export function createCachePolicy(policy?: Partial<CachePolicy>): CachePolicy {
  return {
    ttl: 60 * 60 * 1000, // 1 hour default
    evictionStrategy: EvictionStrategy.LRU,
    ...policy
  };
}
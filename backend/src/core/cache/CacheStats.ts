/**
 * Statistics for cache operations
 */
export interface CacheStats {
  /**
   * Number of cache hits
   */
  hits: number;
  
  /**
   * Number of cache misses
   */
  misses: number;
  
  /**
   * Hit rate (hits / (hits + misses))
   */
  hitRate: number;
  
  /**
   * Number of errors encountered
   */
  errors: number;
  
  /**
   * Number of sets performed
   */
  sets: number;
  
  /**
   * Number of deletes performed
   */
  deletes: number;
  
  /**
   * Total size in bytes
   */
  size: number;
  
  /**
   * Number of items in the cache
   */
  itemCount: number;
  
  /**
   * Date of the oldest entry
   */
  oldestEntry?: Date;
  
  /**
   * Date of the newest entry
   */
  newestEntry?: Date;
}

/**
 * Create default cache stats
 */
export function createCacheStats(): CacheStats {
  return {
    hits: 0,
    misses: 0,
    hitRate: 0,
    errors: 0,
    sets: 0,
    deletes: 0,
    size: 0,
    itemCount: 0
  };
}

/**
 * Update cache stats with a hit
 */
export function recordHit(stats: CacheStats): CacheStats {
  const hits = stats.hits + 1;
  const total = hits + stats.misses;
  const hitRate = total === 0 ? 0 : hits / total;
  
  return {
    ...stats,
    hits,
    hitRate
  };
}

/**
 * Update cache stats with a miss
 */
export function recordMiss(stats: CacheStats): CacheStats {
  const misses = stats.misses + 1;
  const total = stats.hits + misses;
  const hitRate = total === 0 ? 0 : stats.hits / total;
  
  return {
    ...stats,
    misses,
    hitRate
  };
}
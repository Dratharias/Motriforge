export interface CacheOptions {
  /**
   * Time-to-live in milliseconds
   */
  ttl?: number;
  
  /**
   * Tags for cache invalidation
   */
  tags?: string[];
  
  /**
   * Priority of cache entry (higher values mean higher priority)
   */
  priority?: number;
  
  /**
   * Whether to compress the cached data
   */
  compress?: boolean;
  
  /**
   * Whether to serve stale data while fetching fresh data
   */
  staleWhileRevalidate?: boolean;
  
  /**
   * Whether to serve stale data if an error occurs while fetching
   */
  staleIfError?: boolean;
  
  /**
   * Force a refresh of the cache even if it's not expired
   */
  forceRefresh?: boolean;
  
  /**
   * Wait for the refresh to complete instead of returning stale data
   */
  waitForRefresh?: boolean;
}

/**
 * Create cache options with defaults
 */
export function createCacheOptions(options?: Partial<CacheOptions>): CacheOptions {
  return {
    ttl: 60 * 60 * 1000, // 1 hour default
    priority: 1,
    compress: false,
    staleWhileRevalidate: false,
    staleIfError: false,
    forceRefresh: false,
    waitForRefresh: false,
    ...options
  };
}
/**
 * Options for the cache fetch strategy
 */
export interface CacheFetchOptions {
  cacheErrors?: boolean;
  errorTtl?: number;
  throwErrors?: boolean;
  shouldCache?: (value: any) => boolean;
}

/**
 * Options for stale-while-revalidate strategy
 */
export interface StaleWhileRevalidateOptions {
  staleTimeMs?: number;
  minRevalidateIntervalMs?: number;
  maxConcurrentRevalidations?: number;
}

export interface RevalidationTask {
  key: string;
  fetcher: () => Promise<any>;
  options?: CacheOptions;
  timestamp: number;
}

/**
 * Interface for cache strategies
 */
export interface CacheStrategy {
  /**
   * Get a value from the cache or compute it if not available
   * @param key Cache key
   * @param fetcher Function to compute the value if not in cache
   * @param options Cache options
   * @returns The cached or computed value
   */
  get<T>(key: string, fetcher: () => Promise<T>, options?: CacheOptions): Promise<T>;
}
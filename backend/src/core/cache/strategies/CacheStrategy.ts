import { CacheOptions } from '../CacheOptions';

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
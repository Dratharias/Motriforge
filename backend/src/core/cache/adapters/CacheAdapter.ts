import { CacheOptions } from '../CacheOptions';
import { CacheStats } from '../CacheStats';

/**
 * Interface for cache storage adapters
 */
export interface CacheAdapter {
  /**
   * Get a value from the cache
   * @param key Cache key
   * @returns The value, or undefined if not found
   */
  get<T>(key: string): Promise<T | undefined>;
  
  /**
   * Set a value in the cache
   * @param key Cache key
   * @param value The value to cache
   * @param options Caching options
   */
  set<T>(key: string, value: T, options?: CacheOptions): Promise<void>;
  
  /**
   * Delete a value from the cache
   * @param key Cache key
   */
  delete(key: string): Promise<void>;
  
  /**
   * Clear all values from the cache
   */
  clear(): Promise<void>;
  
  /**
   * Check if a key exists in the cache
   * @param key Cache key
   */
  has(key: string): Promise<boolean>;
  
  /**
   * Get all keys matching a pattern
   * @param pattern Key pattern to match
   */
  keys(pattern?: string): Promise<string[]>;
  
  /**
   * Get statistics about the cache
   */
  getStatistics(): CacheStats;
}
import { CacheOptions } from "@/types/cache";

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
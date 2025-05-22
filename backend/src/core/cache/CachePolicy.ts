import { CachePolicy, EvictionStrategy } from "@/types/cache";

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
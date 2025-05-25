
import { CacheEntryMetadata, CacheEvictionPolicy } from '@/types/shared/infrastructure/caching';
import { LRUCacheStrategy, LFUCacheStrategy, TTLCacheStrategy, DefaultCacheStrategy } from './CacheAdapter';
import { ICacheStrategy } from './interfaces/ICache';

/**
 * Cache strategy factory - single responsibility for creating strategies
 */
export class CacheStrategyFactory {
  static createStrategy(policy: CacheEvictionPolicy, defaultTtl: number = 3600): ICacheStrategy {
    switch (policy) {
      case CacheEvictionPolicy.LRU:
        return new LRUCacheStrategy(defaultTtl);
      
      case CacheEvictionPolicy.LFU:
        return new LFUCacheStrategy(defaultTtl);
      
      case CacheEvictionPolicy.TTL:
        return new TTLCacheStrategy(defaultTtl);
      
      case CacheEvictionPolicy.FIFO:
      case CacheEvictionPolicy.RANDOM:
      case CacheEvictionPolicy.NONE:
      default:
        return new DefaultCacheStrategy(defaultTtl);
    }
  }

  static createCustomStrategy(name: string, config: {
    shouldCache: (key: string, value: any) => boolean;
    getTtl: (key: string, value: any) => number;
    getEvictionPriority: (entry: CacheEntryMetadata) => number;
    shouldEvict: (entry: CacheEntryMetadata) => boolean;
  }): ICacheStrategy {
    return {
      name,
      shouldCache: config.shouldCache,
      getTtl: config.getTtl,
      getEvictionPriority: config.getEvictionPriority,
      shouldEvict: config.shouldEvict
    };
  }
}


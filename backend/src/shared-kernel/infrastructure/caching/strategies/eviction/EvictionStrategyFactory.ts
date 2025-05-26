
import { CacheEvictionPolicy } from '@/types/shared/infrastructure/caching';

export class EvictionStrategyFactory {
  static createStrategy(policy: CacheEvictionPolicy): IEvictionStrategy {
    switch (policy) {
      case CacheEvictionPolicy.LRU:
        return new LRUEvictionStrategy();
      
      case CacheEvictionPolicy.LFU:
        return new LFUEvictionStrategy();
      
      case CacheEvictionPolicy.TTL:
        return new TTLEvictionStrategy();
      
      default:
        return new LRUEvictionStrategy(); // Default fallback
    }
  }
}
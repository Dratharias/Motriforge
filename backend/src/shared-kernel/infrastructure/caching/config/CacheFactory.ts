
import { CacheConfiguration } from '@/types/shared/infrastructure/caching';
import { ICache, ICacheFactory } from '../interfaces/ICache';
import { MemoryCache } from './MemoryCache';

/**
 * Cache factory - creates cache instances
 */
export class CacheFactory implements ICacheFactory {
  async createCache(name: string, config: CacheConfiguration): Promise<ICache> {
    // For now, only memory cache since Redis is removed
    return this.createMemoryCache(name, config);
  }

  private async createMemoryCache(name: string, config: CacheConfiguration): Promise<ICache> {
    const cache = new MemoryCache(name, config);
    await cache.initialize();
    return cache;
  }
}


import { CacheConfiguration } from '@/types/shared/infrastructure/caching';
import { CacheFacade } from './CacheFacade';
import { ICacheAdapter } from './interfaces/ICache';

// Export main cache adapter for external use
export { BaseCacheAdapter as CacheAdapter } from './core/BaseCacheAdapter';

// Export Redis-specific implementation
export { RedisCache } from './adapters/RedisCache';

// Export Memory-specific implementation  
export { MemoryCache } from './adapters/MemoryCache';

// Export main facade
export { CacheFacade } from './CacheFacade';

// Export configuration manager
export { CacheConfigurationManager } from './CacheConfigurationManager';

// Export factory
export { CacheFactory } from './CacheFactory';

// Export strategies
export { DefaultCacheStrategy } from './strategies/CacheStrategy';
export { LFUCacheStrategy } from './strategies/LFUCacheStrategy';
export { LRUCacheStrategy } from './strategies/LRUCacheStrategy';
export { TTLCacheStrategy } from './strategies/TTLCacheStrategy';

// Export serializers
export { JsonCacheSerializer } from './serializers/JsonCacheSerializer';
export { CompressedCacheSerializer } from './serializers/CompressedCacheSerializer';
export { BinaryCacheSerializer } from './serializers/BinaryCacheSerializer';
export { CacheSerializerFactory } from './CacheSerializerFactory';

// Global cache instance for easy access
let globalCacheFacade: CacheFacade | undefined;

/**
 * Initialize global cache
 */
export async function initializeCache(config?: Partial<CacheConfiguration>): Promise<void> {
  globalCacheFacade = new CacheFacade();
  await globalCacheFacade.initialize(config);
}

/**
 * Get global cache instance
 */
export function getCache(): ICacheAdapter {
  if (!globalCacheFacade) {
    throw new Error('Global cache not initialized. Call initializeCache() first.');
  }
  return globalCacheFacade.getCache();
}

/**
 * Get global cache facade
 */
export function getCacheFacade(): CacheFacade {
  if (!globalCacheFacade) {
    throw new Error('Global cache not initialized. Call initializeCache() first.');
  }
  return globalCacheFacade;
}

/**
 * Shutdown global cache
 */
export async function shutdownCache(): Promise<void> {
  if (globalCacheFacade) {
    await globalCacheFacade.shutdown();
    globalCacheFacade = undefined;
  }
}
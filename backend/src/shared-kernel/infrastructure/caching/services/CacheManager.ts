
import { CacheConfiguration } from '@/types/shared/infrastructure/caching';
import { ICache } from '../interfaces/ICache';
import { CacheFactory } from '../config/CacheFactory';
import { CacheHealthService } from './CacheHealthService';
import { CacheMetricsService } from './CacheMetricsService';

/**
 * Cache manager - handles cache lifecycle and coordination
 */
export class CacheManager {
  private readonly caches = new Map<string, ICache>();
  private readonly factory = new CacheFactory();

  constructor(
    private readonly healthService: CacheHealthService,
    private readonly metricsService: CacheMetricsService
  ) {}

  async createCache(name: string, config: CacheConfiguration): Promise<ICache> {
    if (this.caches.has(name)) {
      throw new Error(`Cache '${name}' already exists`);
    }

    const cache = await this.factory.createCache(name, config);
    this.caches.set(name, cache);
    
    // Register with services
    this.healthService.registerCache(name, cache);
    
    return cache;
  }

  getCache(name: string): ICache {
    const cache = this.caches.get(name);
    if (!cache) {
      throw new Error(`Cache '${name}' not found`);
    }
    return cache;
  }

  async removeCache(name: string): Promise<void> {
    const cache = this.caches.get(name);
    if (cache) {
      await cache.clear();
      this.caches.delete(name);
      this.healthService.unregisterCache(name);
      this.metricsService.unregisterMetricsCollector(name);
    }
  }

  async shutdown(): Promise<void> {
    const clearPromises = Array.from(this.caches.values()).map(cache =>
      cache.clear().catch(error =>
        console.error('Failed to clear cache during shutdown:', error)
      )
    );

    await Promise.allSettled(clearPromises);
    this.caches.clear();
  }

  getCacheNames(): string[] {
    return Array.from(this.caches.keys());
  }

  hasCaches(): boolean {
    return this.caches.size > 0;
  }
}
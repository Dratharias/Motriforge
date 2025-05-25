import { CacheConfiguration } from "@/types/shared/infrastructure/caching";
import { CacheConfigurationManager } from "./CacheConfigurationManager";
import { CacheFactory } from "./CacheFactory";
import { ICacheAdapter } from "./interfaces/ICache";

/**
 * Cache Facade - Main entry point that orchestrates caching components
 * Follows Facade pattern to avoid god object anti-pattern
 */
export class CacheFacade {
  private readonly caches: Map<string, ICacheAdapter> = new Map();
  private readonly factory: CacheFactory;
  private readonly configManager: CacheConfigurationManager;
  private defaultCache?: ICacheAdapter;

  constructor(configManager?: CacheConfigurationManager) {
    this.configManager = configManager || new CacheConfigurationManager();
    this.factory = new CacheFactory();
  }

  /**
   * Initialize the default cache
   */
  async initialize(config?: Partial<CacheConfiguration>): Promise<void> {
    if (config) {
      await this.configManager.updateConfiguration(config);
    }

    const cacheConfig = this.configManager.getConfiguration();
    this.defaultCache = await this.factory.createCache('default', cacheConfig);
    this.caches.set('default', this.defaultCache);
  }

  /**
   * Get the default cache
   */
  getCache(): ICacheAdapter {
    if (!this.defaultCache) {
      throw new Error('Cache not initialized. Call initialize() first.');
    }
    return this.defaultCache;
  }

  /**
   * Get a named cache
   */
  getNamedCache(name: string): ICacheAdapter {
    const cache = this.caches.get(name);
    if (!cache) {
      throw new Error(`Cache '${name}' not found. Create it first using createCache().`);
    }
    return cache;
  }

  /**
   * Create a new named cache with specific configuration
   */
  async createCache(name: string, config?: Partial<CacheConfiguration>): Promise<ICacheAdapter> {
    if (this.caches.has(name)) {
      throw new Error(`Cache '${name}' already exists`);
    }

    const baseConfig = this.configManager.getConfiguration();
    const mergedConfig = { ...baseConfig, ...config };
    
    const cache = await this.factory.createCache(name, mergedConfig);
    this.caches.set(name, cache);
    
    return cache;
  }

  /**
   * Remove a named cache
   */
  async removeCache(name: string): Promise<void> {
    if (name === 'default') {
      throw new Error('Cannot remove default cache');
    }

    const cache = this.caches.get(name);
    if (cache) {
      await cache.disconnect();
      this.caches.delete(name);
    }
  }

  /**
   * Get health status of all caches
   */
  async getHealthStatus(): Promise<Record<string, any>> {
    const healthPromises = Array.from(this.caches.entries()).map(async ([name, cache]) => {
      const health = await cache.getHealthChecker().checkHealth();
      return [name, health] as const;
    });

    const results = await Promise.allSettled(healthPromises);
    const healthStatus: Record<string, any> = {};

    results.forEach((result, index) => {
      const cacheName = Array.from(this.caches.keys())[index];
      healthStatus[cacheName] = result.status === 'fulfilled' ? result.value[1] : { healthy: false };
    });

    return healthStatus;
  }

  /**
   * Get metrics from all caches
   */
  getMetrics(): Record<string, any> {
    const metrics: Record<string, any> = {};
    
    for (const [name, cache] of this.caches) {
      metrics[name] = cache.getMetricsCollector().getStatistics();
    }
    
    return metrics;
  }

  /**
   * Flush all caches
   */
  async flushAll(): Promise<void> {
    const flushPromises = Array.from(this.caches.values()).map(cache =>
      cache.clear().catch(error =>
        console.error(`Failed to flush cache:`, error)
      )
    );

    await Promise.allSettled(flushPromises);
  }

  /**
   * Disconnect all caches
   */
  async shutdown(): Promise<void> {
    const disconnectPromises = Array.from(this.caches.values()).map(cache =>
      cache.disconnect().catch(error =>
        console.error(`Failed to disconnect cache:`, error)
      )
    );

    await Promise.allSettled(disconnectPromises);
    this.caches.clear();
    this.defaultCache = undefined;
  }

  /**
   * Get configuration manager
   */
  getConfigurationManager(): CacheConfigurationManager {
    return this.configManager;
  }

  /**
   * Create cache for specific environment
   */
  async createEnvironmentCache(environment: string): Promise<ICacheAdapter> {
    const config = this.configManager.getEnvironmentConfiguration(environment);
    return this.factory.createCache(`${environment}-cache`, config);
  }
}


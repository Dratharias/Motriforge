
import { RedisCache } from './adapters/RedisCache';
import { MemoryCache } from './adapters/MemoryCache';
import { CacheHealthChecker } from './health/CacheHealthChecker';
import { CacheStrategy } from '@/types/shared/enums/common';
import { CacheConfiguration } from '@/types/shared/infrastructure/caching';
import { CacheSerializerFactory } from './CacheSerializerFactory';
import { CacheStrategyFactory } from './CacheStrategyFactory';
import { ICacheFactory, ICacheAdapter } from './interfaces/ICache';
import { CacheMetricsCollector } from './metrics/CacheMetricsCollector';

/**
 * Cache factory - single responsibility for creating cache instances
 */
export class CacheFactory implements ICacheFactory {
  async createCache(name: string, config: CacheConfiguration): Promise<ICacheAdapter> {
    switch (config.strategy) {
      case CacheStrategy.WRITE_THROUGH:
      case CacheStrategy.WRITE_BEHIND:
      case CacheStrategy.WRITE_AROUND:
        if (config.connectionString?.startsWith('redis://')) {
          return this.createRedisCache(config);
        } else {
          return this.createMemoryCache(config);
        }
      
      default:
        return this.createMemoryCache(config);
    }
  }

  async createRedisCache(config: CacheConfiguration): Promise<ICacheAdapter> {
    const serializer = CacheSerializerFactory.createSerializer(
      config.serialization,
      config.enableCompression
    );
    
    const strategy = CacheStrategyFactory.createStrategy(
      config.evictionPolicy,
      config.defaultTtl
    );
    
    const healthChecker = new CacheHealthChecker(
      'redis',
      async () => {
        // Redis connection check logic would go here
        return true;
      },
      async () => {
        // Redis ping logic would go here
        return Date.now();
      }
    );
    
    const metricsCollector = new CacheMetricsCollector();
    
    const cache = new RedisCache(
      'redis-cache',
      config,
      serializer,
      strategy,
      healthChecker,
      metricsCollector
    );
    
    await cache.connect();
    return cache;
  }

  async createMemoryCache(config: CacheConfiguration): Promise<ICacheAdapter> {
    const serializer = CacheSerializerFactory.createSerializer(
      config.serialization,
      config.enableCompression
    );
    
    const strategy = CacheStrategyFactory.createStrategy(
      config.evictionPolicy,
      config.defaultTtl
    );
    
    const healthChecker = new CacheHealthChecker(
      'memory',
      async () => true, // Memory cache is always connected
      async () => 0     // Memory cache has no network latency
    );
    
    const metricsCollector = new CacheMetricsCollector();
    
    const cache = new MemoryCache(
      'memory-cache',
      config,
      serializer,
      strategy,
      healthChecker,
      metricsCollector
    );
    
    await cache.connect();
    return cache;
  }

  async createDistributedCache(config: CacheConfiguration): Promise<ICacheAdapter> {
    // For distributed cache, we'll use Redis with clustering support
    return this.createRedisCache({
      ...config,
      connectionString: config.connectionString ?? 'redis://redis-cluster:6379'
    });
  }
}


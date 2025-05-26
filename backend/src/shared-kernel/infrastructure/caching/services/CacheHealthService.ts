
import { CacheHealthStatus } from '@/types/shared/infrastructure/caching';
import { ICache } from '../interfaces/ICache';

/**
 * Cache health service - single responsibility for health monitoring
 */
export class CacheHealthService {
  private readonly caches = new Map<string, ICache>();

  registerCache(name: string, cache: ICache): void {
    this.caches.set(name, cache);
  }

  unregisterCache(name: string): void {
    this.caches.delete(name);
  }

  async checkHealth(): Promise<CacheHealthStatus> {
    const errors: string[] = [];
    let totalResponseTime = 0;
    let healthyCount = 0;

    for (const [name, cache] of this.caches) {
      try {
        const startTime = Date.now();
        const testKey = `__health_check_${Date.now()}`;
        
        // Test basic operations
        await cache.set(testKey, { test: true });
        const result = await cache.get(testKey);
        await cache.delete(testKey);
        
        const responseTime = Date.now() - startTime;
        totalResponseTime += responseTime;
        
        if (result.success) {
          healthyCount++;
        } else {
          errors.push(`Cache ${name} failed basic operations`);
        }
      } catch (error) {
        errors.push(`Cache ${name} health check failed: ${error}`);
      }
    }

    const totalCaches = this.caches.size;
    const healthy = healthyCount === totalCaches && errors.length === 0;
    const averageResponseTime = totalCaches > 0 ? totalResponseTime / totalCaches : 0;

    return {
      healthy,
      connected: healthyCount > 0,
      responseTime: averageResponseTime,
      memoryUsage: process.memoryUsage().heapUsed,
      connectionCount: healthyCount,
      errors,
      lastError: errors.length > 0 ? new Date() : undefined
    };
  }

  async checkCacheHealth(name: string): Promise<CacheHealthStatus> {
    const cache = this.caches.get(name);
    
    if (!cache) {
      return {
        healthy: false,
        connected: false,
        responseTime: 0,
        memoryUsage: 0,
        connectionCount: 0,
        errors: [`Cache ${name} not found`],
        lastError: new Date()
      };
    }

    try {
      const startTime = Date.now();
      const testKey = `__health_check_${name}_${Date.now()}`;
      
      await cache.set(testKey, { test: true });
      const result = await cache.get(testKey);
      await cache.delete(testKey);
      
      const responseTime = Date.now() - startTime;
      const healthy = result.success;

      return {
        healthy,
        connected: true,
        responseTime,
        memoryUsage: process.memoryUsage().heapUsed,
        connectionCount: 1,
        errors: healthy ? [] : ['Cache operation failed'],
        lastError: healthy ? undefined : new Date()
      };
    } catch (error) {
      return {
        healthy: false,
        connected: false,
        responseTime: 0,
        memoryUsage: 0,
        connectionCount: 0,
        errors: [`Health check failed: ${error}`],
        lastError: new Date()
      };
    }
  }

  getCacheNames(): string[] {
    return Array.from(this.caches.keys());
  }
}


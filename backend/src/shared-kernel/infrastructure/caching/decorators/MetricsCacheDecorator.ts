
import { CacheOperationResult, CacheOperationOptions } from '@/types/shared/infrastructure/caching';
import { ICache, ICacheMetricsCollector } from '../interfaces/ICache';

/**
 * Metrics cache decorator - adds metrics collection to cache operations
 */
export class MetricsCacheDecorator implements ICache {
  constructor(
    private readonly cache: ICache,
    private readonly metricsCollector: ICacheMetricsCollector
  ) {}

  get name(): string {
    return this.cache.name;
  }

  async get<T>(key: string): Promise<CacheOperationResult<T>> {
    const result = await this.cache.get<T>(key);
    
    if (result.success && result.value !== undefined) {
      this.metricsCollector.recordHit(key, result.operationTime ?? 0);
    } else {
      this.metricsCollector.recordMiss(key, result.operationTime ?? 0);
    }
    
    return result;
  }

  async set<T>(key: string, value: T, options?: CacheOperationOptions): Promise<CacheOperationResult<void>> {
    const result = await this.cache.set(key, value, options);
    
    if (result.success) {
      const size = this.estimateSize(value);
      this.metricsCollector.recordSet(key, size, result.operationTime ?? 0);
    }
    
    return result;
  }

  async delete(key: string): Promise<CacheOperationResult<void>> {
    const result = await this.cache.delete(key);
    this.metricsCollector.recordDelete(key, result.operationTime ?? 0);
    return result;
  }

  async exists(key: string): Promise<boolean> {
    return this.cache.exists(key);
  }

  async clear(): Promise<CacheOperationResult<void>> {
    return this.cache.clear();
  }

  async keys(pattern?: string): Promise<string[]> {
    return this.cache.keys(pattern);
  }

  private estimateSize(value: any): number {
    return JSON.stringify(value).length * 2;
  }
}


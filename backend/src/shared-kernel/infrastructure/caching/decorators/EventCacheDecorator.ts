
import { CacheEvent, CacheEventType } from '@/types/shared/infrastructure/caching';
import { ICacheEventPublisher } from '../interfaces/ICache';

/**
 * Event cache decorator - adds event publishing to cache operations
 */
export class EventCacheDecorator implements ICache {
  constructor(
    private readonly cache: ICache,
    private readonly eventPublisher: ICacheEventPublisher
  ) {}

  get name(): string {
    return this.cache.name;
  }

  async get<T>(key: string): Promise<CacheOperationResult<T>> {
    const result = await this.cache.get<T>(key);
    
    const eventType = result.success ? CacheEventType.HIT : CacheEventType.MISS;
    await this.eventPublisher.publish({
      type: eventType,
      key,
      timestamp: new Date(),
      operationTime: result.operationTime || 0,
      ...(result.success && { value: result.value, metadata: result.metadata })
    });
    
    return result;
  }

  async set<T>(key: string, value: T, options?: CacheOperationOptions): Promise<CacheOperationResult<void>> {
    const result = await this.cache.set(key, value, options);
    
    await this.eventPublisher.publish({
      type: CacheEventType.SET,
      key,
      value,
      timestamp: new Date(),
      operationTime: result.operationTime || 0,
      metadata: result.metadata
    });
    
    return result;
  }

  async delete(key: string): Promise<CacheOperationResult<void>> {
    const result = await this.cache.delete(key);
    
    await this.eventPublisher.publish({
      type: CacheEventType.DELETE,
      key,
      timestamp: new Date(),
      operationTime: result.operationTime || 0
    });
    
    return result;
  }

  async exists(key: string): Promise<boolean> {
    return this.cache.exists(key);
  }

  async clear(): Promise<CacheOperationResult<void>> {
    const result = await this.cache.clear();
    
    await this.eventPublisher.publish({
      type: CacheEventType.FLUSH,
      timestamp: new Date(),
      operationTime: result.operationTime || 0
    });
    
    return result;
  }

  async keys(pattern?: string): Promise<string[]> {
    return this.cache.keys(pattern);
  }
}
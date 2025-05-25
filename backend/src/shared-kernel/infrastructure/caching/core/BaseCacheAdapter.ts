
import { 
  CacheConfiguration, 
  CacheOperationResult, 
  CacheOperationOptions,
  CacheEntryMetadata,
  CacheBulkResult,
  CacheEvent,
  CacheEventType
} from '@/types/shared/infrastructure/caching';
import { 
  ICacheAdapter, 
  ICacheEventListener, 
  ICacheHealthChecker, 
  ICacheMetricsCollector,
  ICacheSerializer,
  ICacheStrategy
} from '../interfaces/ICache';

/**
 * Base cache adapter - core functionality without god object anti-pattern
 */
export abstract class BaseCacheAdapter implements ICacheAdapter {
  protected readonly listeners: Set<ICacheEventListener> = new Set();
  protected connected = false;

  constructor(
    public readonly name: string,
    protected readonly config: CacheConfiguration,
    protected readonly serializer: ICacheSerializer,
    protected readonly strategy: ICacheStrategy,
    protected readonly healthChecker: ICacheHealthChecker,
    protected readonly metricsCollector: ICacheMetricsCollector
  ) {}

  // Abstract methods to be implemented by concrete adapters
  abstract connect(): Promise<void>;
  abstract disconnect(): Promise<void>;
  abstract isConnected(): boolean;
  protected abstract performGet<T>(key: string): Promise<{ value: T; metadata: CacheEntryMetadata } | null>;
  protected abstract performSet<T>(key: string, value: T, metadata: CacheEntryMetadata): Promise<void>;
  protected abstract performDelete(key: string): Promise<void>;
  protected abstract performExists(key: string): Promise<boolean>;
  protected abstract performClear(): Promise<void>;
  protected abstract performKeys(pattern?: string): Promise<string[]>;

  async get<T>(key: string): Promise<CacheOperationResult<T>> {
    const startTime = Date.now();
    const normalizedKey = this.normalizeKey(key);

    try {
      const result = await this.performGet<T>(normalizedKey);
      const operationTime = Date.now() - startTime;

      if (result) {
        this.metricsCollector.recordHit(normalizedKey, operationTime);
        await this.publishEvent({
          type: CacheEventType.HIT,
          key: normalizedKey,
          metadata: result.metadata,
          timestamp: new Date(),
          operationTime
        });

        return {
          success: true,
          value: result.value,
          metadata: result.metadata,
          fromCache: true,
          operationTime
        };
      } else {
        this.metricsCollector.recordMiss(normalizedKey, operationTime);
        await this.publishEvent({
          type: CacheEventType.MISS,
          key: normalizedKey,
          timestamp: new Date(),
          operationTime
        });

        return {
          success: false,
          fromCache: false,
          operationTime
        };
      }
    } catch (error) {
      const operationTime = Date.now() - startTime;
      this.metricsCollector.recordError('get', error as Error);
      await this.publishEvent({
        type: CacheEventType.ERROR,
        key: normalizedKey,
        error: error as Error,
        timestamp: new Date(),
        operationTime
      });

      return {
        success: false,
        error: error as Error,
        fromCache: false,
        operationTime
      };
    }
  }

  async set<T>(key: string, value: T, options: CacheOperationOptions = {}): Promise<CacheOperationResult<void>> {
    const startTime = Date.now();
    const normalizedKey = this.normalizeKey(key);

    try {
      if (!this.strategy.shouldCache(normalizedKey, value)) {
        return {
          success: false,
          error: new Error('Strategy rejected caching this value'),
          fromCache: false,
          operationTime: Date.now() - startTime
        };
      }

      const metadata = this.createEntryMetadata(normalizedKey, value, options);
      const serializedValue = this.serializer.serialize(value);
      
      await this.performSet(normalizedKey, serializedValue, metadata);
      
      const operationTime = Date.now() - startTime;
      this.metricsCollector.recordSet(normalizedKey, metadata.size, operationTime);
      
      await this.publishEvent({
        type: CacheEventType.SET,
        key: normalizedKey,
        value,
        metadata,
        timestamp: new Date(),
        operationTime
      });

      return {
        success: true,
        metadata,
        fromCache: false,
        operationTime
      };
    } catch (error) {
      const operationTime = Date.now() - startTime;
      this.metricsCollector.recordError('set', error as Error);
      
      await this.publishEvent({
        type: CacheEventType.ERROR,
        key: normalizedKey,
        error: error as Error,
        timestamp: new Date(),
        operationTime
      });

      return {
        success: false,
        error: error as Error,
        fromCache: false,
        operationTime
      };
    }
  }

  async delete(key: string): Promise<CacheOperationResult<void>> {
    const startTime = Date.now();
    const normalizedKey = this.normalizeKey(key);

    try {
      await this.performDelete(normalizedKey);
      const operationTime = Date.now() - startTime;
      
      this.metricsCollector.recordDelete(normalizedKey, operationTime);
      
      await this.publishEvent({
        type: CacheEventType.DELETE,
        key: normalizedKey,
        timestamp: new Date(),
        operationTime
      });

      return {
        success: true,
        fromCache: false,
        operationTime
      };
    } catch (error) {
      const operationTime = Date.now() - startTime;
      this.metricsCollector.recordError('delete', error as Error);
      
      await this.publishEvent({
        type: CacheEventType.ERROR,
        key: normalizedKey,
        error: error as Error,
        timestamp: new Date(),
        operationTime
      });

      return {
        success: false,
        error: error as Error,
        fromCache: false,
        operationTime
      };
    }
  }

  async exists(key: string): Promise<boolean> {
    const normalizedKey = this.normalizeKey(key);
    try {
      return await this.performExists(normalizedKey);
    } catch (error) {
      this.metricsCollector.recordError('exists', error as Error);
      return false;
    }
  }

  async clear(): Promise<CacheOperationResult<void>> {
    const startTime = Date.now();

    try {
      await this.performClear();
      const operationTime = Date.now() - startTime;
      
      await this.publishEvent({
        type: CacheEventType.FLUSH,
        timestamp: new Date(),
        operationTime
      });

      return {
        success: true,
        fromCache: false,
        operationTime
      };
    } catch (error) {
      const operationTime = Date.now() - startTime;
      this.metricsCollector.recordError('clear', error as Error);
      
      await this.publishEvent({
        type: CacheEventType.ERROR,
        error: error as Error,
        timestamp: new Date(),
        operationTime
      });

      return {
        success: false,
        error: error as Error,
        fromCache: false,
        operationTime
      };
    }
  }

  async keys(pattern?: string): Promise<string[]> {
    try {
      return await this.performKeys(pattern);
    } catch (error) {
      this.metricsCollector.recordError('keys', error as Error);
      return [];
    }
  }

  async getMetadata(key: string): Promise<CacheEntryMetadata | null> {
    const normalizedKey = this.normalizeKey(key);
    try {
      const result = await this.performGet(normalizedKey);
      return result?.metadata || null;
    } catch (error) {
      return null;
    }
  }

  async getMultiple<T>(keys: string[]): Promise<CacheBulkResult<T>> {
    const startTime = Date.now();
    const successful: CacheOperationResult<T>[] = [];
    const failed: Array<{ key: string; error: Error }> = [];

    for (const key of keys) {
      try {
        const result = await this.get<T>(key);
        successful.push(result);
      } catch (error) {
        failed.push({ key, error: error as Error });
      }
    }

    return {
      successful,
      failed,
      totalOperationTime: Date.now() - startTime
    };
  }

  async setMultiple<T>(entries: Array<{ key: string; value: T; options?: CacheOperationOptions }>): Promise<CacheBulkResult<void>> {
    const startTime = Date.now();
    const successful: CacheOperationResult<void>[] = [];
    const failed: Array<{ key: string; error: Error }> = [];

    for (const entry of entries) {
      try {
        const result = await this.set(entry.key, entry.value, entry.options);
        successful.push(result);
      } catch (error) {
        failed.push({ key: entry.key, error: error as Error });
      }
    }

    return {
      successful,
      failed,
      totalOperationTime: Date.now() - startTime
    };
  }

  async deleteMultiple(keys: string[]): Promise<CacheBulkResult<void>> {
    const startTime = Date.now();
    const successful: CacheOperationResult<void>[] = [];
    const failed: Array<{ key: string; error: Error }> = [];

    for (const key of keys) {
      try {
        const result = await this.delete(key);
        successful.push(result);
      } catch (error) {
        failed.push({ key, error: error as Error });
      }
    }

    return {
      successful,
      failed,
      totalOperationTime: Date.now() - startTime
    };
  }

  async increment(key: string, delta: number = 1): Promise<CacheOperationResult<number>> {
    const normalizedKey = this.normalizeKey(key);
    try {
      const current = await this.get<number>(normalizedKey);
      const currentValue = current.success ? current.value ?? 0 : 0;
      const newValue = currentValue + delta;
      
      await this.set(normalizedKey, newValue);
      
      return {
        success: true,
        value: newValue,
        fromCache: false,
        operationTime: 0
      };
    } catch (error) {
      return {
        success: false,
        error: error as Error,
        fromCache: false,
        operationTime: 0
      };
    }
  }

  async decrement(key: string, delta: number = 1): Promise<CacheOperationResult<number>> {
    return this.increment(key, -delta);
  }

  async touch(key: string, ttl: number): Promise<CacheOperationResult<void>> {
    return this.expire(key, ttl);
  }

  async expire(key: string, ttl: number): Promise<CacheOperationResult<void>> {
    const normalizedKey = this.normalizeKey(key);
    try {
      const current = await this.performGet(normalizedKey);
      if (current) {
        const updatedMetadata = {
          ...current.metadata,
          ttl,
          expiresAt: new Date(Date.now() + ttl * 1000)
        };
        
        await this.performSet(normalizedKey, current.value, updatedMetadata);
        
        return {
          success: true,
          fromCache: false,
          operationTime: 0
        };
      } else {
        return {
          success: false,
          error: new Error('Key not found'),
          fromCache: false,
          operationTime: 0
        };
      }
    } catch (error) {
      return {
        success: false,
        error: error as Error,
        fromCache: false,
        operationTime: 0
      };
    }
  }

  getHealthChecker(): ICacheHealthChecker {
    return this.healthChecker;
  }

  getMetricsCollector(): ICacheMetricsCollector {
    return this.metricsCollector;
  }

  subscribe(listener: ICacheEventListener): void {
    this.listeners.add(listener);
  }

  unsubscribe(listener: ICacheEventListener): void {
    this.listeners.delete(listener);
  }

  protected normalizeKey(key: string): string {
    return `${this.config.keyPrefix}:${key}`;
  }

  protected createEntryMetadata<T>(key: string, value: T, options: CacheOperationOptions): CacheEntryMetadata {
    const now = new Date();
    const ttl = options.ttl ?? this.strategy.getTtl(key, value);
    const serializedSize = this.serializer.getSize(this.serializer.serialize(value));

    return {
      key,
      createdAt: now,
      expiresAt: ttl > 0 ? new Date(now.getTime() + ttl * 1000) : undefined,
      ttl: ttl > 0 ? ttl : undefined,
      hits: 0,
      lastAccessed: now,
      size: serializedSize,
      tags: options.tags ?? [],
      version: options.version ?? 1,
      compressed: options.compress ?? this.config.enableCompression,
      encrypted: options.encrypt ?? this.config.enableEncryption
    };
  }

  protected async publishEvent(event: CacheEvent): Promise<void> {
    const promises = Array.from(this.listeners).map(listener =>
      listener.onCacheEvent(event).catch(error =>
        console.error('Cache event listener error:', error)
      )
    );

    await Promise.allSettled(promises);
  }
}


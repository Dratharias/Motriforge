import { ICache } from '@/types/shared/base-types';
import { CacheStrategy } from '@/types/shared/enums/common';

/**
 * Cache entry interface
 */
export interface CacheEntry<T> {
  readonly key: string;
  readonly value: T;
  readonly ttl: number;
  readonly createdAt: Date;
  readonly expiresAt: Date;
  readonly hitCount: number;
  readonly tags?: readonly string[];
}

/**
 * Cache statistics interface
 */
export interface CacheStats {
  readonly hits: number;
  readonly misses: number;
  readonly hitRate: number;
  readonly totalKeys: number;
  readonly memoryUsage: number;
  readonly evictions: number;
}

/**
 * Cache configuration interface
 */
export interface CacheConfig {
  readonly strategy: CacheStrategy;
  readonly defaultTtl: number;
  readonly maxSize: number;
  readonly maxMemory: number;
  readonly keyPrefix: string;
  readonly enableStats: boolean;
  readonly enableCompression: boolean;
  readonly compressionThreshold: number;
  readonly evictionPolicy: 'lru' | 'lfu' | 'fifo' | 'ttl';
}

/**
 * Cache event types
 */
export enum CacheEventType {
  HIT = 'hit',
  MISS = 'miss',
  SET = 'set',
  DELETE = 'delete',
  EVICTION = 'eviction',
  CLEAR = 'clear',
  EXPIRE = 'expire'
}

/**
 * Cache event interface
 */
export interface CacheEvent {
  readonly type: CacheEventType;
  readonly key: string;
  readonly timestamp: Date;
  readonly metadata?: Record<string, any>;
}

/**
 * Cache event listener interface
 */
export interface ICacheEventListener {
  onCacheEvent(event: CacheEvent): void;
}

/**
 * Enhanced cache adapter with advanced features
 */
export abstract class CacheAdapter implements ICache {
  protected readonly config: CacheConfig;
  protected readonly stats: CacheStats;
  protected readonly eventListeners: ICacheEventListener[] = [];

  constructor(config: CacheConfig) {
    this.config = config;
    this.stats = {
      hits: 0,
      misses: 0,
      hitRate: 0,
      totalKeys: 0,
      memoryUsage: 0,
      evictions: 0
    };
  }

  /**
   * Adds an event listener
   */
  addEventListener(listener: ICacheEventListener): void {
    this.eventListeners.push(listener);
  }

  /**
   * Removes an event listener
   */
  removeEventListener(listener: ICacheEventListener): void {
    const index = this.eventListeners.indexOf(listener);
    if (index > -1) {
      this.eventListeners.splice(index, 1);
    }
  }

  /**
   * Gets a value from cache
   */
  async get<T>(key: string): Promise<T | null> {
    const prefixedKey = this.getPrefixedKey(key);
    
    try {
      const value = await this.doGet<T>(prefixedKey);
      
      if (value !== null) {
        this.recordHit(key);
        this.emitEvent(CacheEventType.HIT, key);
        return value;
      } else {
        this.recordMiss(key);
        this.emitEvent(CacheEventType.MISS, key);
        return null;
      }
    } catch (error) {
      const err = error as Error;
      console.warn(`Cache get operation failed for key ${key}: ${err.message}`);
      this.recordMiss(key);
      this.emitEvent(CacheEventType.MISS, key, { error: err.message });
      throw error;
    }
  }

  /**
   * Sets a value in cache
   */
  async set<T>(key: string, value: T, ttl?: number): Promise<void> {
    const prefixedKey = this.getPrefixedKey(key);
    const actualTtl = ttl ?? this.config.defaultTtl;
    
    try {
      const serializedValue = await this.serialize(value);
      await this.doSet(prefixedKey, serializedValue, actualTtl);
      
      this.emitEvent(CacheEventType.SET, key, { ttl: actualTtl });
    } catch (error) {
      const err = error as Error;
      console.error(`Cache set operation failed for key ${key}: ${err.message}`);
      this.emitEvent(CacheEventType.SET, key, { error: err.message });
      throw error;
    }
  }

  /**
   * Deletes a value from cache
   */
  async delete(key: string): Promise<void> {
    const prefixedKey = this.getPrefixedKey(key);
    
    try {
      await this.doDelete(prefixedKey);
      this.emitEvent(CacheEventType.DELETE, key);
    } catch (error) {
      const err = error as Error;
      console.error(`Cache delete operation failed for key ${key}: ${err.message}`);
      this.emitEvent(CacheEventType.DELETE, key, { error: err.message });
      throw error;
    }
  }

  /**
   * Checks if a key exists in cache
   */
  async exists(key: string): Promise<boolean> {
    const prefixedKey = this.getPrefixedKey(key);
    return this.doExists(prefixedKey);
  }

  /**
   * Clears all cached values
   */
  async clear(): Promise<void> {
    try {
      await this.doClear();
      this.emitEvent(CacheEventType.CLEAR, '*');
    } catch (error) {
      const err = error as Error;
      console.error(`Cache clear operation failed: ${err.message}`);
      this.emitEvent(CacheEventType.CLEAR, '*', { error: err.message });
      throw error;
    }
  }

  /**
   * Gets all keys matching a pattern
   */
  async keys(pattern?: string): Promise<readonly string[]> {
    const prefixedPattern = pattern ? this.getPrefixedKey(pattern) : `${this.config.keyPrefix}*`;
    const keys = await this.doKeys(prefixedPattern);
    return keys.map(key => this.removePrefixFromKey(key));
  }

  /**
   * Gets multiple values at once
   */
  async getMultiple<T>(keys: readonly string[]): Promise<Map<string, T | null>> {
    const result = new Map<string, T | null>();
    
    await Promise.all(
      keys.map(async (key) => {
        try {
          const value = await this.get<T>(key);
          result.set(key, value);
        } catch (error) {
          const err = error as Error;
          console.warn(`Failed to get cache value for key ${key}: ${err.message}`);
          result.set(key, null);
        }
      })
    );
    
    return result;
  }

  /**
   * Sets multiple values at once
   */
  async setMultiple<T>(entries: Map<string, T>, ttl?: number): Promise<void> {
    const results = await Promise.allSettled(
      Array.from(entries.entries()).map(([key, value]) =>
        this.set(key, value, ttl)
      )
    );

    // Log any failures
    results.forEach((result, index) => {
      if (result.status === 'rejected') {
        const key = Array.from(entries.keys())[index];
        console.error(`Failed to set cache value for key ${key}:`, result.reason);
      }
    });
  }

  /**
   * Deletes multiple keys at once
   */
  async deleteMultiple(keys: readonly string[]): Promise<void> {
    const results = await Promise.allSettled(keys.map(key => this.delete(key)));

    // Log any failures
    results.forEach((result, index) => {
      if (result.status === 'rejected') {
        const key = keys[index];
        console.error(`Failed to delete cache key ${key}:`, result.reason);
      }
    });
  }

  /**
   * Increments a numeric value
   */
  async increment(key: string, delta: number = 1): Promise<number> {
    const prefixedKey = this.getPrefixedKey(key);
    return this.doIncrement(prefixedKey, delta);
  }

  /**
   * Decrements a numeric value
   */
  async decrement(key: string, delta: number = 1): Promise<number> {
    const prefixedKey = this.getPrefixedKey(key);
    return this.doDecrement(prefixedKey, delta);
  }

  /**
   * Sets expiration time for a key
   */
  async expire(key: string, ttl: number): Promise<boolean> {
    const prefixedKey = this.getPrefixedKey(key);
    return this.doExpire(prefixedKey, ttl);
  }

  /**
   * Gets time to live for a key
   */
  async ttl(key: string): Promise<number> {
    const prefixedKey = this.getPrefixedKey(key);
    return this.doTtl(prefixedKey);
  }

  /**
   * Adds tags to cache entries for bulk operations
   */
  async setWithTags<T>(key: string, value: T, tags: readonly string[], ttl?: number): Promise<void> {
    await this.set(key, value, ttl);
    await this.doSetTags(this.getPrefixedKey(key), tags);
  }

  /**
   * Deletes all entries with specific tags
   */
  async deleteByTags(tags: readonly string[]): Promise<void> {
    const keys = await this.doGetKeysByTags(tags);
    await this.deleteMultiple(keys.map(key => this.removePrefixFromKey(key)));
  }

  /**
   * Gets cache statistics
   */
  getStats(): CacheStats {
    return { ...this.stats };
  }

  /**
   * Resets cache statistics
   */
  resetStats(): void {
    Object.assign(this.stats, {
      hits: 0,
      misses: 0,
      hitRate: 0,
      totalKeys: 0,
      memoryUsage: 0,
      evictions: 0
    });
  }

  // Abstract methods to be implemented by concrete cache adapters
  protected abstract doGet<T>(key: string): Promise<T | null>;
  protected abstract doSet(key: string, value: any, ttl: number): Promise<void>;
  protected abstract doDelete(key: string): Promise<void>;
  protected abstract doExists(key: string): Promise<boolean>;
  protected abstract doClear(): Promise<void>;
  protected abstract doKeys(pattern: string): Promise<readonly string[]>;
  protected abstract doIncrement(key: string, delta: number): Promise<number>;
  protected abstract doDecrement(key: string, delta: number): Promise<number>;
  protected abstract doExpire(key: string, ttl: number): Promise<boolean>;
  protected abstract doTtl(key: string): Promise<number>;
  protected abstract doSetTags(key: string, tags: readonly string[]): Promise<void>;
  protected abstract doGetKeysByTags(tags: readonly string[]): Promise<readonly string[]>;

  /**
   * Serializes a value for storage
   */
  protected async serialize<T>(value: T): Promise<any> {
    if (this.config.enableCompression && this.shouldCompress(value)) {
      return this.compress(JSON.stringify(value));
    }
    return JSON.stringify(value);
  }

  /**
   * Deserializes a value from storage
   */
  protected async deserialize<T>(value: any): Promise<T> {
    if (this.isCompressed(value)) {
      const decompressed = await this.decompress(value);
      return JSON.parse(decompressed);
    }
    return JSON.parse(value);
  }

  /**
   * Gets the prefixed key
   */
  protected getPrefixedKey(key: string): string {
    return `${this.config.keyPrefix}${key}`;
  }

  /**
   * Removes prefix from key
   */
  protected removePrefixFromKey(key: string): string {
    return key.startsWith(this.config.keyPrefix) 
      ? key.substring(this.config.keyPrefix.length)
      : key;
  }

  /**
   * Records a cache hit
   */
  protected recordHit(key: string): void {
    if (this.config.enableStats) {
      (this.stats as any).hits++;
      this.updateHitRate();
    }
  }

  /**
   * Records a cache miss
   */
  protected recordMiss(key: string): void {
    if (this.config.enableStats) {
      (this.stats as any).misses++;
      this.updateHitRate();
    }
  }

  /**
   * Updates hit rate calculation
   */
  private updateHitRate(): void {
    const total = this.stats.hits + this.stats.misses;
    (this.stats as any).hitRate = total > 0 ? this.stats.hits / total : 0;
  }

  /**
   * Emits a cache event
   */
  protected emitEvent(type: CacheEventType, key: string, metadata?: Record<string, any>): void {
    const event: CacheEvent = {
      type,
      key,
      timestamp: new Date(),
      metadata
    };

    this.eventListeners.forEach(listener => {
      try {
        listener.onCacheEvent(event);
      } catch (error) {
        console.error('Error in cache event listener:', error);
      }
    });
  }

  /**
   * Determines if a value should be compressed
   */
  protected shouldCompress<T>(value: T): boolean {
    const size = JSON.stringify(value).length;
    return size > this.config.compressionThreshold;
  }

  /**
   * Compresses a value (placeholder implementation)
   */
  protected async compress(value: string): Promise<any> {
    // In a real implementation, this would use a compression library
    return `compressed:${value}`;
  }

  /**
   * Decompresses a value (placeholder implementation)
   */
  protected async decompress(value: any): Promise<string> {
    // In a real implementation, this would use a compression library
    return value.toString().replace('compressed:', '');
  }

  /**
   * Checks if a value is compressed
   */
  protected isCompressed(value: any): boolean {
    return typeof value === 'string' && value.startsWith('compressed:');
  }
}
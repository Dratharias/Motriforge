import { CacheAdapter, CacheConfig } from './CacheAdapter';

/**
 * Redis connection configuration
 */
export interface RedisConfig {
  readonly host: string;
  readonly port: number;
  readonly password?: string;
  readonly database?: number;
  readonly connectTimeout: number;
  readonly commandTimeout: number;
  readonly retryAttempts: number;
  readonly retryDelay: number;
  readonly enableTls: boolean;
  readonly poolSize: number;
}

/**
 * Redis client interface (abstraction for different Redis clients)
 */
export interface IRedisClient {
  get(key: string): Promise<string | null>;
  set(key: string, value: string, ttl?: number): Promise<void>;
  del(key: string): Promise<number>;
  exists(key: string): Promise<number>;
  flushall(): Promise<void>;
  keys(pattern: string): Promise<string[]>;
  incr(key: string): Promise<number>;
  incrby(key: string, increment: number): Promise<number>;
  decr(key: string): Promise<number>;
  decrby(key: string, decrement: number): Promise<number>;
  expire(key: string, seconds: number): Promise<number>;
  ttl(key: string): Promise<number>;
  sadd(key: string, ...members: string[]): Promise<number>;
  smembers(key: string): Promise<string[]>;
  sinter(...keys: string[]): Promise<string[]>;
  srem(key: string, ...members: string[]): Promise<number>;
  pipeline(): IRedisPipeline;
  multi(): IRedisTransaction;
  disconnect(): Promise<void>;
}

/**
 * Redis pipeline interface
 */
export interface IRedisPipeline {
  get(key: string): IRedisPipeline;
  set(key: string, value: string, ttl?: number): IRedisPipeline;
  del(key: string): IRedisPipeline;
  exists(key: string): IRedisPipeline;
  incr(key: string): IRedisPipeline;
  incrby(key: string, increment: number): IRedisPipeline;
  decr(key: string): IRedisPipeline;
  decrby(key: string, decrement: number): IRedisPipeline;
  expire(key: string, seconds: number): IRedisPipeline;
  ttl(key: string): IRedisPipeline;
  sadd(key: string, ...members: string[]): IRedisPipeline;
  smembers(key: string): IRedisPipeline;
  sinter(...keys: string[]): IRedisPipeline;
  srem(key: string, ...members: string[]): IRedisPipeline;
  exec(): Promise<any[]>;
}

/**
 * Redis transaction interface
 */
export interface IRedisTransaction {
  get(key: string): IRedisTransaction;
  set(key: string, value: string, ttl?: number): IRedisTransaction;
  del(key: string): IRedisTransaction;
  exists(key: string): IRedisTransaction;
  incr(key: string): IRedisTransaction;
  incrby(key: string, increment: number): IRedisTransaction;
  decr(key: string): IRedisTransaction;
  decrby(key: string, decrement: number): IRedisTransaction;
  expire(key: string, seconds: number): IRedisTransaction;
  ttl(key: string): IRedisTransaction;
  sadd(key: string, ...members: string[]): IRedisTransaction;
  smembers(key: string): IRedisTransaction;
  sinter(...keys: string[]): IRedisTransaction;
  srem(key: string, ...members: string[]): IRedisTransaction;
  exec(): Promise<any[]>;
}

/**
 * Redis cache adapter implementation
 */
export class RedisCache extends CacheAdapter {
  private readonly redisClient: IRedisClient;
  private readonly redisConfig: RedisConfig;
  private isConnected: boolean = false;

  constructor(cacheConfig: CacheConfig, redisConfig: RedisConfig, redisClient: IRedisClient) {
    super(cacheConfig);
    this.redisConfig = redisConfig;
    this.redisClient = redisClient;
  }

  /**
   * Initializes the Redis connection
   */
  async initialize(): Promise<void> {
    try {
      // Test connection with a simple ping-like operation
      await this.redisClient.exists('__connection_test__');
      this.isConnected = true;
    } catch (error) {
      this.isConnected = false;
      const err = error as Error;
      throw new Error(`Failed to connect to Redis: ${err.message}`);
    }
  }

  /**
   * Disconnects from Redis
   */
  async disconnect(): Promise<void> {
    if (this.isConnected) {
      await this.redisClient.disconnect();
      this.isConnected = false;
    }
  }

  /**
   * Gets connection status
   */
  isConnectionHealthy(): boolean {
    return this.isConnected;
  }

  /**
   * Implementation of doGet for Redis
   */
  protected async doGet<T>(key: string): Promise<T | null> {
    this.ensureConnected();
    
    const value = await this.redisClient.get(key);
    if (value === null) {
      return null;
    }

    const deserializedValue = await this.deserialize<T>(value);
    return deserializedValue;
  }

  /**
   * Implementation of doSet for Redis
   */
  protected async doSet(key: string, value: any, ttl: number): Promise<void> {
    this.ensureConnected();
    
    const serializedValue = typeof value === 'string' ? value : JSON.stringify(value);
    await this.redisClient.set(key, serializedValue, ttl);
  }

  /**
   * Implementation of doDelete for Redis
   */
  protected async doDelete(key: string): Promise<void> {
    this.ensureConnected();
    await this.redisClient.del(key);
  }

  /**
   * Implementation of doExists for Redis
   */
  protected async doExists(key: string): Promise<boolean> {
    this.ensureConnected();
    const result = await this.redisClient.exists(key);
    return result === 1;
  }

  /**
   * Implementation of doClear for Redis
   */
  protected async doClear(): Promise<void> {
    this.ensureConnected();
    await this.redisClient.flushall();
  }

  /**
   * Implementation of doKeys for Redis
   */
  protected async doKeys(pattern: string): Promise<readonly string[]> {
    this.ensureConnected();
    return this.redisClient.keys(pattern);
  }

  /**
   * Implementation of doIncrement for Redis
   */
  protected async doIncrement(key: string, delta: number): Promise<number> {
    this.ensureConnected();
    
    if (delta === 1) {
      return this.redisClient.incr(key);
    } else {
      return this.redisClient.incrby(key, delta);
    }
  }

  /**
   * Implementation of doDecrement for Redis
   */
  protected async doDecrement(key: string, delta: number): Promise<number> {
    this.ensureConnected();
    
    if (delta === 1) {
      return this.redisClient.decr(key);
    } else {
      return this.redisClient.decrby(key, delta);
    }
  }

  /**
   * Implementation of doExpire for Redis
   */
  protected async doExpire(key: string, ttl: number): Promise<boolean> {
    this.ensureConnected();
    const result = await this.redisClient.expire(key, ttl);
    return result === 1;
  }

  /**
   * Implementation of doTtl for Redis
   */
  protected async doTtl(key: string): Promise<number> {
    this.ensureConnected();
    return this.redisClient.ttl(key);
  }

  /**
   * Implementation of doSetTags for Redis
   */
  protected async doSetTags(key: string, tags: readonly string[]): Promise<void> {
    this.ensureConnected();
    
    const pipeline = this.redisClient.pipeline();
    
    // Add the key to each tag set
    for (const tag of tags) {
      const tagKey = this.getTagKey(tag);
      pipeline.sadd(tagKey, key);
    }
    
    await pipeline.exec();
  }

  /**
   * Implementation of doGetKeysByTags for Redis
   */
  protected async doGetKeysByTags(tags: readonly string[]): Promise<readonly string[]> {
    this.ensureConnected();
    
    if (tags.length === 0) {
      return [];
    }
    
    if (tags.length === 1) {
      const tagKey = this.getTagKey(tags[0]);
      return this.redisClient.smembers(tagKey);
    }
    
    // Get intersection of all tag sets
    const tagKeys = tags.map(tag => this.getTagKey(tag));
    return this.redisClient.sinter(...tagKeys);
  }

  /**
   * Bulk operations using Redis pipelines for better performance
   */
  async getMultiple<T>(keys: readonly string[]): Promise<Map<string, T | null>> {
    this.ensureConnected();
    
    if (keys.length === 0) {
      return new Map();
    }

    const pipeline = this.redisClient.pipeline();
    const prefixedKeys = keys.map(key => this.getPrefixedKey(key));
    
    prefixedKeys.forEach(key => pipeline.get(key));
    
    const results = await pipeline.exec();
    const resultMap = new Map<string, T | null>();
    
    for (let i = 0; i < keys.length; i++) {
      const originalKey = keys[i];
      const value = results[i];
      
      if (value === null) {
        this.recordMiss(originalKey);
        resultMap.set(originalKey, null);
      } else {
        try {
          const deserializedValue = await this.deserialize<T>(value);
          this.recordHit(originalKey);
          resultMap.set(originalKey, deserializedValue);
        } catch (error) {
          const err = error as Error;
          console.warn(`Failed to deserialize cache value for key ${originalKey}: ${err.message}`);
          this.recordMiss(originalKey);
          resultMap.set(originalKey, null);
          // Clean up corrupted entry in background
          this.delete(originalKey).catch(cleanupError => {
            console.error(`Failed to clean up corrupted cache entry for key ${originalKey}:`, cleanupError);
          });
        }
      }
    }
    
    return resultMap;
  }

  /**
   * Bulk set operations using Redis pipelines
   */
  async setMultiple<T>(entries: Map<string, T>, ttl?: number): Promise<void> {
    this.ensureConnected();
    
    if (entries.size === 0) {
      return;
    }

    const pipeline = this.redisClient.pipeline();
    const actualTtl = ttl ?? this.config.defaultTtl;
    
    for (const [key, value] of entries) {
      const prefixedKey = this.getPrefixedKey(key);
      const serializedValue = await this.serialize(value);
      pipeline.set(prefixedKey, serializedValue, actualTtl);
    }
    
    await pipeline.exec();
  }

  /**
   * Atomic transactions for cache operations
   */
  async atomicOperation<T>(operation: (transaction: IRedisTransaction) => Promise<T>): Promise<T> {
    this.ensureConnected();
    
    const transaction = this.redisClient.multi();
    const result = await operation(transaction);
    await transaction.exec();
    return result;
  }

  /**
   * Cache warming - preloads frequently accessed data
   */
  async warmCache<T>(entries: Map<string, T>, ttl?: number): Promise<void> {
    await this.setMultiple(entries, ttl);
  }

  /**
   * Gets the tag key for organizing cache entries
   */
  private getTagKey(tag: string): string {
    return `${this.config.keyPrefix}tag:${tag}`;
  }

  /**
   * Ensures Redis connection is active
   */
  private ensureConnected(): void {
    if (!this.isConnected) {
      throw new Error('Redis client is not connected');
    }
  }

  /**
   * Health check for Redis connection
   */
  async healthCheck(): Promise<{ healthy: boolean; latency?: number; error?: string }> {
    try {
      const start = Date.now();
      await this.redisClient.exists('__health_check__');
      const latency = Date.now() - start;
      
      return {
        healthy: true,
        latency
      };
    } catch (error) {
      const err = error as Error
      return {
        healthy: false,
        error: err.message
      };
    }
  }

  /**
   * Gets memory usage statistics from Redis
   */
  async getMemoryInfo(): Promise<Record<string, any>> {
    // This would typically use Redis INFO command
    // For now, return placeholder data
    return {
      usedMemory: 0,
      maxMemory: 0,
      memoryUsagePercent: 0
    };
  }

  /**
   * Cleans up expired entries and optimizes memory usage
   */
  async cleanup(): Promise<void> {
    // Redis handles TTL cleanup automatically
    // This method can be used for custom cleanup logic
    
    // Remove empty tag sets
    const tagPattern = `${this.config.keyPrefix}tag:*`;
    const tagKeys = await this.redisClient.keys(tagPattern);
    
    const pipeline = this.redisClient.pipeline();
    for (const tagKey of tagKeys) {
      const members = await this.redisClient.smembers(tagKey);
      if (members.length === 0) {
        pipeline.del(tagKey);
      }
    }
    
    await pipeline.exec();
  }
}

import Redis, { RedisOptions } from 'ioredis';
import { CacheConfiguration, CacheEntryMetadata } from '@/types/shared/infrastructure/caching';
import { 
  ICacheHealthChecker, 
  ICacheMetricsCollector, 
  ICacheSerializer, 
  ICacheStrategy 
} from '../interfaces/ICache';
import { BaseCacheAdapter } from '../core/BaseCacheAdapter';

/**
 * Redis cache implementation - single responsibility for Redis operations
 */
export class RedisCache extends BaseCacheAdapter {
  private client?: Redis;
  private readonly redisOptions: RedisOptions;

  constructor(
    name: string,
    config: CacheConfiguration,
    serializer: ICacheSerializer,
    strategy: ICacheStrategy,
    healthChecker: ICacheHealthChecker,
    metricsCollector: ICacheMetricsCollector
  ) {
    super(name, config, serializer, strategy, healthChecker, metricsCollector);
    
    this.redisOptions = this.parseConnectionString(config.connectionString || 'redis://localhost:6379');
  }

  async connect(): Promise<void> {
    if (this.connected) {
      return;
    }

    try {
      this.client = new Redis({
        ...this.redisOptions,
        connectTimeout: this.config.connectionTimeout,
        commandTimeout: this.config.operationTimeout,
        retryDelayOnFailover: this.config.retryDelay,
        maxRetriesPerRequest: this.config.retryAttempts,
        lazyConnect: true
      });

      this.setupEventHandlers();
      
      await this.client.connect();
      this.connected = true;
    } catch (error) {
      throw new Error(`Failed to connect to Redis: ${error}`);
    }
  }

  async disconnect(): Promise<void> {
    if (this.client) {
      await this.client.quit();
      this.client = undefined;
      this.connected = false;
    }
  }

  isConnected(): boolean {
    return this.connected && this.client?.status === 'ready';
  }

  protected async performGet<T>(key: string): Promise<{ value: T; metadata: CacheEntryMetadata } | null> {
    if (!this.client) {
      throw new Error('Redis client not connected');
    }

    const pipeline = this.client.pipeline();
    pipeline.hgetall(key);
    pipeline.hincrby(key, 'hits', 1);
    pipeline.hset(key, 'lastAccessed', new Date().toISOString());

    const results = await pipeline.exec();
    
    if (!results || !results[0] || !results[0][1]) {
      return null;
    }

    const data = results[0][1] as Record<string, string>;
    
    if (!data.value || !data.metadata) {
      return null;
    }

    // Check expiration
    if (data.expiresAt) {
      const expiresAt = new Date(data.expiresAt);
      if (expiresAt <= new Date()) {
        await this.client.del(key);
        return null;
      }
    }

    const value = this.serializer.deserialize<T>(data.value);
    const metadata: CacheEntryMetadata = JSON.parse(data.metadata);

    return { value, metadata };
  }

  protected async performSet<T>(key: string, value: T, metadata: CacheEntryMetadata): Promise<void> {
    if (!this.client) {
      throw new Error('Redis client not connected');
    }

    const serializedValue = this.serializer.serialize(value);
    const serializedMetadata = JSON.stringify(metadata);

    const pipeline = this.client.pipeline();
    
    pipeline.hset(key, {
      value: serializedValue,
      metadata: serializedMetadata
    });

    // Set expiration if specified
    if (metadata.expiresAt) {
      const ttlSeconds = Math.max(1, Math.floor((metadata.expiresAt.getTime() - Date.now()) / 1000));
      pipeline.expire(key, ttlSeconds);
    }

    await pipeline.exec();
  }

  protected async performDelete(key: string): Promise<void> {
    if (!this.client) {
      throw new Error('Redis client not connected');
    }

    await this.client.del(key);
  }

  protected async performExists(key: string): Promise<boolean> {
    if (!this.client) {
      throw new Error('Redis client not connected');
    }

    const exists = await this.client.exists(key);
    return exists === 1;
  }

  protected async performClear(): Promise<void> {
    if (!this.client) {
      throw new Error('Redis client not connected');
    }

    const pattern = `${this.config.keyPrefix}:*`;
    const keys = await this.client.keys(pattern);
    
    if (keys.length > 0) {
      await this.client.del(...keys);
    }
  }

  protected async performKeys(pattern?: string): Promise<string[]> {
    if (!this.client) {
      throw new Error('Redis client not connected');
    }

    const searchPattern = pattern 
      ? `${this.config.keyPrefix}:${pattern}` 
      : `${this.config.keyPrefix}:*`;

    const keys = await this.client.keys(searchPattern);
    
    // Remove prefix from keys
    return keys.map(key => key.replace(`${this.config.keyPrefix}:`, ''));
  }

  /**
   * Redis-specific methods
   */
  async increment(key: string, delta: number = 1): Promise<{ success: boolean; value?: number; error?: Error; operationTime: number }> {
    const startTime = Date.now();
    const normalizedKey = this.normalizeKey(key);

    try {
      if (!this.client) {
        throw new Error('Redis client not connected');
      }

      const result = await this.client.hincrby(normalizedKey, 'value', delta);
      
      return {
        success: true,
        value: result,
        operationTime: Date.now() - startTime
      };
    } catch (error) {
      return {
        success: false,
        error: error as Error,
        operationTime: Date.now() - startTime
      };
    }
  }

  async setExpiration(key: string, ttlSeconds: number): Promise<boolean> {
    if (!this.client) {
      return false;
    }

    const normalizedKey = this.normalizeKey(key);
    const result = await this.client.expire(normalizedKey, ttlSeconds);
    return result === 1;
  }

  async getTtl(key: string): Promise<number> {
    if (!this.client) {
      return -1;
    }

    const normalizedKey = this.normalizeKey(key);
    return await this.client.ttl(normalizedKey);
  }

  private parseConnectionString(connectionString: string): RedisOptions {
    try {
      const url = new URL(connectionString);
      
      return {
        host: url.hostname,
        port: parseInt(url.port) || 6379,
        password: url.password || undefined,
        db: url.pathname ? parseInt(url.pathname.substring(1)) : 0,
        username: url.username || undefined
      };
    } catch (error) {
      throw new Error(`Invalid Redis connection string: ${connectionString}`);
    }
  }

  private setupEventHandlers(): void {
    if (!this.client) return;

    this.client.on('connect', () => {
      console.log(`Redis cache '${this.name}' connected`);
    });

    this.client.on('ready', () => {
      this.connected = true;
      console.log(`Redis cache '${this.name}' ready`);
    });

    this.client.on('error', (error) => {
      console.error(`Redis cache '${this.name}' error:`, error);
      this.metricsCollector.recordError('connection', error);
    });

    this.client.on('close', () => {
      this.connected = false;
      console.log(`Redis cache '${this.name}' connection closed`);
    });

    this.client.on('reconnecting', () => {
      console.log(`Redis cache '${this.name}' reconnecting...`);
    });
  }
}


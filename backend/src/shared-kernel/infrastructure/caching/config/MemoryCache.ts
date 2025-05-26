
import { 
  CacheConfiguration, 
  CacheOperationResult, 
  CacheOperationOptions,
  CacheEntry,
  CacheEntryMetadata
} from '@/types/shared/infrastructure/caching';
import { ICache, ICacheMetricsCollector } from '../interfaces/ICache';
import { CacheCore } from '../core/CacheCore';
import { CacheOperationExecutor, GetCommand, SetCommand, DeleteCommand, ClearCommand } from '../core/CacheOperationExecutor';
import { EvictionStrategyFactory } from '../strategies/eviction/EvictionStrategyFactory';
import { SerializerFactory } from '../strategies/serialization/SerializerFactory';
import { CleanupScheduler } from '../services/CleanupScheduler';
import { CacheEventPublisher } from '../events/CacheEventPublisher';
import { MetricsCacheDecorator, ValidationCacheDecorator, EventCacheDecorator } from '../decorators/MetricsCacheDecorator';
import { CacheMetricsCollector } from './CacheMetricsCollector';

/**
 * Memory cache implementation - composed from specialized components
 */
export class MemoryCache implements ICache {
  public readonly name: string;
  private core!: CacheCore;
  private executor!: CacheOperationExecutor;
  private cleanupScheduler!: CleanupScheduler;
  private eventPublisher!: CacheEventPublisher;
  private metricsCollector!: CacheMetricsCollector;
  private cache!: ICache;

  constructor(
    name: string,
    private readonly config: CacheConfiguration
  ) {
    this.name = name;
  }

  async initialize(): Promise<void> {
    // Initialize core components
    this.core = new CacheCore();
    this.executor = new CacheOperationExecutor(this.core);
    this.eventPublisher = new CacheEventPublisher();
    this.metricsCollector = new CacheMetricsCollector();

    // Initialize eviction strategy and cleanup
    const evictionStrategy = EvictionStrategyFactory.createStrategy(this.config.evictionPolicy);
    this.cleanupScheduler = new CleanupScheduler(
      this.core,
      evictionStrategy,
      this.metricsCollector,
      {
        cleanupIntervalMs: 60000, // 1 minute
        evictionIntervalMs: 30000, // 30 seconds  
        maxCapacity: this.config.maxKeys,
        evictionBatchSize: Math.max(1, Math.floor(this.config.maxKeys * 0.1))
      }
    );

    // Create decorated cache with cross-cutting concerns
    let decoratedCache: ICache = new BasicMemoryCache(this.executor, this.config);
    
    // Apply decorators
    decoratedCache = new MetricsCacheDecorator(decoratedCache, this.metricsCollector);
    decoratedCache = new ValidationCacheDecorator(decoratedCache);
    decoratedCache = new EventCacheDecorator(decoratedCache, this.eventPublisher);

    this.cache = decoratedCache;

    // Start cleanup scheduler
    this.cleanupScheduler.start();
  }

  async get<T>(key: string): Promise<CacheOperationResult<T>> {
    return this.cache.get<T>(key);
  }

  async set<T>(key: string, value: T, options?: CacheOperationOptions): Promise<CacheOperationResult<void>> {
    return this.cache.set(key, value, options);
  }

  async delete(key: string): Promise<CacheOperationResult<void>> {
    return this.cache.delete(key);
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

  getMetricsCollector(): ICacheMetricsCollector {
    return this.metricsCollector;
  }

  getEventPublisher(): CacheEventPublisher {
    return this.eventPublisher;
  }

  async shutdown(): Promise<void> {
    this.cleanupScheduler.stop();
    await this.clear();
  }
}

/**
 * Basic memory cache implementation - core operations only
 */
class BasicMemoryCache implements ICache {
  public readonly name: string;
  private readonly serializer;

  constructor(
    private readonly executor: CacheOperationExecutor,
    private readonly config: CacheConfiguration
  ) {
    this.name = config.keyPrefix || 'memory-cache';
    this.serializer = SerializerFactory.createSerializer(config.serialization);
  }

  async get<T>(key: string): Promise<CacheOperationResult<T>> {
    const command = new GetCommand<T>(this.normalizeKey(key));
    return this.executor.execute(command);
  }

  async set<T>(key: string, value: T, options?: CacheOperationOptions): Promise<CacheOperationResult<void>> {
    const normalizedKey = this.normalizeKey(key);
    const entry = this.createEntry(normalizedKey, value, options);
    const command = new SetCommand(normalizedKey, value, entry);
    return this.executor.execute(command);
  }

  async delete(key: string): Promise<CacheOperationResult<void>> {
    const command = new DeleteCommand(this.normalizeKey(key));
    return this.executor.execute(command);
  }

  async exists(key: string): Promise<boolean> {
    // Direct call since this is a simple query
    return this.executor['core'].exists(this.normalizeKey(key));
  }

  async clear(): Promise<CacheOperationResult<void>> {
    const command = new ClearCommand();
    return this.executor.execute(command);
  }

  async keys(pattern?: string): Promise<string[]> {
    // Direct call since this is a simple query
    return this.executor['core'].keys(pattern);
  }

  private normalizeKey(key: string): string {
    return `${this.config.keyPrefix}:${key}`;
  }

  private createEntry<T>(key: string, value: T, options?: CacheOperationOptions): CacheEntry<T> {
    const now = new Date();
    const ttl = options?.ttl ?? this.config.defaultTtl;
    const serializedValue = this.serializer.serialize(value);

    const metadata: CacheEntryMetadata = {
      key,
      createdAt: now,
      expiresAt: ttl > 0 ? new Date(now.getTime() + ttl * 1000) : undefined,
      ttl: ttl > 0 ? ttl : undefined,
      hits: 0,
      lastAccessed: now,
      size: this.serializer.getSize(serializedValue),
      tags: options?.tags ?? [],
      version: options?.version ?? 1,
      compressed: options?.compress ?? this.config.enableCompression,
      encrypted: options?.encrypt ?? this.config.enableEncryption
    };

    return {
      value,
      metadata
    };
  }
}


import { 
  CacheOperationResult, 
  CacheOperationOptions, 
  CacheEntryMetadata, 
  CacheEntry,
  CacheEvent,
  CacheStatistics,
  CacheConfiguration
} from '@/types/shared/infrastructure/caching';

/**
 * Core cache interface - basic cache operations
 */
export interface ICache {
  readonly name: string;
  get<T>(key: string): Promise<CacheOperationResult<T>>;
  set<T>(key: string, value: T, options?: CacheOperationOptions): Promise<CacheOperationResult<void>>;
  delete(key: string): Promise<CacheOperationResult<void>>;
  exists(key: string): Promise<boolean>;
  clear(): Promise<CacheOperationResult<void>>;
  keys(pattern?: string): Promise<string[]>;
}

/**
 * Core cache storage interface
 */
export interface ICacheCore {
  get<T>(key: string): Promise<CacheEntry<T> | null>;
  set<T>(key: string, entry: CacheEntry<T>): Promise<void>;
  delete(key: string): Promise<boolean>;
  exists(key: string): Promise<boolean>;
  clear(): Promise<void>;
  keys(pattern?: string): Promise<string[]>;
  size(): Promise<number>;
  getExpiredKeys(): Promise<string[]>;
  getEntriesByPriority(): Promise<Array<{ key: string; entry: CacheEntry }>>;
  evictKeys(keys: string[]): Promise<number>;
}

/**
 * Cache command interface - command pattern
 */
export interface ICacheCommand<T> {
  execute(core: ICacheCore): Promise<CacheOperationResult<T>>;
}

/**
 * Cache operation executor interface
 */
export interface ICacheOperationExecutor {
  execute<T>(command: ICacheCommand<T>): Promise<CacheOperationResult<T>>;
}

/**
 * Cache event listener interface
 */
export interface ICacheEventListener {
  onCacheEvent(event: CacheEvent): Promise<void>;
}

/**
 * Cache event publisher interface
 */
export interface ICacheEventPublisher {
  subscribe(listener: ICacheEventListener): void;
  unsubscribe(listener: ICacheEventListener): void;
  publish(event: CacheEvent): Promise<void>;
  getEventHistory(limit?: number): CacheEvent[];
  getListenerCount(): number;
  clear(): void;
  clearHistory(): void;
}

/**
 * Cache metrics collector interface
 */
export interface ICacheMetricsCollector {
  recordHit(key: string, operationTime: number): void;
  recordMiss(key: string, operationTime: number): void;
  recordSet(key: string, size: number, operationTime: number): void;
  recordDelete(key: string, operationTime: number): void;
  recordEviction(key: string, reason: string): void;
  recordError(operation: string, error: Error): void;
  getStatistics(): CacheStatistics;
  reset(): void;
}

/**
 * Cache factory interface
 */
export interface ICacheFactory {
  createCache(name: string, config: CacheConfiguration): Promise<ICache>;
}

/**
 * Cache health checker interface
 */
export interface ICacheHealthChecker {
  checkHealth(): Promise<{ healthy: boolean; responseTime: number; errors: string[] }>;
  checkCacheHealth(cacheName: string): Promise<{ healthy: boolean; responseTime: number; errors: string[] }>;
}

/**
 * Cache configuration provider interface
 */
export interface ICacheConfigurationProvider {
  getConfiguration(): CacheConfiguration;
  updateConfiguration(config: Partial<CacheConfiguration>): Promise<void>;
  getEnvironmentConfiguration(environment: string): CacheConfiguration;
  validateConfiguration(config: Partial<CacheConfiguration>): { isValid: boolean; errors: string[] };
}

/**
 * Cache configuration manager interface
 */
export interface ICacheConfigurationManager extends ICacheConfigurationProvider {
  getCacheTypeConfiguration(cacheType: 'session' | 'user' | 'api' | 'generic'): CacheConfiguration;
  resetToDefaults(): void;
  exportConfiguration(): string;
  importConfiguration(configJson: string): Promise<void>;
}

/**
 * Cache cleanup service interface
 */
export interface ICacheCleanupService {
  start(): void;
  stop(): void;
  performCleanup(): Promise<{ expiredRemoved: number; evicted: number }>;
  isActive(): boolean;
}

/**
 * Cache manager interface
 */
export interface ICacheManager {
  createCache(name: string, config: CacheConfiguration): Promise<ICache>;
  getCache(name: string): ICache;
  removeCache(name: string): Promise<void>;
  shutdown(): Promise<void>;
  getCacheNames(): string[];
  hasCaches(): boolean;
}

/**
 * Cache health service interface
 */
export interface ICacheHealthService {
  registerCache(name: string, cache: ICache): void;
  unregisterCache(name: string): void;
  checkHealth(): Promise<import('@/types/shared/infrastructure/caching').CacheHealthStatus>;
  checkCacheHealth(name: string): Promise<import('@/types/shared/infrastructure/caching').CacheHealthStatus>;
  getCacheNames(): string[];
}

/**
 * Cache metrics service interface
 */
export interface ICacheMetricsService {
  registerMetricsCollector(name: string, collector: ICacheMetricsCollector): void;
  unregisterMetricsCollector(name: string): void;
  getAggregatedMetrics(): CacheStatistics;
  getCacheMetrics(name: string): CacheStatistics | null;
  resetAllMetrics(): void;
  resetCacheMetrics(name: string): void;
}

/**
 * Cache serializer interface
 */
export interface ICacheSerializer {
  readonly format: import('@/types/shared/infrastructure/caching').CacheSerializationFormat;
  serialize<T>(data: T): string | Buffer;
  deserialize<T>(data: string | Buffer): T;
  getSize(data: string | Buffer): number;
}

/**
 * Cache eviction strategy interface
 */
export interface ICacheEvictionStrategy {
  readonly name: string;
  selectKeysToEvict(entries: Array<{ key: string; entry: CacheEntry }>, targetCount: number): string[];
  shouldEvict(entry: CacheEntry): boolean;
}

/**
 * Cache decorator interface
 */
export interface ICacheDecorator extends ICache {
  readonly decoratedCache: ICache;
}

/**
 * Cache entry builder interface
 */
export interface ICacheEntryBuilder<T> {
  withValue(value: T): ICacheEntryBuilder<T>;
  withTtl(ttl: number): ICacheEntryBuilder<T>;
  withTags(tags: string[]): ICacheEntryBuilder<T>;
  withVersion(version: number): ICacheEntryBuilder<T>;
  withCompression(enabled: boolean): ICacheEntryBuilder<T>;
  withEncryption(enabled: boolean): ICacheEntryBuilder<T>;
  build(): CacheEntry<T>;
}

/**
 * Cache operation context interface
 */
export interface ICacheOperationContext {
  readonly operationId: string;
  readonly timestamp: Date;
  readonly userId?: string;
  readonly correlationId?: string;
  readonly metadata?: Record<string, any>;
}

/**
 * Cache middleware interface
 */
export interface ICacheMiddleware {
  readonly name: string;
  readonly priority: number;
  execute<T>(
    operation: () => Promise<CacheOperationResult<T>>,
    context: ICacheOperationContext
  ): Promise<CacheOperationResult<T>>;
}

/**
 * Cache pipeline interface
 */
export interface ICachePipeline {
  addMiddleware(middleware: ICacheMiddleware): ICachePipeline;
  removeMiddleware(name: string): ICachePipeline;
  execute<T>(
    operation: () => Promise<CacheOperationResult<T>>,
    context: ICacheOperationContext
  ): Promise<CacheOperationResult<T>>;
}

/**
 * Cache transaction interface
 */
export interface ICacheTransaction {
  readonly id: string;
  set<T>(key: string, value: T, options?: CacheOperationOptions): ICacheTransaction;
  delete(key: string): ICacheTransaction;
  commit(): Promise<CacheOperationResult<void>>;
  rollback(): Promise<void>;
  isActive(): boolean;
}

/**
 * Cache batch operations interface
 */
export interface ICacheBatchOperations {
  multiGet<T>(keys: string[]): Promise<Map<string, CacheOperationResult<T>>>;
  multiSet<T>(entries: Map<string, { value: T; options?: CacheOperationOptions }>): Promise<CacheOperationResult<void>>;
  multiDelete(keys: string[]): Promise<Map<string, CacheOperationResult<void>>>;
}

/**
 * Cache configuration validator interface
 */
export interface ICacheConfigurationValidator {
  validate(config: Partial<CacheConfiguration>): { isValid: boolean; errors: string[] };
  validateEvictionPolicy(policy: import('@/types/shared/infrastructure/caching').CacheEvictionPolicy): boolean;
  validateSerializationFormat(format: import('@/types/shared/infrastructure/caching').CacheSerializationFormat): boolean;
  validateTtl(ttl: number): boolean;
  validateMaxKeys(maxKeys: number): boolean;
}

/**
 * Cache warming interface
 */
export interface ICacheWarmer {
  warmUp(keys: string[]): Promise<{ succeeded: string[]; failed: string[] }>;
  warmUpPattern(pattern: string): Promise<{ succeeded: string[]; failed: string[] }>;
  scheduleWarmUp(schedule: string, keys: string[]): void;
  cancelScheduledWarmUp(scheduleId: string): void;
}
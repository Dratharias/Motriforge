import { CacheOperationResult, CacheOperationOptions, CacheEntryMetadata, CacheBulkResult, CacheSerializationFormat, CacheEvent, CacheHealthStatus, CacheStatistics, CacheConfiguration } from "@/types/shared/infrastructure/caching";

/**
 * Core cache interface - single responsibility for basic cache operations
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
 * Enhanced cache interface with additional operations
 */
export interface IEnhancedCache extends ICache {
  getMetadata(key: string): Promise<CacheEntryMetadata | null>;
  getMultiple<T>(keys: string[]): Promise<CacheBulkResult<T>>;
  setMultiple<T>(entries: Array<{ key: string; value: T; options?: CacheOperationOptions }>): Promise<CacheBulkResult<void>>;
  deleteMultiple(keys: string[]): Promise<CacheBulkResult<void>>;
  increment(key: string, delta?: number): Promise<CacheOperationResult<number>>;
  decrement(key: string, delta?: number): Promise<CacheOperationResult<number>>;
  touch(key: string, ttl: number): Promise<CacheOperationResult<void>>;
  expire(key: string, ttl: number): Promise<CacheOperationResult<void>>;
}

/**
 * Cache strategy interface for different caching approaches
 */
export interface ICacheStrategy {
  readonly name: string;
  shouldCache(key: string, value: any): boolean;
  getTtl(key: string, value: any): number;
  getEvictionPriority(entry: CacheEntryMetadata): number;
  shouldEvict(entry: CacheEntryMetadata): boolean;
}

/**
 * Cache serializer interface
 */
export interface ICacheSerializer {
  readonly format: CacheSerializationFormat;
  serialize<T>(data: T): Buffer | string;
  deserialize<T>(data: Buffer | string): T;
  getSize(data: Buffer | string): number;
}

/**
 * Cache event listener interface
 */
export interface ICacheEventListener {
  onCacheEvent(event: CacheEvent): Promise<void>;
}

/**
 * Cache health checker interface
 */
export interface ICacheHealthChecker {
  checkHealth(): Promise<CacheHealthStatus>;
  ping(): Promise<number>;
  getConnectionInfo(): Promise<Record<string, any>>;
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
 * Cache configuration manager interface
 */
export interface ICacheConfigurationManager {
  getConfiguration(): CacheConfiguration;
  updateConfiguration(config: Partial<CacheConfiguration>): Promise<void>;
  validateConfiguration(config: CacheConfiguration): boolean;
  getEnvironmentConfiguration(environment: string): CacheConfiguration;
}

/**
 * Cache adapter interface for different cache implementations
 */
export interface ICacheAdapter extends IEnhancedCache {
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  isConnected(): boolean;
  getHealthChecker(): ICacheHealthChecker;
  getMetricsCollector(): ICacheMetricsCollector;
  subscribe(listener: ICacheEventListener): void;
  unsubscribe(listener: ICacheEventListener): void;
}

/**
 * Cache factory interface
 */
export interface ICacheFactory {
  createCache(name: string, config: CacheConfiguration): Promise<ICacheAdapter>;
  createRedisCache(config: CacheConfiguration): Promise<ICacheAdapter>;
  createMemoryCache(config: CacheConfiguration): Promise<ICacheAdapter>;
  createDistributedCache(config: CacheConfiguration): Promise<ICacheAdapter>;
}

import { ObjectId } from 'mongodb';
import { CacheStrategy } from '../enums/common';

/**
 * Cache configuration
 */
export interface CacheConfiguration {
  readonly defaultTtl: number;
  readonly maxKeys: number;
  readonly keyPrefix: string;
  readonly enableCompression: boolean;
  readonly enableEncryption: boolean;
  readonly enableMetrics: boolean;
  readonly strategy: CacheStrategy;
  readonly evictionPolicy: CacheEvictionPolicy;
  readonly serialization: CacheSerializationFormat;
  readonly connectionString?: string;
  readonly retryAttempts: number;
  readonly retryDelay: number;
  readonly connectionTimeout: number;
  readonly operationTimeout: number;
}

/**
 * Cache entry metadata
 */
export interface CacheEntryMetadata {
  readonly key: string;
  readonly createdAt: Date;
  readonly expiresAt?: Date;
  readonly ttl?: number;
  readonly hits: number;
  readonly lastAccessed: Date;
  readonly size: number;
  readonly tags: string[];
  readonly version: number;
  readonly compressed: boolean;
  readonly encrypted: boolean;
}

/**
 * Cache entry with value and metadata
 */
export interface CacheEntry<T = any> {
  readonly key: string;
  readonly value: T;
  readonly metadata: CacheEntryMetadata;
}

/**
 * Cache operation result
 */
export interface CacheOperationResult<T = any> {
  readonly success: boolean;
  readonly value?: T;
  readonly metadata?: CacheEntryMetadata;
  readonly error?: Error;
  readonly fromCache: boolean;
  readonly operationTime: number;
}

/**
 * Cache statistics
 */
export interface CacheStatistics {
  totalKeys: number;
  totalHits: number;
  totalMisses: number;
  hitRate: number;
  totalSize: number;
  averageKeySize: number;
  evictions: number;
  readonly operations: CacheOperationStats;
  topKeys: CacheKeyStats[];
}

/**
 * Cache operation statistics
 */
export interface CacheOperationStats {
  gets: number;
  sets: number;
  deletes: number;
  readonly flushes: number;
  averageGetTime: number;
  averageSetTime: number;
  averageDeleteTime: number;
}

/**
 * Cache key statistics
 */
export interface CacheKeyStats {
  readonly key: string;
  readonly hits: number;
  readonly size: number;
  readonly lastAccessed: Date;
}

/**
 * Cache health status
 */
export interface CacheHealthStatus {
  readonly healthy: boolean;
  readonly connected: boolean;
  readonly responseTime: number;
  readonly memoryUsage: number;
  readonly connectionCount: number;
  readonly errors: string[];
  readonly lastError?: Date;
}

/**
 * Cache eviction policy
 */
export enum CacheEvictionPolicy {
  LRU = 'lru',           // Least Recently Used
  LFU = 'lfu',           // Least Frequently Used
  FIFO = 'fifo',         // First In, First Out
  TTL = 'ttl',           // Time To Live
  RANDOM = 'random',     // Random eviction
  NONE = 'none'          // No eviction
}

/**
 * Cache serialization format
 */
export enum CacheSerializationFormat {
  JSON = 'json',
  MSGPACK = 'msgpack',
  PROTOBUF = 'protobuf',
  PICKLE = 'pickle',
  BINARY = 'binary'
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
  FLUSH = 'flush',
  ERROR = 'error',
  CONNECTION_LOST = 'connection_lost',
  CONNECTION_RESTORED = 'connection_restored'
}

/**
 * Cache event data
 */
export interface CacheEvent {
  readonly type: CacheEventType;
  readonly key?: string;
  readonly value?: any;
  readonly metadata?: CacheEntryMetadata;
  readonly error?: Error;
  readonly timestamp: Date;
  readonly operationTime?: number;
}

/**
 * Cache query criteria
 */
export interface CacheQueryCriteria {
  readonly pattern?: string;
  readonly tags?: string[];
  readonly minTtl?: number;
  readonly maxTtl?: number;
  readonly minHits?: number;
  readonly maxHits?: number;
  readonly createdAfter?: Date;
  readonly createdBefore?: Date;
  readonly limit?: number;
  readonly offset?: number;
}

/**
 * Cache operation options
 */
export interface CacheOperationOptions {
  readonly ttl?: number;
  readonly tags?: string[];
  readonly compress?: boolean;
  readonly encrypt?: boolean;
  readonly version?: number;
  readonly onlyIfExists?: boolean;
  readonly onlyIfNotExists?: boolean;
  readonly timeout?: number;
}

/**
 * Cache bulk operation
 */
export interface CacheBulkOperation<T = any> {
  readonly operation: 'get' | 'set' | 'delete';
  readonly key: string;
  readonly value?: T;
  readonly options?: CacheOperationOptions;
}

/**
 * Cache bulk result
 */
export interface CacheBulkResult<T = any> {
  readonly successful: CacheOperationResult<T>[];
  readonly failed: Array<{ key: string; error: Error }>;
  readonly totalOperationTime: number;
}


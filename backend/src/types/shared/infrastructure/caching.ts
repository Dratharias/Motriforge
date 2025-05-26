
import { CacheStrategy } from '@/types/shared/enums/common';

export enum CacheEvictionPolicy {
  LRU = 'lru',
  LFU = 'lfu',
  TTL = 'ttl',
  FIFO = 'fifo',
  RANDOM = 'random',
  NONE = 'none'
}

export enum CacheSerializationFormat {
  JSON = 'json',
  BINARY = 'binary'
}

export enum CacheEventType {
  HIT = 'hit',
  MISS = 'miss',
  SET = 'set',
  DELETE = 'delete',
  FLUSH = 'flush',
  EVICTION = 'eviction',
  ERROR = 'error'
}

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
  readonly retryAttempts: number;
  readonly retryDelay: number;
  readonly connectionTimeout: number;
  readonly operationTimeout: number;
  readonly connectionString?: string;
}

export interface CacheEntryMetadata {
  readonly key: string;
  readonly createdAt: Date;
  readonly expiresAt?: Date;
  readonly ttl?: number;
  hits: number;
  lastAccessed: Date;
  readonly size: number;
  readonly tags: string[];
  readonly version: number;
  readonly compressed: boolean;
  readonly encrypted: boolean;
}

export interface CacheEntry<T = any> {
  readonly value: T;
  readonly metadata: CacheEntryMetadata;
}

export interface CacheOperationOptions {
  readonly ttl?: number;
  readonly tags?: string[];
  readonly version?: number;
  readonly compress?: boolean;
  readonly encrypt?: boolean;
}

export interface CacheOperationResult<T> {
  readonly success: boolean;
  readonly value?: T;
  readonly metadata?: CacheEntryMetadata;
  readonly error?: Error;
  readonly fromCache?: boolean;
  readonly operationTime?: number;
}

export interface CacheEvent {
  readonly type: CacheEventType;
  readonly key?: string;
  readonly value?: any;
  readonly metadata?: CacheEntryMetadata;
  readonly error?: Error;
  readonly timestamp: Date;
  readonly operationTime?: number;
}

export interface CacheHealthStatus {
  readonly healthy: boolean;
  readonly connected: boolean;
  readonly responseTime: number;
  readonly memoryUsage: number;
  readonly connectionCount: number;
  readonly errors: string[];
  readonly lastError?: Date;
}

export interface CacheKeyStats {
  readonly key: string;
  readonly hits: number;
  readonly size: number;
  readonly lastAccessed: Date;
}

export interface CacheStatistics {
  readonly totalKeys: number;
  readonly totalHits: number;
  readonly totalMisses: number;
  readonly hitRate: number;
  readonly totalSize: number;
  readonly averageKeySize: number;
  readonly evictions: number;
  readonly operations: {
    readonly gets: number;
    readonly sets: number;
    readonly deletes: number;
    readonly flushes: number;
    readonly averageGetTime: number;
    readonly averageSetTime: number;
    readonly averageDeleteTime: number;
  };
  readonly topKeys: CacheKeyStats[];
}
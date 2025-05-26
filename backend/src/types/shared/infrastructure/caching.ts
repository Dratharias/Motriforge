
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
  defaultTtl: number;
  maxKeys: number;
  keyPrefix: string;
  enableCompression: boolean;
  enableEncryption: boolean;
  enableMetrics: boolean;
  strategy: CacheStrategy;
  evictionPolicy: CacheEvictionPolicy;
  serialization: CacheSerializationFormat;
  retryAttempts: number;
  retryDelay: number;
  connectionTimeout: number;
  operationTimeout: number;
  connectionString?: string;
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
  totalKeys: number;
  totalHits: number;
  totalMisses: number;
  hitRate: number;
  totalSize: number;
  averageKeySize: number;
  evictions: number;
  operations: {
    gets: number;
    sets: number;
    deletes: number;
    flushes: number;
    averageGetTime: number;
    averageSetTime: number;
    averageDeleteTime: number;
  };
  topKeys: CacheKeyStats[];
}
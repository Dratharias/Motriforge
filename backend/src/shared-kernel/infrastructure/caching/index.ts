
// Main facade and convenience functions
export { 
  CacheFacade, 
  initializeCache, 
  getCache, 
  getCacheFacade, 
  shutdownCache 
} from './CacheFacade';

// Configuration
export { CacheConfigurationManager } from './CacheConfigurationManager';

// Core interfaces
export type { 
  ICache, 
  ICacheCore, 
  ICacheCommand, 
  ICacheOperationExecutor,
  ICacheEventListener,
  ICacheEventPublisher,
  ICacheMetricsCollector,
  ICacheFactory
} from './interfaces/ICache';

// Core components
export { CacheCore } from './core/CacheCore';
export { 
  CacheOperationExecutor,
  GetCommand,
  SetCommand,
  DeleteCommand,
  ClearCommand,
  BulkGetCommand
} from './core/CacheOperationExecutor';

// Decorators
export { MetricsCacheDecorator } from './decorators/MetricsCacheDecorator';
export { ValidationCacheDecorator } from './decorators/MetricsCacheDecorator';
export { EventCacheDecorator } from './decorators/MetricsCacheDecorator';

// Strategies
export type { IEvictionStrategy } from './strategies/eviction/IEvictionStrategy';
export { LRUEvictionStrategy } from './strategies/eviction/LRUEvictionStrategy';
export { LFUEvictionStrategy } from './strategies/eviction/LRUEvictionStrategy';
export { TTLEvictionStrategy } from './strategies/eviction/LRUEvictionStrategy';
export { EvictionStrategyFactory } from './strategies/eviction/LRUEvictionStrategy';

export type { ICacheSerializer } from './strategies/serialization/ICacheSerializer';
export { JsonSerializer } from './strategies/serialization/JsonSerializer';
export { BinarySerializer } from './strategies/serialization/JsonSerializer';
export { SerializerFactory } from './strategies/serialization/JsonSerializer';

// Services
export { CacheHealthService } from './services/CacheHealthService';
export { CacheMetricsService } from './services/CacheMetricsService';
export { CacheManager } from './services/CacheManager';
export { CleanupScheduler } from './services/CleanupScheduler';

// Events
export { CacheEventPublisher } from './events/CacheEventPublisher';
export { CacheEventTypes } from './events/CacheEventPublisher';

// Factory and implementations
export { CacheFactory } from './config/CacheFactory';
export { CacheMetricsCollector } from './config/CacheMetricsCollector';

// Types (re-export from types package)
export type {
  CacheConfiguration,
  CacheEntry,
  CacheEntryMetadata,
  CacheOperationOptions,
  CacheOperationResult,
  CacheEvent,
  CacheHealthStatus,
  CacheKeyStats,
  CacheStatistics
} from '@/types/shared/infrastructure/caching';

export {
  CacheEvictionPolicy,
  CacheSerializationFormat,
  CacheEventType
} from '@/types/shared/infrastructure/caching';
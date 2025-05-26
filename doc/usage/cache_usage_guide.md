# Cache System Usage Guide

## 🚀 Quick Start

```typescript
import { CacheConfigurationManager, CacheFactory } from '@/shared-kernel/infrastructure/caching';

// Initialize cache configuration
const configManager = new CacheConfigurationManager({
  defaultTtl: 3600, // 1 hour
  maxKeys: 10000,
  keyPrefix: 'app-cache',
  evictionPolicy: CacheEvictionPolicy.LRU
});

// Create cache instance
const factory = new CacheFactory();
const cache = await factory.createCache('default', configManager.getConfiguration());

// Basic usage
await cache.set('user:123', { name: 'John Doe', email: 'john@example.com' });
const result = await cache.get('user:123');
```

## 🏗️ Architecture Overview

The new cache system is decomposed into specialized components:

```
CacheFactory (Cache Creation)
├── CacheManager (Cache Lifecycle)
├── CacheHealthService (Health Monitoring)
├── CacheMetricsService (Metrics Aggregation)
└── CacheConfigurationManager (Configuration)

MemoryCache (Composed Implementation)
├── CacheCore (Basic Storage)
├── CacheOperationExecutor (Command Pattern)
├── CleanupScheduler (Background Tasks)
├── Decorators (Cross-Cutting Concerns)
│   ├── MetricsCacheDecorator
│   ├── ValidationCacheDecorator
│   └── EventCacheDecorator
└── Strategies
    ├── EvictionStrategy (LRU/LFU/TTL)
    └── SerializationStrategy (JSON/Binary)
```

## 📋 Component Usage

### 1. **Configuration Management**
```typescript
import { CacheConfigurationManager, CacheConfigurationBuilder } from '@/shared-kernel/infrastructure/caching';

// Basic configuration
const configManager = new CacheConfigurationManager();

// Get environment-specific config
const prodConfig = configManager.getEnvironmentConfiguration('production');

// Get cache type-specific config
const sessionConfig = configManager.getCacheTypeConfiguration('session');
const userConfig = configManager.getCacheTypeConfiguration('user');
const apiConfig = configManager.getCacheTypeConfiguration('api');

// Update configuration
await configManager.updateConfiguration({
  defaultTtl: 1800,
  maxKeys: 20000
});

// Builder pattern
const customConfig = CacheConfigurationBuilder
  .create()
  .withDefaultTtl(3600)
  .withMaxKeys(50000)
  .withKeyPrefix('custom-app')
  .enableCompression()
  .enableEncryption()
  .withRetryPolicy(5, 2000)
  .buildComplete();

// Export/Import configurations
const backup = configManager.exportConfiguration();
await configManager.importConfiguration(backup);
```

### 2. **Cache Creation and Management**
```typescript
import { CacheFactory, CacheManager, CacheHealthService, CacheMetricsService } from '@/shared-kernel/infrastructure/caching';

// Create services
const healthService = new CacheHealthService();
const metricsService = new CacheMetricsService();
const cacheManager = new CacheManager(healthService, metricsService);

// Create different cache types
const configManager = new CacheConfigurationManager();

// Session cache
const sessionCache = await cacheManager.createCache(
  'sessions', 
  configManager.getCacheTypeConfiguration('session')
);

// User cache  
const userCache = await cacheManager.createCache(
  'users',
  configManager.getCacheTypeConfiguration('user')
);

// API cache
const apiCache = await cacheManager.createCache(
  'api',
  configManager.getCacheTypeConfiguration('api')
);
```

### 3. **Basic Cache Operations**
```typescript
// Set with options
await cache.set('key', data, {
  ttl: 1800, // 30 minutes
  tags: ['user', 'profile'],
  version: 1
});

// Get with result details
const result = await cache.get('key');
if (result.success) {
  console.log('Value:', result.value);
  console.log('From cache:', result.fromCache);
  console.log('Operation time:', result.operationTime);
}

// Check existence
const exists = await cache.exists('key');

// Delete
await cache.delete('key');

// Clear all
await cache.clear();

// Get keys by pattern
const keys = await cache.keys('user:*');
```

### 4. **Health Monitoring**
```typescript
import { CacheHealthService, CacheMetricsService } from '@/shared-kernel/infrastructure/caching';

const healthService = new CacheHealthService();
const metricsService = new CacheMetricsService();

// Register caches for monitoring
healthService.registerCache('sessions', sessionCache);
healthService.registerCache('users', userCache);

// Check overall health
const health = await healthService.checkHealth();
console.log('Cache healthy:', health.healthy);
console.log('Response time:', health.responseTime);
console.log('Memory usage:', health.memoryUsage);

// Get detailed metrics
const metrics = metricsService.getAggregatedMetrics();
console.log('Hit rate:', metrics.hitRate);
console.log('Total operations:', metrics.operations);
console.log('Top keys:', metrics.topKeys);
```

### 5. **Event Handling**
```typescript
import { CacheEventType } from '@/shared-kernel/infrastructure/caching';

// Create event listener
class CacheEventLogger {
  async onCacheEvent(event: CacheEvent): Promise<void> {
    if (event.type === CacheEventType.MISS) {
      console.log(`Cache miss for key: ${event.key}`);
    }
    
    if (event.type === CacheEventType.EVICTION) {
      console.log(`Cache eviction for key: ${event.key}`);
    }
  }
}

// Subscribe to events (if using MemoryCache directly)
const memoryCache = cache as any;
if (memoryCache.getEventPublisher) {
  memoryCache.getEventPublisher().subscribe(new CacheEventLogger());
}
```

### 6. **Advanced Configuration**
```typescript
// Validation
const configManager = new CacheConfigurationManager();
const validation = configManager.validateConfiguration({
  defaultTtl: -1 // Invalid
});

if (!validation.isValid) {
  console.log('Validation errors:', validation.errors);
}

// Environment-specific setup
const environment = process.env.NODE_ENV || 'development';
const envConfig = configManager.getEnvironmentConfiguration(environment);
const cache = await factory.createCache('env-cache', envConfig);
```

## 🎯 Common Patterns

### Application Service Pattern
```typescript
export class UserApplicationService {
  private readonly userCache: ICache;
  
  constructor(cacheManager: CacheManager, configManager: CacheConfigurationManager) {
    this.userCache = cacheManager.getCache('users');
  }
  
  async getUser(userId: string): Promise<User> {
    const cacheKey = `user:${userId}`;
    
    // Try cache first
    const cached = await this.userCache.get<User>(cacheKey);
    if (cached.success) {
      return cached.value!;
    }
    
    // Load from database
    const user = await this.userRepository.findById(userId);
    
    // Cache the result
    await this.userCache.set(cacheKey, user, {
      ttl: 3600,
      tags: ['user', 'profile']
    });
    
    return user;
  }
  
  async updateUser(userId: string, data: UpdateUserData): Promise<void> {
    await this.userRepository.update(userId, data);
    
    // Invalidate cache
    await this.userCache.delete(`user:${userId}`);
  }
}
```

### Multi-Cache Setup Pattern
```typescript
export class CacheSetupService {
  private cacheManager: CacheManager;
  private configManager: CacheConfigurationManager;

  constructor() {
    this.configManager = new CacheConfigurationManager();
    const healthService = new CacheHealthService();
    const metricsService = new CacheMetricsService();
    this.cacheManager = new CacheManager(healthService, metricsService);
  }

  async initializeCaches(): Promise<void> {
    // Create specialized caches
    await this.cacheManager.createCache(
      'sessions',
      this.configManager.getCacheTypeConfiguration('session')
    );

    await this.cacheManager.createCache(
      'users', 
      this.configManager.getCacheTypeConfiguration('user')
    );

    await this.cacheManager.createCache(
      'api',
      this.configManager.getCacheTypeConfiguration('api')
    );
  }

  getSessionCache(): ICache {
    return this.cacheManager.getCache('sessions');
  }

  getUserCache(): ICache {
    return this.cacheManager.getCache('users');
  }

  getApiCache(): ICache {
    return this.cacheManager.getCache('api');
  }
}
```

### Cache-Aside Pattern with Fallback
```typescript
export class CacheService {
  constructor(private readonly cache: ICache) {}
  
  async getWithFallback<T>(
    key: string,
    fallbackFn: () => Promise<T>,
    options?: { ttl?: number; tags?: string[] }
  ): Promise<T> {
    try {
      const cached = await this.cache.get<T>(key);
      if (cached.success) {
        return cached.value!;
      }
    } catch (error) {
      console.warn('Cache get failed, using fallback:', error);
    }
    
    // Load from fallback
    const value = await fallbackFn();
    
    // Try to cache the result
    try {
      await this.cache.set(key, value, options);
    } catch (error) {
      console.warn('Cache set failed:', error);
    }
    
    return value;
  }
}
```

## 🔧 Configuration Options

### Development
```typescript
const configManager = new CacheConfigurationManager();
const devConfig = configManager.getEnvironmentConfiguration('development');
// - defaultTtl: 300 (5 minutes)
// - maxKeys: 1000
// - enableCompression: false
// - enableEncryption: false
// - enableMetrics: true
```

### Production
```typescript
const configManager = new CacheConfigurationManager();
const prodConfig = configManager.getEnvironmentConfiguration('production');
// - defaultTtl: 3600 (1 hour)
// - maxKeys: 50000
// - enableCompression: true
// - enableEncryption: true
// - enableMetrics: true
```

### Cache Type Optimizations
```typescript
const configManager = new CacheConfigurationManager();

// Session cache - security focused
const sessionConfig = configManager.getCacheTypeConfiguration('session');
// - TTL-based eviction
// - Encryption enabled
// - 30 minute TTL

// User cache - performance focused  
const userConfig = configManager.getCacheTypeConfiguration('user');
// - LRU eviction
// - Compression enabled
// - 1 hour TTL

// API cache - frequency focused
const apiConfig = configManager.getCacheTypeConfiguration('api');
// - LFU eviction
// - Compression enabled
// - 5 minute TTL
```

## ⚡ Key Benefits

- **Decomposed Architecture** - No god objects, clear separation of concerns
- **Command Pattern** - All operations are commands for consistency and extensibility
- **Decorator Pattern** - Cross-cutting concerns (metrics, validation, events) are composable
- **Strategy Pattern** - Pluggable eviction and serialization strategies
- **Observer Pattern** - Event-driven architecture for monitoring and debugging
- **Memory-Only** - Simple, fast, no Redis dependency
- **Type-Safe** - Full TypeScript support with proper interfaces
- **Configuration Flexibility** - Environment and cache-type specific configurations
- **Health Monitoring** - Built-in health checks and metrics
- **Background Cleanup** - Automatic expired entry cleanup and capacity management
- **Testable** - Clear interfaces and dependency injection support

## 🧹 Cleanup and Management

The cache system includes automatic cleanup:
- **Expired Entry Cleanup** - Runs every 60 seconds
- **Capacity-Based Eviction** - Runs every 30 seconds when needed
- **Graceful Shutdown** - Proper cleanup on application shutdown

```typescript
// Manual cleanup
const cacheManager = new CacheManager(healthService, metricsService);
await cacheManager.shutdown();
```
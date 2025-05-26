# Cache System Usage Guide

## 🚀 Quick Start

```typescript
import { initializeCache, getCache } from '@/shared-kernel/infrastructure/caching';

// Initialize cache system
await initializeCache({
  defaultTtl: 3600, // 1 hour
  maxKeys: 10000,
  keyPrefix: 'app-cache',
  evictionPolicy: CacheEvictionPolicy.LRU
});

// Get cache instance
const cache = getCache();

// Basic usage
await cache.set('user:123', { name: 'John Doe', email: 'john@example.com' });
const result = await cache.get('user:123');
```

## 🏗️ Architecture Overview

The new cache system is decomposed into specialized components:

```
CacheFacade (Lightweight Coordinator)
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

### 1. **Basic Cache Operations**
```typescript
import { getCache } from '@/shared-kernel/infrastructure/caching';

const cache = getCache();

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
```

### 2. **Named Caches**
```typescript
import { getCacheFacade } from '@/shared-kernel/infrastructure/caching';

const facade = getCacheFacade();

// Create specialized caches
const userCache = await facade.createCache('users', {
  defaultTtl: 3600,
  maxKeys: 5000,
  evictionPolicy: CacheEvictionPolicy.LRU
});

const sessionCache = await facade.createCache('sessions', {
  defaultTtl: 1800,
  maxKeys: 1000,
  evictionPolicy: CacheEvictionPolicy.TTL
});

// Use named caches
await userCache.set('user:123', userData);
await sessionCache.set('session:abc', sessionData);
```

### 3. **Health Monitoring**
```typescript
import { getCacheFacade } from '@/shared-kernel/infrastructure/caching';

const facade = getCacheFacade();

// Check overall health
const health = await facade.getHealthStatus();
console.log('Cache healthy:', health.healthy);
console.log('Response time:', health.responseTime);
console.log('Memory usage:', health.memoryUsage);

// Get detailed metrics
const metrics = facade.getMetrics();
console.log('Hit rate:', metrics.hitRate);
console.log('Total operations:', metrics.operations);
console.log('Top keys:', metrics.topKeys);
```

### 4. **Event Handling**
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

// Subscribe to events (if accessing the underlying memory cache)
const memoryCache = facade.getNamedCache('default') as any;
if (memoryCache.getEventPublisher) {
  memoryCache.getEventPublisher().subscribe(new CacheEventLogger());
}
```

### 5. **Environment-Specific Configuration**
```typescript
import { getCacheFacade } from '@/shared-kernel/infrastructure/caching';

const facade = getCacheFacade();

// Development configuration
if (process.env.NODE_ENV === 'development') {
  await facade.createEnvironmentCache('development');
}

// Production configuration
if (process.env.NODE_ENV === 'production') {
  await facade.createEnvironmentCache('production');
}
```

## 🎯 Common Patterns

### Application Service Pattern
```typescript
export class UserApplicationService {
  private readonly cache = getCache();
  
  async getUser(userId: string): Promise<User> {
    const cacheKey = `user:${userId}`;
    
    // Try cache first
    const cached = await this.cache.get<User>(cacheKey);
    if (cached.success) {
      return cached.value!;
    }
    
    // Load from database
    const user = await this.userRepository.findById(userId);
    
    // Cache the result
    await this.cache.set(cacheKey, user, {
      ttl: 3600,
      tags: ['user', 'profile']
    });
    
    return user;
  }
  
  async updateUser(userId: string, data: UpdateUserData): Promise<void> {
    await this.userRepository.update(userId, data);
    
    // Invalidate cache
    await this.cache.delete(`user:${userId}`);
  }
}
```

### Bulk Operations Pattern
```typescript
export class DataService {
  private readonly cache = getCache();
  
  async getMultipleUsers(userIds: string[]): Promise<User[]> {
    const users: User[] = [];
    const uncachedIds: string[] = [];
    
    // Check cache for each user
    for (const userId of userIds) {
      const cached = await this.cache.get<User>(`user:${userId}`);
      if (cached.success) {
        users.push(cached.value!);
      } else {
        uncachedIds.push(userId);
      }
    }
    
    // Load uncached users from database
    if (uncachedIds.length > 0) {
      const uncachedUsers = await this.userRepository.findByIds(uncachedIds);
      
      // Cache loaded users
      for (const user of uncachedUsers) {
        await this.cache.set(`user:${user.id}`, user, { ttl: 3600 });
        users.push(user);
      }
    }
    
    return users;
  }
}
```

### Cache-Aside Pattern with Fallback
```typescript
export class CacheService {
  private readonly cache = getCache();
  
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
await initializeCache({
  defaultTtl: 300, // 5 minutes
  maxKeys: 1000,
  keyPrefix: 'dev-cache',
  evictionPolicy: CacheEvictionPolicy.LRU,
  enableMetrics: true
});
```

### Production
```typescript
await initializeCache({
  defaultTtl: 3600, // 1 hour
  maxKeys: 50000,
  keyPrefix: 'prod-cache',
  evictionPolicy: CacheEvictionPolicy.LRU,
  enableMetrics: true,
  enableCompression: false, // JSON serialization is fast enough
  serialization: CacheSerializationFormat.JSON
});
```

## ⚡ Key Benefits

- **Decomposed Architecture** - No god objects, clear separation of concerns
- **Command Pattern** - All operations are commands for consistency and extensibility
- **Decorator Pattern** - Cross-cutting concerns (metrics, validation, events) are composable
- **Strategy Pattern** - Pluggable eviction and serialization strategies
- **Observer Pattern** - Event-driven architecture for monitoring and debugging
- **Memory-Only** - Simple, fast, no Redis dependency
- **Type-Safe** - Full TypeScript support with proper interfaces
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
const facade = getCacheFacade();
await facade.shutdown();
```
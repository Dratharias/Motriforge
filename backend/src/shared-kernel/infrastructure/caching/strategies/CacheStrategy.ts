
import { CacheEntryMetadata } from '@/types/shared/infrastructure/caching';
import { ICacheStrategy } from '../interfaces/ICache';

/**
 * Default cache strategy - single responsibility for basic caching decisions
 */
export class DefaultCacheStrategy implements ICacheStrategy {
  public readonly name = 'default';

  constructor(
    private readonly defaultTtl: number = 3600, // 1 hour
    private readonly maxValueSize: number = 1024 * 1024 // 1MB
  ) {}

  shouldCache(key: string, value: any): boolean {
    // Don't cache null or undefined values
    if (value === null || value === undefined) {
      return false;
    }

    // Don't cache very large objects
    const size = this.estimateSize(value);
    if (size > this.maxValueSize) {
      return false;
    }

    // Don't cache objects with functions (not serializable)
    if (this.containsFunctions(value)) {
      return false;
    }

    return true;
  }

  getTtl(key: string, value: any): number {
    // Use different TTLs based on key patterns
    if (key.includes('session:')) {
      return 30 * 60; // 30 minutes for sessions
    }
    
    if (key.includes('user:')) {
      return 60 * 60; // 1 hour for user data
    }
    
    if (key.includes('config:')) {
      return 24 * 60 * 60; // 24 hours for configuration
    }

    return this.defaultTtl;
  }

  getEvictionPriority(entry: CacheEntryMetadata): number {
    const now = Date.now();
    const age = now - entry.createdAt.getTime();
    const timeSinceAccess = now - entry.lastAccessed.getTime();
    
    // Higher priority = more likely to be evicted
    // Combine age, access frequency, and size
    const ageFactor = age / (1000 * 60 * 60); // Age in hours
    const accessFactor = timeSinceAccess / (1000 * 60); // Time since access in minutes
    const sizeFactor = entry.size / (1024 * 1024); // Size in MB
    const hitFactor = 1 / Math.max(1, entry.hits); // Inverse of hit count
    
    return ageFactor + accessFactor + sizeFactor + hitFactor;
  }

  shouldEvict(entry: CacheEntryMetadata): boolean {
    // Evict if expired
    if (entry.expiresAt && entry.expiresAt <= new Date()) {
      return true;
    }

    // Evict if not accessed for a long time and has low hit count
    const timeSinceAccess = Date.now() - entry.lastAccessed.getTime();
    const oneDayMs = 24 * 60 * 60 * 1000;
    
    return timeSinceAccess > oneDayMs && entry.hits < 5;
  }

  private estimateSize(value: any): number {
    return JSON.stringify(value).length * 2; // Rough estimate
  }

  private containsFunctions(obj: any): boolean {
    if (typeof obj === 'function') {
      return true;
    }
    
    if (typeof obj === 'object' && obj !== null) {
      for (const value of Object.values(obj)) {
        if (this.containsFunctions(value)) {
          return true;
        }
      }
    }
    
    return false;
  }
}


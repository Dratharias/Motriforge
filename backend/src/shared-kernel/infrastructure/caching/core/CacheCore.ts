
import { CacheEntry, CacheOperationResult } from '@/types/shared/infrastructure/caching';
import { ICacheCore } from '../interfaces/ICache';

/**
 * Core cache operations - single responsibility for basic storage
 */
export class CacheCore implements ICacheCore {
  private readonly store = new Map<string, CacheEntry>();

  async get<T>(key: string): Promise<CacheEntry<T> | null> {
    const entry = this.store.get(key) as CacheEntry<T> | undefined;
    
    if (!entry) {
      return null;
    }

    // Check expiration
    if (this.isExpired(entry)) {
      this.store.delete(key);
      return null;
    }

    // Update access information
    entry.metadata.hits++;
    entry.metadata.lastAccessed = new Date();

    return entry;
  }

  async set<T>(key: string, entry: CacheEntry<T>): Promise<void> {
    this.store.set(key, entry);
  }

  async delete(key: string): Promise<boolean> {
    return this.store.delete(key);
  }

  async exists(key: string): Promise<boolean> {
    const entry = this.store.get(key);
    if (!entry) {
      return false;
    }

    if (this.isExpired(entry)) {
      this.store.delete(key);
      return false;
    }

    return true;
  }

  async clear(): Promise<void> {
    this.store.clear();
  }

  async keys(pattern?: string): Promise<string[]> {
    const keys = Array.from(this.store.keys());
    
    if (!pattern) {
      return keys;
    }

    const regex = new RegExp(pattern.replace(/\*/g, '.*'));
    return keys.filter(key => regex.test(key));
  }

  async size(): Promise<number> {
    return this.store.size;
  }

  async getExpiredKeys(): Promise<string[]> {
    const expiredKeys: string[] = [];
    const now = new Date();

    for (const [key, entry] of this.store) {
      if (entry.metadata.expiresAt && entry.metadata.expiresAt <= now) {
        expiredKeys.push(key);
      }
    }

    return expiredKeys;
  }

  async getEntriesByPriority(): Promise<Array<{ key: string; entry: CacheEntry }>> {
    return Array.from(this.store.entries()).map(([key, entry]) => ({ key, entry }));
  }

  async evictKeys(keys: string[]): Promise<number> {
    let evicted = 0;
    for (const key of keys) {
      if (this.store.delete(key)) {
        evicted++;
      }
    }
    return evicted;
  }

  private isExpired(entry: CacheEntry): boolean {
    return entry.metadata.expiresAt ? entry.metadata.expiresAt <= new Date() : false;
  }
}
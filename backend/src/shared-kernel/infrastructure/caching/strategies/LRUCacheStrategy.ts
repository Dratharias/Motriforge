import { CacheEntryMetadata } from "@/types/shared/infrastructure/caching";
import { ICacheStrategy } from "../interfaces/ICache";

/**
 * LRU (Least Recently Used) cache strategy
 */
export class LRUCacheStrategy implements ICacheStrategy {
  public readonly name = 'lru';

  constructor(private readonly defaultTtl: number = 3600) {}

  shouldCache(key: string, value: any): boolean {
    return value !== null && value !== undefined;
  }

  getTtl(key: string, value: any): number {
    return this.defaultTtl;
  }

  getEvictionPriority(entry: CacheEntryMetadata): number {
    // LRU: Higher priority for least recently used
    return entry.lastAccessed.getTime();
  }

  shouldEvict(entry: CacheEntryMetadata): boolean {
    if (entry.expiresAt && entry.expiresAt <= new Date()) {
      return true;
    }
    return false;
  }
}


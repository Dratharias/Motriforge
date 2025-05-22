import { EvictionStrategy } from './enums';

/**
 * Policy for cache behavior
 */
export interface CachePolicy {
  ttl: number;
  maxEntries?: number;
  maxSize?: number;
  evictionStrategy: EvictionStrategy;
  compressionThreshold?: number;
  refreshInterval?: number;
  staleWhileRevalidate?: number;
  staleIfError?: number;
}
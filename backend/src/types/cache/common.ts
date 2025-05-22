export interface CacheOptions {
  ttl?: number;
  tags?: string[];
  priority?: number;
  compress?: boolean;
  staleWhileRevalidate?: boolean;
  staleIfError?: boolean;
  forceRefresh?: boolean;
  waitForRefresh?: boolean;
}

/**
 * Statistics for cache operations
 */
export interface CacheStats {
  hits: number;
  misses: number;
  hitRate: number;
  errors: number;
  sets: number;
  deletes: number;
  size: number;
  itemCount: number;
  oldestEntry?: Date;
  newestEntry?: Date;
}

/**
 * Member info stored in cache
 */
export interface MemberInfo {
  userId: string;
  role: string;
  joinedAt: Date;
  permissions?: string[];
  status: string;
}
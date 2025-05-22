import { CacheHealthStatus } from "@/types/cache";

/**
 * Create a default health status
 */
export function createCacheHealthStatus(): CacheHealthStatus {
  return {
    status: 'healthy',
    hitRate: 0,
    errorRate: 0,
    availableSpace: 1,
    responseTime: 0,
    issues: []
  };
}
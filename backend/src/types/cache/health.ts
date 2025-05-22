
/**
 * Thresholds for health checks
 */
export interface HealthThresholds {
  minHitRate: number;
  maxErrorRate: number;
  minAvailableSpace: number;
  maxResponseTime: number;
}

/**
 * Listener for health status changes
 */
export interface HealthStatusListener {
  /**
   * Called when health status changes
   * @param status New health status
   * @param previousStatus Previous health status
   */
  onHealthStatusChanged(status: CacheHealthStatus, previousStatus: CacheHealthStatus): void;
}

/**
 * Represents an issue with the cache
 */
export interface HealthIssue {
  type: string;
  message: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  detectedAt: Date;
  metadata?: Record<string, any>;
}

/**
 * Status of the cache health
 */
export interface CacheHealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  hitRate: number;
  errorRate: number;
  availableSpace: number;
  responseTime: number;
  issues: HealthIssue[];
}

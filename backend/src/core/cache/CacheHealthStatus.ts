/**
 * Represents an issue with the cache
 */
export interface HealthIssue {
  /**
   * Type of issue
   */
  type: string;
  
  /**
   * Description of the issue
   */
  message: string;
  
  /**
   * Severity of the issue
   */
  severity: 'low' | 'medium' | 'high' | 'critical';
  
  /**
   * When the issue was detected
   */
  detectedAt: Date;
  
  /**
   * Additional metadata
   */
  metadata?: Record<string, any>;
}

/**
 * Status of the cache health
 */
export interface CacheHealthStatus {
  /**
   * Overall status
   */
  status: 'healthy' | 'degraded' | 'unhealthy';
  
  /**
   * Cache hit rate (0-1)
   */
  hitRate: number;
  
  /**
   * Error rate (0-1)
   */
  errorRate: number;
  
  /**
   * Available space (percentage, 0-1)
   */
  availableSpace: number;
  
  /**
   * Average response time in milliseconds
   */
  responseTime: number;
  
  /**
   * List of issues detected
   */
  issues: HealthIssue[];
}

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
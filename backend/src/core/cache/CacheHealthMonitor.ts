import { CacheManager } from './CacheManager';
import { CacheHealthStatus, HealthIssue, createCacheHealthStatus } from './CacheHealthStatus';
import { LoggerFacade } from '../logging/LoggerFacade';

/**
 * Thresholds for health checks
 */
export interface HealthThresholds {
  /**
   * Minimum acceptable hit rate (0-1)
   */
  minHitRate: number;
  
  /**
   * Maximum acceptable error rate (0-1)
   */
  maxErrorRate: number;
  
  /**
   * Minimum acceptable available space (0-1)
   */
  minAvailableSpace: number;
  
  /**
   * Maximum acceptable response time (ms)
   */
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
 * Monitors cache health and reports issues
 */
export class CacheHealthMonitor {
  /**
   * Cache manager to monitor
   */
  private readonly cacheManager: CacheManager;
  
  /**
   * Logger instance
   */
  private readonly logger: LoggerFacade;
  
  /**
   * Health check interval (ms)
   */
  private readonly checkInterval: number;
  
  /**
   * Thresholds for health checks
   */
  private readonly thresholds: HealthThresholds;
  
  /**
   * Listeners for health status changes
   */
  private readonly listeners: HealthStatusListener[] = [];
  
  /**
   * Current health status
   */
  private currentStatus: CacheHealthStatus = createCacheHealthStatus();
  
  /**
   * Interval ID for health checks
   */
  private intervalId?: NodeJS.Timeout;

  constructor(
    cacheManager: CacheManager,
    logger: LoggerFacade,
    options: {
      checkInterval?: number;
      thresholds?: Partial<HealthThresholds>;
    } = {}
  ) {
    this.cacheManager = cacheManager;
    this.logger = logger.withComponent('CacheHealthMonitor');
    this.checkInterval = options.checkInterval ?? 60 * 1000; // 1 minute
    
    this.thresholds = {
      minHitRate: 0.7, // 70%
      maxErrorRate: 0.05, // 5%
      minAvailableSpace: 0.1, // 10%
      maxResponseTime: 100, // 100ms
      ...options.thresholds
    };
  }

  /**
   * Start monitoring
   */
  public startMonitoring(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
    }
    
    // Do an initial check
    this.checkHealth().catch(error => {
      this.logger.error('Error during initial health check', error as Error);
    });
    
    // Start interval
    this.intervalId = setInterval(() => {
      this.checkHealth().catch(error => {
        this.logger.error('Error during health check', error as Error);
      });
    }, this.checkInterval);
    
    // Ensure the interval doesn't prevent the process from exiting
    if (this.intervalId.unref) {
      this.intervalId.unref();
    }
    
    this.logger.info('Cache health monitoring started', {
      checkInterval: this.checkInterval,
      thresholds: this.thresholds
    });
  }

  /**
   * Stop monitoring
   */
  public stopMonitoring(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = undefined;
    }
    
    this.logger.info('Cache health monitoring stopped');
  }

  /**
   * Check the health of the cache
   */
  public async checkHealth(): Promise<CacheHealthStatus> {
    try {
      const issues: HealthIssue[] = [];
      
      // Get statistics from each domain
      const stats = await this.cacheManager.getStatistics();
      
      // Calculate metrics
      const hitRate = stats.hits / (stats.hits + stats.misses || 1);
      const errorRate = stats.errors / (stats.hits + stats.misses || 1);
      const availableSpace = 1 - (stats.size / (this.cacheManager.getMaxSize() || 1));
      const responseTime = this.cacheManager.getAverageResponseTime();
      
      // Check hit rate
      if (hitRate < this.thresholds.minHitRate) {
        issues.push({
          type: 'low-hit-rate',
          message: `Cache hit rate (${hitRate.toFixed(2)}) is below threshold (${this.thresholds.minHitRate})`,
          severity: hitRate < this.thresholds.minHitRate / 2 ? 'high' : 'medium',
          detectedAt: new Date(),
          metadata: { hitRate, threshold: this.thresholds.minHitRate }
        });
      }
      
      // Check error rate
      if (errorRate > this.thresholds.maxErrorRate) {
        issues.push({
          type: 'high-error-rate',
          message: `Cache error rate (${errorRate.toFixed(2)}) is above threshold (${this.thresholds.maxErrorRate})`,
          severity: errorRate > this.thresholds.maxErrorRate * 2 ? 'high' : 'medium',
          detectedAt: new Date(),
          metadata: { errorRate, threshold: this.thresholds.maxErrorRate }
        });
      }
      
      // Check available space
      if (availableSpace < this.thresholds.minAvailableSpace) {
        issues.push({
          type: 'low-available-space',
          message: `Cache available space (${availableSpace.toFixed(2)}) is below threshold (${this.thresholds.minAvailableSpace})`,
          severity: availableSpace < this.thresholds.minAvailableSpace / 2 ? 'high' : 'medium',
          detectedAt: new Date(),
          metadata: { availableSpace, threshold: this.thresholds.minAvailableSpace }
        });
      }
      
      // Check response time
      if (responseTime > this.thresholds.maxResponseTime) {
        issues.push({
          type: 'high-response-time',
          message: `Cache response time (${responseTime.toFixed(2)}ms) is above threshold (${this.thresholds.maxResponseTime}ms)`,
          severity: responseTime > this.thresholds.maxResponseTime * 2 ? 'high' : 'medium',
          detectedAt: new Date(),
          metadata: { responseTime, threshold: this.thresholds.maxResponseTime }
        });
      }
      
      // Determine overall status
      let status: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
      
      if (issues.some(issue => issue.severity === 'critical')) {
        status = 'unhealthy';
      } else if (issues.some(issue => issue.severity === 'high')) {
        status = 'unhealthy';
      } else if (issues.length > 0) {
        status = 'degraded';
      }
      
      // Create health status
      const healthStatus: CacheHealthStatus = {
        status,
        hitRate,
        errorRate,
        availableSpace,
        responseTime,
        issues
      };
      
      // Notify listeners if status changed
      if (this.hasStatusChanged(healthStatus)) {
        const previousStatus = this.currentStatus;
        this.currentStatus = healthStatus;
        
        this.notifyListeners(healthStatus, previousStatus);
      }
      
      return healthStatus;
    } catch (error) {
      this.logger.error('Error checking cache health', error as Error);
      
      const unhealthyStatus: CacheHealthStatus = {
        status: 'unhealthy',
        hitRate: 0,
        errorRate: 1,
        availableSpace: 0,
        responseTime: 0,
        issues: [{
          type: 'monitoring-error',
          message: `Error checking cache health: ${(error as Error).message}`,
          severity: 'critical',
          detectedAt: new Date(),
          metadata: { error: (error as Error).message }
        }]
      };
      
      if (this.hasStatusChanged(unhealthyStatus)) {
        const previousStatus = this.currentStatus;
        this.currentStatus = unhealthyStatus;
        
        this.notifyListeners(unhealthyStatus, previousStatus);
      }
      
      return unhealthyStatus;
    }
  }

  /**
   * Add a listener for health status changes
   */
  public addListener(listener: HealthStatusListener): void {
    this.listeners.push(listener);
  }

  /**
   * Remove a listener
   */
  public removeListener(listener: HealthStatusListener): void {
    const index = this.listeners.indexOf(listener);
    
    if (index !== -1) {
      this.listeners.splice(index, 1);
    }
  }

  /**
   * Check if health status has changed significantly
   */
  private hasStatusChanged(newStatus: CacheHealthStatus): boolean {
    // If status level changed
    if (newStatus.status !== this.currentStatus.status) {
      return true;
    }
    
    // If issues changed
    if (newStatus.issues.length !== this.currentStatus.issues.length) {
      return true;
    }
    
    // If metrics changed significantly
    const hitRateChange = Math.abs(newStatus.hitRate - this.currentStatus.hitRate);
    const errorRateChange = Math.abs(newStatus.errorRate - this.currentStatus.errorRate);
    const availableSpaceChange = Math.abs(newStatus.availableSpace - this.currentStatus.availableSpace);
    
    if (hitRateChange > 0.1 || errorRateChange > 0.05 || availableSpaceChange > 0.1) {
      return true;
    }
    
    return false;
  }

  /**
   * Notify listeners of a status change
   */
  private notifyListeners(status: CacheHealthStatus, previousStatus: CacheHealthStatus): void {
    for (const listener of this.listeners) {
      try {
        listener.onHealthStatusChanged(status, previousStatus);
      } catch (error) {
        this.logger.error('Error notifying health status listener', error as Error);
      }
    }
    
    this.logger.info(`Cache health status changed to ${status.status}`, {
      previousStatus: previousStatus.status,
      hitRate: status.hitRate.toFixed(2),
      errorRate: status.errorRate.toFixed(2),
      availableSpace: status.availableSpace.toFixed(2),
      responseTime: status.responseTime.toFixed(2),
      issueCount: status.issues.length
    });
  }
}
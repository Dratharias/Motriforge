import { ObjectId } from 'mongodb';
import { ContextualLogger } from '@/shared-kernel/infrastructure/logging/ContextualLogger';
import { RequestContext } from '@/types/middleware/framework/framework-types';
import { 
  MiddlewareRegistration, 
  MiddlewareHealthCheck
} from '@/types/middleware/registry/registry-types';
import { RegistryEventType } from '@/types/middleware/registry/enums';
import { RegistryEventManager } from '.';


/**
 * Configuration for health checker
 */
export interface HealthCheckerConfig {
  readonly timeout: number;
  readonly retries: number;
  readonly retryDelay: number;
  readonly parallelChecks: boolean;
  readonly enabledOnly: boolean;
}

/**
 * Health check result summary
 */
export interface HealthCheckSummary {
  readonly totalChecked: number;
  readonly healthyCount: number;
  readonly unhealthyCount: number;
  readonly totalTime: number;
  readonly averageResponseTime: number;
  readonly errors: readonly string[];
}

/**
 * Handles health checking for registered middleware
 */
export class MiddlewareHealthChecker {
  private readonly logger: ContextualLogger;
  private readonly eventManager: RegistryEventManager;
  private readonly healthChecks: Map<string, MiddlewareHealthCheck>;
  private readonly config: HealthCheckerConfig;
  private healthCheckInterval?: NodeJS.Timeout;

  constructor(
    logger: ContextualLogger,
    eventManager: RegistryEventManager,
    config?: Partial<HealthCheckerConfig>
  ) {
    this.logger = logger;
    this.eventManager = eventManager;
    this.healthChecks = new Map();
    
    this.config = {
      timeout: 5000,
      retries: 2,
      retryDelay: 1000,
      parallelChecks: true,
      enabledOnly: true,
      ...config
    };
  }

  /**
   * Performs health checks on all registered middleware
   */
  async performHealthChecks(
    registrations: Map<string, MiddlewareRegistration>
  ): Promise<readonly MiddlewareHealthCheck[]> {
    const startTime = Date.now();
    const registrationArray = Array.from(registrations.values());
    
    // Filter to enabled middleware only if configured
    const middlewareToCheck = this.config.enabledOnly
      ? registrationArray.filter(reg => reg.middleware.config.enabled)
      : registrationArray;

    this.logger.info('Starting health checks', {
      totalMiddleware: middlewareToCheck.length,
      parallelChecks: this.config.parallelChecks
    });

    let results: MiddlewareHealthCheck[];

    if (this.config.parallelChecks) {
      results = await this.performParallelHealthChecks(middlewareToCheck);
    } else {
      results = await this.performSequentialHealthChecks(middlewareToCheck);
    }

    // Store results
    for (const result of results) {
      this.healthChecks.set(result.middlewareName, result);
    }

    const totalTime = Date.now() - startTime;
    const summary = this.createHealthCheckSummary(results, totalTime);

    this.logger.info('Health checks completed', {
      totalChecked: summary.totalChecked,
      healthyCount: summary.healthyCount,
      unhealthyCount: summary.unhealthyCount,
      totalTime: summary.totalTime,
      averageResponseTime: summary.averageResponseTime
    });

    // Emit event
    this.eventManager.emit(RegistryEventType.HEALTH_CHECK_COMPLETED, '*', {
      totalChecked: summary.totalChecked,
      healthyCount: summary.healthyCount,
      unhealthyCount: summary.unhealthyCount,
      totalTime: summary.totalTime
    });

    return results;
  }

  /**
   * Performs health check on a single middleware
   */
  async performSingleHealthCheck(
    registration: MiddlewareRegistration
  ): Promise<MiddlewareHealthCheck> {
    const startTime = Date.now();
    let attempt = 0;
    let lastError: Error | undefined;

    while (attempt <= this.config.retries) {
      try {
        const healthCheck = await this.attemptHealthCheck(registration, startTime);
        
        // Store result
        this.healthChecks.set(registration.name, healthCheck);
        
        return healthCheck;
      } catch (error) {
        lastError = error as Error;
        attempt++;

        if (attempt <= this.config.retries) {
          this.logger.debug('Health check failed, retrying', {
            middlewareName: registration.name,
            attempt,
            maxRetries: this.config.retries,
            error: lastError.message
          });

          await this.delay(this.config.retryDelay);
        }
      }
    }

    // All attempts failed
    const responseTime = Date.now() - startTime;
    const failedHealthCheck: MiddlewareHealthCheck = {
      middlewareName: registration.name,
      healthy: false,
      lastCheck: new Date(),
      responseTime,
      error: lastError?.message ?? 'Unknown error'
    };

    this.healthChecks.set(registration.name, failedHealthCheck);
    return failedHealthCheck;
  }

  /**
   * Gets stored health check results
   */
  getHealthChecks(): readonly MiddlewareHealthCheck[] {
    return Array.from(this.healthChecks.values());
  }

  /**
   * Gets health check for specific middleware
   */
  getHealthCheck(middlewareName: string): MiddlewareHealthCheck | undefined {
    return this.healthChecks.get(middlewareName);
  }

  /**
   * Gets only healthy middleware
   */
  getHealthyMiddleware(): readonly MiddlewareHealthCheck[] {
    return this.getHealthChecks().filter(check => check.healthy);
  }

  /**
   * Gets only unhealthy middleware
   */
  getUnhealthyMiddleware(): readonly MiddlewareHealthCheck[] {
    return this.getHealthChecks().filter(check => !check.healthy);
  }

  /**
   * Checks if a specific middleware is healthy
   */
  isHealthy(middlewareName: string): boolean {
    const healthCheck = this.getHealthCheck(middlewareName);
    return healthCheck?.healthy ?? false;
  }

  /**
   * Starts periodic health checks
   */
  startPeriodicHealthChecks(
    registrations: Map<string, MiddlewareRegistration>,
    intervalMs: number
  ): void {
    if (this.healthCheckInterval) {
      this.stopPeriodicHealthChecks();
    }

    this.logger.info('Starting periodic health checks', {
      intervalMs,
      middlewareCount: registrations.size
    });

    this.healthCheckInterval = setInterval(async () => {
      try {
        await this.performHealthChecks(registrations);
      } catch (error) {
        this.logger.error('Periodic health check failed', error as Error);
      }
    }, intervalMs);
  }

  /**
   * Stops periodic health checks
   */
  stopPeriodicHealthChecks(): void {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = undefined;
      
      this.logger.info('Stopped periodic health checks');
    }
  }

  /**
   * Clears all health check results
   */
  clearHealthChecks(): void {
    const previousCount = this.healthChecks.size;
    this.healthChecks.clear();
    
    this.logger.info('Health check results cleared', {
      previousCount
    });
  }

  /**
   * Gets health check statistics
   */
  getHealthCheckStats(): HealthCheckStats {
    const allChecks = this.getHealthChecks();
    const healthyCount = allChecks.filter(check => check.healthy).length;
    const unhealthyCount = allChecks.length - healthyCount;
    
    const responseTimes = allChecks
      .filter(check => check.responseTime !== undefined)
      .map(check => check.responseTime!);
    
    const averageResponseTime = responseTimes.length > 0
      ? responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length
      : 0;

    const errors = allChecks
      .filter(check => check.error)
      .map(check => ({ middleware: check.middlewareName, error: check.error! }));

    return {
      totalChecks: allChecks.length,
      healthyCount,
      unhealthyCount,
      healthRatio: allChecks.length > 0 ? healthyCount / allChecks.length : 0,
      averageResponseTime,
      errors,
      lastCheckTime: allChecks.length > 0 
        ? new Date(Math.max(...allChecks.map(check => check.lastCheck.getTime())))
        : undefined
    };
  }

  /**
   * Performs parallel health checks
   */
  private async performParallelHealthChecks(
    registrations: readonly MiddlewareRegistration[]
  ): Promise<MiddlewareHealthCheck[]> {
    const promises = registrations.map(registration =>
      this.performSingleHealthCheck(registration)
    );

    return Promise.all(promises);
  }

  /**
   * Performs sequential health checks
   */
  private async performSequentialHealthChecks(
    registrations: readonly MiddlewareRegistration[]
  ): Promise<MiddlewareHealthCheck[]> {
    const results: MiddlewareHealthCheck[] = [];

    for (const registration of registrations) {
      const result = await this.performSingleHealthCheck(registration);
      results.push(result);
    }

    return results;
  }

  /**
   * Attempts a single health check
   */
  private async attemptHealthCheck(
    registration: MiddlewareRegistration,
    startTime: number
  ): Promise<MiddlewareHealthCheck> {
    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('Health check timeout')), this.config.timeout)
    );

    const healthCheckPromise = this.executeHealthCheck(registration, startTime);

    try {
      return await Promise.race([healthCheckPromise, timeoutPromise]);
    } catch (error) {
      const err = error as Error;
      throw new Error(`Health check failed: ${err.message}`);
    }
  }

  /**
   * Executes the actual health check
   */
  private async executeHealthCheck(
    registration: MiddlewareRegistration,
    startTime: number
  ): Promise<MiddlewareHealthCheck> {
    // Create a dummy context for health check
    const healthContext: RequestContext = {
      requestId: new ObjectId(),
      timestamp: new Date(),
      path: '/health-check',
      method: 'GET',
      headers: {},
      query: {},
      params: {},
      startTime: Date.now(),
      metadata: { healthCheck: true }
    };

    // Test if middleware should execute
    const shouldExecute = registration.middleware.shouldExecute(healthContext);
    const responseTime = Date.now() - startTime;

    const healthCheck: MiddlewareHealthCheck = {
      middlewareName: registration.name,
      healthy: shouldExecute && registration.middleware.config.enabled,
      lastCheck: new Date(),
      responseTime,
      details: {
        enabled: registration.middleware.config.enabled,
        priority: registration.middleware.config.priority,
        shouldExecute,
        version: registration.version,
        category: registration.category
      }
    };

    return healthCheck;
  }

  /**
   * Creates a health check summary
   */
  private createHealthCheckSummary(
    results: readonly MiddlewareHealthCheck[],
    totalTime: number
  ): HealthCheckSummary {
    const healthyCount = results.filter(r => r.healthy).length;
    const unhealthyCount = results.length - healthyCount;
    
    const responseTimes = results
      .filter(r => r.responseTime !== undefined)
      .map(r => r.responseTime!);
    
    const averageResponseTime = responseTimes.length > 0
      ? responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length
      : 0;

    const errors = results
      .filter(r => r.error)
      .map(r => `${r.middlewareName}: ${r.error}`);

    return {
      totalChecked: results.length,
      healthyCount,
      unhealthyCount,
      totalTime,
      averageResponseTime,
      errors
    };
  }

  /**
   * Delays execution for specified milliseconds
   */
  private async delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

/**
 * Health check statistics
 */
export interface HealthCheckStats {
  readonly totalChecks: number;
  readonly healthyCount: number;
  readonly unhealthyCount: number;
  readonly healthRatio: number;
  readonly averageResponseTime: number;
  readonly errors: readonly { middleware: string; error: string }[];
  readonly lastCheckTime?: Date;
}
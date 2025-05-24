/**
 * Middleware framework configuration types
 */

/**
 * Middleware framework configuration interface
 */
export interface MiddlewareFrameworkConfig {
  readonly defaultTimeout: number;
  readonly continueOnError: boolean;
  readonly enableMetrics: boolean;
  readonly enableTracing: boolean;
  readonly maxExecutionTime: number;
  readonly enableRetries?: boolean;
  readonly maxRetries?: number;
  readonly retryDelay?: number;
  readonly enableCaching?: boolean;
  readonly cacheSize?: number;
  readonly enableRateLimiting?: boolean;
  readonly rateLimitWindow?: number;
  readonly maxConcurrentExecutions?: number;
}

/**
 * Execution mode for middleware chain
 */
export enum ExecutionMode {
  SEQUENTIAL = 'sequential',
  PARALLEL = 'parallel',
  CONDITIONAL = 'conditional',
  PIPELINE = 'pipeline'
}

/**
 * Timeout configuration for different middleware categories
 */
export interface TimeoutConfig {
  readonly authentication: number;
  readonly authorization: number;
  readonly validation: number;
  readonly logging: number;
  readonly monitoring: number;
  readonly caching: number;
  readonly rateLimiting: number;
  readonly transformation: number;
  readonly integration: number;
  readonly custom: number;
}

/**
 * Performance configuration for middleware execution
 */
export interface PerformanceConfig {
  readonly enableProfiling: boolean;
  readonly enableBottleneckDetection: boolean;
  readonly slowExecutionThreshold: number;
  readonly memoryLimitMB: number;
  readonly cpuTimeoutMs: number;
  readonly enableGCCollection: boolean;
}

/**
 * Security configuration for middleware framework
 */
export interface SecurityConfig {
  readonly enableSecurityChecks: boolean;
  readonly validateMiddlewareIntegrity: boolean;
  readonly enableSandboxing: boolean;
  readonly restrictedOperations: readonly string[];
  readonly allowedDomains: readonly string[];
  readonly enableAuditLogging: boolean;
}

/**
 * Retry configuration for failed middleware
 */
export interface RetryConfig {
  readonly enableRetries: boolean;
  readonly maxRetries: number;
  readonly retryDelay: number;
  readonly exponentialBackoff: boolean;
  readonly backoffMultiplier: number;
  readonly maxRetryDelay: number;
  readonly retryableErrors: readonly string[];
}

/**
 * Caching configuration for middleware framework
 */
export interface CachingConfig {
  readonly enableCaching: boolean;
  readonly cacheSize: number;
  readonly ttl: number;
  readonly enableDistributedCache: boolean;
  readonly cacheKeyStrategy: 'simple' | 'hash' | 'custom';
  readonly compressionEnabled: boolean;
}

/**
 * Monitoring configuration for middleware framework
 */
export interface MonitoringConfig {
  readonly enableMetrics: boolean;
  readonly enableTracing: boolean;
  readonly enableHealthChecks: boolean;
  readonly metricsInterval: number;
  readonly tracingSampleRate: number;
  readonly healthCheckInterval: number;
  readonly alertThresholds: AlertThresholds;
}

/**
 * Alert thresholds for monitoring
 */
export interface AlertThresholds {
  readonly errorRate: number;
  readonly responseTime: number;
  readonly memoryUsage: number;
  readonly cpuUsage: number;
  readonly queueSize: number;
}

/**
 * Development mode configuration
 */
export interface DevelopmentConfig {
  readonly enableDebugMode: boolean;
  readonly verboseLogging: boolean;
  readonly enableHotReload: boolean;
  readonly enableMiddlewareInspection: boolean;
  readonly allowUnsafeOperations: boolean;
}

/**
 * Production mode configuration
 */
export interface ProductionConfig {
  readonly optimizeForPerformance: boolean;
  readonly enableCompression: boolean;
  readonly enableMinification: boolean;
  readonly strictValidation: boolean;
  readonly disableDebugFeatures: boolean;
}

/**
 * Environment-specific configuration
 */
export interface EnvironmentConfig {
  readonly environment: 'development' | 'staging' | 'production';
  readonly development?: DevelopmentConfig;
  readonly production?: ProductionConfig;
}

/**
 * Complete middleware framework configuration with all options
 */
export interface CompleteMiddlewareFrameworkConfig extends MiddlewareFrameworkConfig {
  readonly executionMode: ExecutionMode;
  readonly timeouts: TimeoutConfig;
  readonly performance: PerformanceConfig;
  readonly security: SecurityConfig;
  readonly retry: RetryConfig;
  readonly caching: CachingConfig;
  readonly monitoring: MonitoringConfig;
  readonly environment: EnvironmentConfig;
}
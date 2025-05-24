import { MiddlewareFrameworkConfig } from ".";

/**
 * Manages middleware framework configuration
 */
export class MiddlewareConfigurationManager {
  private readonly config: MiddlewareFrameworkConfig;

  constructor(config?: Partial<MiddlewareFrameworkConfig>) {
    this.config = {
      ...DEFAULT_MIDDLEWARE_CONFIG,
      ...config
    };
  }

  /**
   * Gets the current configuration
   */
  getConfig(): MiddlewareFrameworkConfig {
    return { ...this.config };
  }

  /**
   * Gets a specific configuration value
   */
  get<K extends keyof MiddlewareFrameworkConfig>(key: K): MiddlewareFrameworkConfig[K] {
    return this.config[key];
  }

  /**
   * Checks if metrics are enabled
   */
  isMetricsEnabled(): boolean {
    return this.config.enableMetrics;
  }

  /**
   * Checks if tracing is enabled
   */
  isTracingEnabled(): boolean {
    return this.config.enableTracing;
  }

  /**
   * Gets the default timeout
   */
  getDefaultTimeout(): number {
    return this.config.defaultTimeout;
  }

  /**
   * Gets the maximum execution time
   */
  getMaxExecutionTime(): number {
    return this.config.maxExecutionTime;
  }

  /**
   * Checks if should continue on error
   */
  shouldContinueOnError(): boolean {
    return this.config.continueOnError;
  }
}

/**
 * Default middleware framework configuration
 */
export const DEFAULT_MIDDLEWARE_CONFIG: MiddlewareFrameworkConfig = {
  defaultTimeout: 30000, // 30 seconds
  continueOnError: false,
  enableMetrics: true,
  enableTracing: true,
  maxExecutionTime: 60000 // 60 seconds
};
export interface EnvironmentConfig {
  readonly nodeEnv: string;
  readonly port: number;
  readonly host: string;
  readonly isDevelopment: boolean;
  readonly isProduction: boolean;
  readonly isTesting: boolean;
  readonly appName: string;
  readonly appVersion: string;
  readonly buildId: string;
  readonly deploymentStage: string;
  readonly enableMetrics: boolean;
  readonly enableTracing: boolean;
  readonly healthCheckPath: string;
  readonly gracefulShutdownTimeout: number;
}

export interface ValidationResult {
  readonly isValid: boolean;
  readonly errors: ValidationError[];
  readonly warnings: ValidationWarning[];
}

export interface ValidationError {
  readonly field: string;
  readonly message: string;
  readonly code: string;
  readonly value: any;
}

export interface ValidationWarning {
  readonly field: string;
  readonly message: string;
  readonly recommendation: string;
}

export class EnvironmentConfigFactory {
  public static createFromEnvironment(): EnvironmentConfig {
    const nodeEnv = process.env.NODE_ENV ?? 'development';
    const port = parseInt(process.env.PORT ?? '3001', 10);
    const host = process.env.HOST ?? 'localhost';
    
    const config: EnvironmentConfig = {
      nodeEnv,
      port,
      host,
      isDevelopment: nodeEnv === 'development',
      isProduction: nodeEnv === 'production',
      isTesting: nodeEnv === 'test' || nodeEnv === 'testing',
      appName: process.env.APP_NAME ?? 'motriforge-api',
      appVersion: process.env.APP_VERSION ?? '1.0.0',
      buildId: process.env.BUILD_ID ?? 'local',
      deploymentStage: process.env.DEPLOYMENT_STAGE ?? 'development',
      enableMetrics: process.env.ENABLE_METRICS !== 'false',
      enableTracing: process.env.ENABLE_TRACING === 'true',
      healthCheckPath: process.env.HEALTH_CHECK_PATH ?? '/health',
      gracefulShutdownTimeout: parseInt(process.env.GRACEFUL_SHUTDOWN_TIMEOUT ?? '10000', 10),
    };

    const validation = this.validateConfig(config);
    if (!validation.isValid) {
      throw new Error(`Environment configuration validation failed: ${validation.errors.map(e => e.message).join(', ')}`);
    }

    return config;
  }

  public static validateConfig(config: EnvironmentConfig): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    // Required fields validation
    if (!config.nodeEnv) {
      errors.push({
        field: 'nodeEnv',
        message: 'NODE_ENV is required',
        code: 'REQUIRED_FIELD',
        value: config.nodeEnv
      });
    }

    if (!config.appName) {
      errors.push({
        field: 'appName',
        message: 'APP_NAME is required',
        code: 'REQUIRED_FIELD',
        value: config.appName
      });
    }

    // Port validation
    if (config.port < 1 || config.port > 65535) {
      errors.push({
        field: 'port',
        message: 'Port must be between 1 and 65535',
        code: 'INVALID_RANGE',
        value: config.port
      });
    }

    // Environment-specific validations
    if (config.nodeEnv && !['development', 'production', 'test', 'testing'].includes(config.nodeEnv)) {
      warnings.push({
        field: 'nodeEnv',
        message: 'Unrecognized NODE_ENV value',
        recommendation: 'Use development, production, test, or testing'
      });
    }

    // Production-specific validations
    if (config.isProduction) {
      if (config.buildId === 'local') {
        warnings.push({
          field: 'buildId',
          message: 'Production deployment should have a proper build ID',
          recommendation: 'Set BUILD_ID environment variable'
        });
      }

      if (config.enableTracing) {
        warnings.push({
          field: 'enableTracing',
          message: 'Tracing enabled in production may impact performance',
          recommendation: 'Consider disabling tracing in production unless needed for debugging'
        });
      }
    }

    // Development-specific warnings
    if (config.isDevelopment && !config.enableMetrics) {
      warnings.push({
        field: 'enableMetrics',
        message: 'Metrics disabled in development',
        recommendation: 'Enable metrics for better development experience'
      });
    }

    // Graceful shutdown timeout validation
    if (config.gracefulShutdownTimeout < 1000 || config.gracefulShutdownTimeout > 60000) {
      warnings.push({
        field: 'gracefulShutdownTimeout',
        message: 'Graceful shutdown timeout should be between 1-60 seconds',
        recommendation: 'Set timeout between 1000-60000 milliseconds'
      });
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  public static createForTesting(): EnvironmentConfig {
    return {
      nodeEnv: 'test',
      port: 0, // Use random port for tests
      host: 'localhost',
      isDevelopment: false,
      isProduction: false,
      isTesting: true,
      appName: 'motriforge-api-test',
      appVersion: '1.0.0-test',
      buildId: 'test-build',
      deploymentStage: 'test',
      enableMetrics: false,
      enableTracing: false,
      healthCheckPath: '/health',
      gracefulShutdownTimeout: 5000,
    };
  }

  public static getConfigSummary(config: EnvironmentConfig): Record<string, any> {
    return {
      environment: config.nodeEnv,
      application: {
        name: config.appName,
        version: config.appVersion,
        buildId: config.buildId,
        stage: config.deploymentStage
      },
      server: {
        host: config.host,
        port: config.port,
        healthCheck: config.healthCheckPath
      },
      features: {
        metrics: config.enableMetrics,
        tracing: config.enableTracing
      },
      lifecycle: {
        gracefulShutdownTimeout: config.gracefulShutdownTimeout
      }
    };
  }
}
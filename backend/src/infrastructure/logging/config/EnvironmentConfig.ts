import { LoggerConfigBuilder } from './LoggerConfigBuilder.js';
import { LoggingConfig } from './LoggingConfig.js';
import { LogLevel } from '../base/Logger.js';

/**
 * Environment variable mappings for logging configuration
 */
export interface EnvironmentVariables {
  readonly LOG_LEVEL?: string;
  readonly LOG_ENVIRONMENT?: string;
  readonly LOG_ENABLE_TRACING?: string;
  readonly LOG_ENABLE_METRICS?: string;
  readonly LOG_FILE_PATH?: string;
  readonly LOG_FILE_MAX_SIZE?: string;
  readonly LOG_FILE_ROTATE_COUNT?: string;
  readonly LOG_DB_CONNECTION?: string;
  readonly LOG_DB_TABLE?: string;
  readonly LOG_DB_BATCH_SIZE?: string;
  readonly APP_NAME?: string;
  readonly APP_VERSION?: string;
}

/**
 * Environment-based configuration loader
 */
export class EnvironmentConfig {
  /**
   * Create logging configuration from environment variables
   */
  static fromEnvironment(env: EnvironmentVariables = process.env as EnvironmentVariables): LoggingConfig {
    const builder = new LoggerConfigBuilder();
    
    // Basic configuration
    if (env.LOG_LEVEL) {
      builder.setGlobalLevel(this.parseLogLevel(env.LOG_LEVEL));
    }
    
    if (env.LOG_ENVIRONMENT) {
      const environment = env.LOG_ENVIRONMENT as 'development' | 'staging' | 'production';
      builder.setEnvironment(environment);
    }
    
    if (env.LOG_ENABLE_TRACING) {
      builder.setTracing(this.parseBoolean(env.LOG_ENABLE_TRACING));
    }
    
    if (env.LOG_ENABLE_METRICS) {
      builder.setMetrics(this.parseBoolean(env.LOG_ENABLE_METRICS));
    }
    
    if (env.APP_NAME && env.APP_VERSION) {
      builder.setApplicationInfo(env.APP_NAME, env.APP_VERSION);
    }

    // Add loggers based on environment
    this.addLoggersFromEnvironment(builder, env);
    
    return builder.build();
  }

  /**
   * Add loggers based on environment configuration
   */
  private static addLoggersFromEnvironment(
    builder: LoggerConfigBuilder, 
    env: EnvironmentVariables
  ): void {
    const environment = env.LOG_ENVIRONMENT ?? 'development';
    
    // Always add console logger in development
    if (environment === 'development') {
      builder.addConsoleLogger('console', LogLevel.DEBUG, 'DEV');
    }
    
    // Add file logger if path is specified
    if (env.LOG_FILE_PATH) {
      const maxSize = env.LOG_FILE_MAX_SIZE ? parseInt(env.LOG_FILE_MAX_SIZE, 10) : undefined;
      const rotateCount = env.LOG_FILE_ROTATE_COUNT ? parseInt(env.LOG_FILE_ROTATE_COUNT, 10) : undefined;
      
      builder.addFileLogger('file', env.LOG_FILE_PATH, {
        maxFileSize: maxSize,
        rotateCount,
        compression: environment === 'production'
      });
    }
    
    // Add database logger if connection string is specified
    if (env.LOG_DB_CONNECTION) {
      const batchSize = env.LOG_DB_BATCH_SIZE ? parseInt(env.LOG_DB_BATCH_SIZE, 10) : undefined;
      const tableName = env.LOG_DB_TABLE;
      
      builder.addDatabaseLogger('database', env.LOG_DB_CONNECTION, {
        tableName,
        batchSize
      });
    }
    
    // Default configurations based on environment
    if (!env.LOG_FILE_PATH && !env.LOG_DB_CONNECTION) {
      switch (environment) {
        case 'production':
          builder.addFileLogger('production', '/var/log/fitness-app/app.log', {
            level: LogLevel.INFO,
            maxFileSize: 50 * 1024 * 1024,
            rotateCount: 10,
            compression: true
          });
          break;
          
        case 'staging':
          builder.addConsoleLogger('console', LogLevel.INFO, 'STAGING');
          builder.addFileLogger('staging', '/tmp/fitness-app-staging.log', {
            level: LogLevel.DEBUG
          });
          break;
          
        default: // development
          builder.addConsoleLogger('console', LogLevel.DEBUG, 'DEV');
      }
    }
  }

  /**
   * Parse log level from string
   */
  private static parseLogLevel(level: string): LogLevel {
    switch (level.toUpperCase()) {
      case 'DEBUG':
        return LogLevel.DEBUG;
      case 'INFO':
        return LogLevel.INFO;
      case 'WARN':
      case 'WARNING':
        return LogLevel.WARN;
      case 'ERROR':
        return LogLevel.ERROR;
      case 'CRITICAL':
        return LogLevel.CRITICAL;
      default:
        return LogLevel.INFO;
    }
  }

  /**
   * Parse boolean from string
   */
  private static parseBoolean(value: string): boolean {
    return ['true', '1', 'yes', 'on'].includes(value.toLowerCase());
  }

  /**
   * Get default configuration for current NODE_ENV
   */
  static getDefault(): LoggingConfig {
    const nodeEnv = process.env.NODE_ENV ?? 'development';
    
    switch (nodeEnv) {
      case 'production':
        return LoggerConfigBuilder.production().build();
      case 'test':
        return LoggerConfigBuilder.testing().build();
      default:
        return LoggerConfigBuilder.development().build();
    }
  }

  /**
   * Validate environment configuration
   */
  static validate(env: EnvironmentVariables): {
    isValid: boolean;
    errors: string[];
    warnings: string[];
  } {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Validate log level
    if (env.LOG_LEVEL && !['DEBUG', 'INFO', 'WARN', 'WARNING', 'ERROR', 'CRITICAL'].includes(env.LOG_LEVEL.toUpperCase())) {
      errors.push(`Invalid LOG_LEVEL: ${env.LOG_LEVEL}`);
    }

    // Validate environment
    if (env.LOG_ENVIRONMENT && !['development', 'staging', 'production'].includes(env.LOG_ENVIRONMENT)) {
      errors.push(`Invalid LOG_ENVIRONMENT: ${env.LOG_ENVIRONMENT}`);
    }

    // Validate numeric values
    if (env.LOG_FILE_MAX_SIZE && isNaN(parseInt(env.LOG_FILE_MAX_SIZE, 10))) {
      errors.push(`Invalid LOG_FILE_MAX_SIZE: ${env.LOG_FILE_MAX_SIZE}`);
    }

    if (env.LOG_FILE_ROTATE_COUNT && isNaN(parseInt(env.LOG_FILE_ROTATE_COUNT, 10))) {
      errors.push(`Invalid LOG_FILE_ROTATE_COUNT: ${env.LOG_FILE_ROTATE_COUNT}`);
    }

    if (env.LOG_DB_BATCH_SIZE && isNaN(parseInt(env.LOG_DB_BATCH_SIZE, 10))) {
      errors.push(`Invalid LOG_DB_BATCH_SIZE: ${env.LOG_DB_BATCH_SIZE}`);
    }

    // Warnings
    if (env.LOG_ENVIRONMENT === 'production' && env.LOG_LEVEL === 'DEBUG') {
      warnings.push('DEBUG log level in production environment may impact performance');
    }

    if (env.LOG_FILE_PATH && !env.LOG_FILE_MAX_SIZE) {
      warnings.push('File logging without max size limit may cause disk space issues');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }
}
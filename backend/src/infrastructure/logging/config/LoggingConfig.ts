import { LogLevel } from '../base/Logger';

/**
 * Configuration for individual loggers
 */
export interface LoggerConfiguration {
  readonly name: string;
  readonly level: LogLevel;
  readonly type: 'console' | 'file' | 'database' | 'composite';
  readonly enabled: boolean;
  readonly context?: string;
  readonly formatter?: string;
  readonly filters?: readonly string[];
}

/**
 * Configuration for file-based loggers
 */
export interface FileLoggerConfiguration extends LoggerConfiguration {
  readonly type: 'file';
  readonly filePath: string;
  readonly maxFileSize: number;
  readonly rotateCount: number;
  readonly rotateOnStartup: boolean;
  readonly compression: boolean;
}

/**
 * Configuration for database loggers
 */
export interface DatabaseLoggerConfiguration extends LoggerConfiguration {
  readonly type: 'database';
  readonly connectionString: string;
  readonly tableName: string;
  readonly batchSize: number;
  readonly flushInterval: number;
  readonly retentionDays: number;
}

/**
 * Configuration for composite loggers (multiple outputs)
 */
export interface CompositeLoggerConfiguration extends LoggerConfiguration {
  readonly type: 'composite';
  readonly loggers: readonly LoggerConfiguration[];
}

/**
 * Main logging configuration
 */
export interface LoggingConfig {
  globalLevel: LogLevel;
  defaultContext: string;
  enableTracing: boolean;
  enableMetrics: boolean;
  readonly loggers: readonly LoggerConfiguration[];
  environment: 'development' | 'staging' | 'production';
  applicationName: string;
  version: string;
}


import type { EnvironmentConfig, ValidationResult } from './environment.config';
import { LoggingConfigValidator } from './validators/logging/LoggingConfigValidator';

export enum LogLevel {
  ERROR = 'error',
  WARN = 'warn',
  INFO = 'info',
  DEBUG = 'debug',
  TRACE = 'trace'
}

export interface LoggingConfig {
  readonly level: LogLevel;
  readonly enableConsole: boolean;
  readonly enableFile: boolean;
  readonly enableStructured: boolean;
  readonly enableCorrelation: boolean;
  readonly file: FileLoggingConfig;
  readonly format: LogFormatConfig;
  readonly sensitiveFields: readonly string[];
  readonly sampling: SamplingConfig;
  readonly performance: PerformanceLoggingConfig;
}

export interface FileLoggingConfig {
  readonly enabled: boolean;
  readonly path: string;
  readonly maxSize: string;
  readonly maxFiles: number;
  readonly compress: boolean;
  readonly datePattern: string;
}

export interface LogFormatConfig {
  readonly timestamp: boolean;
  readonly colorize: boolean;
  readonly prettyPrint: boolean;
  readonly includeStack: boolean;
  readonly includeContext: boolean;
  readonly includeCorrelationId: boolean;
}

export interface SamplingConfig {
  readonly enabled: boolean;
  readonly rate: number;
  readonly excludeErrors: boolean;
  readonly includeTraces: boolean;
}

export interface PerformanceLoggingConfig {
  readonly enabled: boolean;
  readonly slowQueryThreshold: number;
  readonly slowRequestThreshold: number;
  readonly includeQueryPlans: boolean;
  readonly includeMetrics: boolean;
}

export class LoggingConfigFactory {
  private static readonly validator = new LoggingConfigValidator();

  public static createFromEnvironment(envConfig: EnvironmentConfig): LoggingConfig {
    const config: LoggingConfig = {
      level: this.parseLogLevel(process.env.LOG_LEVEL ?? this.getDefaultLogLevel(envConfig)),
      enableConsole: process.env.LOG_CONSOLE !== 'false',
      enableFile: process.env.LOG_FILE === 'true' || envConfig.isProduction,
      enableStructured: process.env.LOG_STRUCTURED === 'true' || envConfig.isProduction,
      enableCorrelation: process.env.LOG_CORRELATION !== 'false',
      file: {
        enabled: process.env.LOG_FILE === 'true' || envConfig.isProduction,
        path: process.env.LOG_FILE_PATH ?? './logs/motriforge.log',
        maxSize: process.env.LOG_FILE_MAX_SIZE ?? '100MB',
        maxFiles: parseInt(process.env.LOG_FILE_MAX_FILES ?? '14', 10),
        compress: process.env.LOG_FILE_COMPRESS !== 'false',
        datePattern: process.env.LOG_FILE_DATE_PATTERN ?? 'YYYY-MM-DD'
      },
      format: {
        timestamp: process.env.LOG_FORMAT_TIMESTAMP !== 'false',
        colorize: process.env.LOG_FORMAT_COLORIZE !== 'false' && !envConfig.isProduction,
        prettyPrint: process.env.LOG_FORMAT_PRETTY === 'true' && envConfig.isDevelopment,
        includeStack: process.env.LOG_FORMAT_STACK !== 'false',
        includeContext: process.env.LOG_FORMAT_CONTEXT !== 'false',
        includeCorrelationId: process.env.LOG_FORMAT_CORRELATION !== 'false'
      },
      sensitiveFields: this.parseSensitiveFields(process.env.LOG_SENSITIVE_FIELDS),
      sampling: {
        enabled: process.env.LOG_SAMPLING === 'true',
        rate: parseFloat(process.env.LOG_SAMPLING_RATE ?? '0.1'),
        excludeErrors: process.env.LOG_SAMPLING_EXCLUDE_ERRORS !== 'false',
        includeTraces: process.env.LOG_SAMPLING_INCLUDE_TRACES === 'true'
      },
      performance: {
        enabled: process.env.LOG_PERFORMANCE !== 'false',
        slowQueryThreshold: parseInt(process.env.LOG_SLOW_QUERY_THRESHOLD ?? '1000', 10),
        slowRequestThreshold: parseInt(process.env.LOG_SLOW_REQUEST_THRESHOLD ?? '2000', 10),
        includeQueryPlans: process.env.LOG_QUERY_PLANS === 'true' && envConfig.isDevelopment,
        includeMetrics: process.env.LOG_METRICS !== 'false'
      }
    };

    const validation = this.validateConfig(config, envConfig);
    if (!validation.isValid) {
      throw new Error(`Logging configuration validation failed: ${validation.errors.map(e => e.message).join(', ')}`);
    }

    return config;
  }

  public static validateConfig(config: LoggingConfig, envConfig: EnvironmentConfig): ValidationResult {
    return this.validator.validate(config, envConfig);
  }

  public static createForTesting(): LoggingConfig {
    return {
      level: LogLevel.ERROR,
      enableConsole: false,
      enableFile: false,
      enableStructured: false,
      enableCorrelation: false,
      file: {
        enabled: false,
        path: './logs/test.log',
        maxSize: '10MB',
        maxFiles: 1,
        compress: false,
        datePattern: 'YYYY-MM-DD'
      },
      format: {
        timestamp: false,
        colorize: false,
        prettyPrint: false,
        includeStack: false,
        includeContext: false,
        includeCorrelationId: false
      },
      sensitiveFields: ['password', 'token', 'secret'],
      sampling: {
        enabled: false,
        rate: 0,
        excludeErrors: true,
        includeTraces: false
      },
      performance: {
        enabled: false,
        slowQueryThreshold: 10000,
        slowRequestThreshold: 10000,
        includeQueryPlans: false,
        includeMetrics: false
      }
    };
  }

  private static parseLogLevel(levelString: string): LogLevel {
    const level = levelString.toLowerCase() as LogLevel;
    return Object.values(LogLevel).includes(level) ? level : LogLevel.INFO;
  }

  private static getDefaultLogLevel(envConfig: EnvironmentConfig): string {
    if (envConfig.isProduction) return LogLevel.INFO;
    if (envConfig.isTesting) return LogLevel.ERROR;
    return LogLevel.DEBUG;
  }

  private static parseSensitiveFields(fieldsString?: string): readonly string[] {
    const defaultFields = [
      'password',
      'token',
      'secret',
      'key',
      'authorization',
      'cookie',
      'session',
      'refresh_token',
      'access_token',
      'private_key',
      'password_hash'
    ];

    if (!fieldsString) {
      return defaultFields;
    }

    const customFields = fieldsString.split(',').map(field => field.trim()).filter(Boolean);
    return [...new Set([...defaultFields, ...customFields])];
  }

  public static getConfigSummary(config: LoggingConfig): Record<string, any> {
    return {
      level: config.level,
      outputs: {
        console: config.enableConsole,
        file: config.enableFile,
        structured: config.enableStructured
      },
      features: {
        correlation: config.enableCorrelation,
        sampling: config.sampling.enabled,
        performance: config.performance.enabled
      },
      file: config.enableFile ? {
        path: config.file.path,
        maxSize: config.file.maxSize,
        maxFiles: config.file.maxFiles,
        compress: config.file.compress
      } : null,
      sensitiveFieldsCount: config.sensitiveFields.length
    };
  }
}
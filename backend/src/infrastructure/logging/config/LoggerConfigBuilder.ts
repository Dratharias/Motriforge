import { 
  LoggingConfig, 
  LoggerConfiguration, 
  FileLoggerConfiguration,
  DatabaseLoggerConfiguration,
  CompositeLoggerConfiguration 
} from './LoggingConfig';
import { LogLevel } from '../base/Logger';

/**
 * Builder for creating logging configurations
 */
export class LoggerConfigBuilder {
  private readonly config: Partial<LoggingConfig> = {};
  private readonly loggers: LoggerConfiguration[] = [];

  /**
   * Set global log level
   */
  setGlobalLevel(level: LogLevel): this {
    this.config.globalLevel = level;
    return this;
  }

  /**
   * Set default context
   */
  setDefaultContext(context: string): this {
    this.config.defaultContext = context;
    return this;
  }

  /**
   * Enable or disable tracing
   */
  setTracing(enabled: boolean): this {
    this.config.enableTracing = enabled;
    return this;
  }

  /**
   * Enable or disable metrics
   */
  setMetrics(enabled: boolean): this {
    this.config.enableMetrics = enabled;
    return this;
  }

  /**
   * Set environment
   */
  setEnvironment(environment: 'development' | 'staging' | 'production'): this {
    this.config.environment = environment;
    return this;
  }

  /**
   * Set application info
   */
  setApplicationInfo(name: string, version: string): this {
    this.config.applicationName = name;
    this.config.version = version;
    return this;
  }

  /**
   * Add a console logger
   */
  addConsoleLogger(
    name: string,
    level: LogLevel = LogLevel.INFO,
    context?: string,
    enabled: boolean = true
  ): this {
    this.loggers.push({
      name,
      level,
      type: 'console',
      enabled,
      context
    });
    return this;
  }

  /**
   * Add a file logger
   */
  addFileLogger(
    name: string,
    filePath: string,
    options: {
      level?: LogLevel;
      context?: string;
      enabled?: boolean;
      maxFileSize?: number;
      rotateCount?: number;
      rotateOnStartup?: boolean;
      compression?: boolean;
    } = {}
  ): this {
    const fileLogger: FileLoggerConfiguration = {
      name,
      level: options.level ?? LogLevel.INFO,
      type: 'file',
      enabled: options.enabled ?? true,
      context: options.context,
      filePath,
      maxFileSize: options.maxFileSize ?? 10 * 1024 * 1024, // 10MB
      rotateCount: options.rotateCount ?? 5,
      rotateOnStartup: options.rotateOnStartup ?? false,
      compression: options.compression ?? false
    };
    
    this.loggers.push(fileLogger);
    return this;
  }

  /**
   * Add a database logger
   */
  addDatabaseLogger(
    name: string,
    connectionString: string,
    options: {
      level?: LogLevel;
      context?: string;
      enabled?: boolean;
      tableName?: string;
      batchSize?: number;
      flushInterval?: number;
      retentionDays?: number;
    } = {}
  ): this {
    const dbLogger: DatabaseLoggerConfiguration = {
      name,
      level: options.level ?? LogLevel.INFO,
      type: 'database',
      enabled: options.enabled ?? true,
      context: options.context,
      connectionString,
      tableName: options.tableName ?? 'logs',
      batchSize: options.batchSize ?? 100,
      flushInterval: options.flushInterval ?? 5000, // 5 seconds
      retentionDays: options.retentionDays ?? 30
    };
    
    this.loggers.push(dbLogger);
    return this;
  }

  /**
   * Add a composite logger (multiple outputs)
   */
  addCompositeLogger(
    name: string,
    childLoggers: readonly LoggerConfiguration[],
    options: {
      level?: LogLevel;
      context?: string;
      enabled?: boolean;
    } = {}
  ): this {
    const compositeLogger: CompositeLoggerConfiguration = {
      name,
      level: options.level ?? LogLevel.INFO,
      type: 'composite',
      enabled: options.enabled ?? true,
      context: options.context,
      loggers: childLoggers
    };
    
    this.loggers.push(compositeLogger);
    return this;
  }

  /**
   * Build the logging configuration
   */
  build(): LoggingConfig {
    return {
      globalLevel: this.config.globalLevel ?? LogLevel.INFO,
      defaultContext: this.config.defaultContext ?? 'Application',
      enableTracing: this.config.enableTracing ?? false,
      enableMetrics: this.config.enableMetrics ?? false,
      loggers: [...this.loggers],
      environment: this.config.environment ?? 'development',
      applicationName: this.config.applicationName ?? 'FitnessApp',
      version: this.config.version ?? '1.0.0'
    };
  }

  /**
   * Create a default development configuration
   */
  static development(): LoggerConfigBuilder {
    return new LoggerConfigBuilder()
      .setEnvironment('development')
      .setGlobalLevel(LogLevel.DEBUG)
      .setTracing(true)
      .setMetrics(false)
      .addConsoleLogger('console', LogLevel.DEBUG, 'DEV');
  }

  /**
   * Create a default production configuration
   */
  static production(): LoggerConfigBuilder {
    return new LoggerConfigBuilder()
      .setEnvironment('production')
      .setGlobalLevel(LogLevel.INFO)
      .setTracing(false)
      .setMetrics(true)
      .addFileLogger('file', '/var/log/fitness-app/app.log', {
        level: LogLevel.INFO,
        maxFileSize: 50 * 1024 * 1024, // 50MB
        rotateCount: 10,
        compression: true
      });
  }

  /**
   * Create a configuration for testing
   */
  static testing(): LoggerConfigBuilder {
    return new LoggerConfigBuilder()
      .setEnvironment('development')
      .setGlobalLevel(LogLevel.WARN)
      .setTracing(false)
      .setMetrics(false);
  }
}


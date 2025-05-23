import { ILogger } from '@/types/shared/base-types';
import { LogLevel, Environment } from '@/types/shared/enums/common';

/**
 * Log entry interface
 */
export interface LogEntry {
  readonly timestamp: Date;
  readonly level: LogLevel;
  readonly message: string;
  readonly data?: any;
  readonly error?: Error;
  readonly context?: LogContext;
  readonly correlationId?: string;
  readonly userId?: string;
  readonly organizationId?: string;
}

/**
 * Log context interface
 */
export interface LogContext {
  readonly service?: string;
  readonly operation?: string;
  readonly requestId?: string;
  readonly sessionId?: string;
  readonly ipAddress?: string;
  readonly userAgent?: string;
  readonly [key: string]: any;
}

/**
 * Log transport interface
 */
export interface ILogTransport {
  readonly name: string;
  log(entry: LogEntry): Promise<void>;
}

/**
 * Logger configuration interface
 */
export interface LoggerConfig {
  readonly level: LogLevel;
  readonly environment: Environment;
  readonly transports: readonly ILogTransport[];
  readonly enableConsole: boolean;
  readonly enableStructuredLogging: boolean;
  readonly enableSampling: boolean;
  readonly samplingRate?: number;
  readonly blacklistedFields?: readonly string[];
}

/**
 * Base logger implementation
 */
export class Logger implements ILogger {
  private readonly config: LoggerConfig;
  private readonly context: LogContext;

  constructor(config: LoggerConfig, context?: LogContext) {
    this.config = config;
    this.context = context || {};
  }

  /**
   * Creates a child logger with additional context
   */
  child(context: Partial<LogContext>): Logger {
    return new Logger(this.config, { ...this.context, ...context });
  }

  /**
   * Creates a logger with correlation ID
   */
  withCorrelationId(correlationId: string): Logger {
    return this.child({ correlationId });
  }

  /**
   * Creates a logger with user context
   */
  withUser(userId: string, organizationId?: string): Logger {
    return this.child({ userId, organizationId });
  }

  /**
   * Logs a debug message
   */
  debug(message: string, data?: any): void {
    this.log(LogLevel.DEBUG, message, data);
  }

  /**
   * Logs an info message
   */
  info(message: string, data?: any): void {
    this.log(LogLevel.INFO, message, data);
  }

  /**
   * Logs a warning message
   */
  warn(message: string, data?: any): void {
    this.log(LogLevel.WARN, message, data);
  }

  /**
   * Logs an error message
   */
  error(message: string, error?: Error, data?: any): void {
    this.log(LogLevel.ERROR, message, data, error);
  }

  /**
   * Logs a fatal message
   */
  fatal(message: string, error?: Error, data?: any): void {
    this.log(LogLevel.FATAL, message, data, error);
  }

  /**
   * Main logging method
   */
  private async log(level: LogLevel, message: string, data?: any, error?: Error): Promise<void> {
    if (!this.shouldLog(level)) {
      return;
    }

    if (this.config.enableSampling && !this.shouldSample()) {
      return;
    }

    const entry = this.createLogEntry(level, message, data, error);

    // Log to console if enabled
    if (this.config.enableConsole) {
      this.logToConsole(entry);
    }

    // Log to configured transports
    await Promise.all(
      this.config.transports.map(transport => 
        transport.log(entry).catch(err => 
          console.error(`Failed to log to transport ${transport.name}:`, err)
        )
      )
    );
  }

  /**
   * Determines if a log level should be logged
   */
  private shouldLog(level: LogLevel): boolean {
    const levels = [LogLevel.DEBUG, LogLevel.INFO, LogLevel.WARN, LogLevel.ERROR, LogLevel.FATAL];
    const configLevelIndex = levels.indexOf(this.config.level);
    const messageLevelIndex = levels.indexOf(level);
    return messageLevelIndex >= configLevelIndex;
  }

  /**
   * Determines if a log entry should be sampled
   */
  private shouldSample(): boolean {
    if (!this.config.samplingRate) {
      return true;
    }
    return Math.random() < this.config.samplingRate;
  }

  /**
   * Creates a log entry
   */
  private createLogEntry(level: LogLevel, message: string, data?: any, error?: Error): LogEntry {
    const entry: LogEntry = {
      timestamp: new Date(),
      level,
      message,
      context: this.context,
      ...(data && { data: this.sanitizeData(data) }),
      ...(error && { error }),
      ...(this.context.correlationId && { correlationId: this.context.correlationId }),
      ...(this.context.userId && { userId: this.context.userId }),
      ...(this.context.organizationId && { organizationId: this.context.organizationId })
    };

    return entry;
  }

  /**
   * Sanitizes log data by removing blacklisted fields
   */
  private sanitizeData(data: any): any {
    if (!this.config.blacklistedFields || this.config.blacklistedFields.length === 0) {
      return data;
    }

    if (typeof data !== 'object' || data === null) {
      return data;
    }

    const sanitized = { ...data };
    for (const field of this.config.blacklistedFields) {
      if (field in sanitized) {
        sanitized[field] = '[REDACTED]';
      }
    }

    return sanitized;
  }

  /**
   * Logs to console with appropriate styling
   */
  private logToConsole(entry: LogEntry): void {
    const timestamp = entry.timestamp.toISOString();
    const level = entry.level.toUpperCase().padEnd(5);
    const message = entry.message;

    if (this.config.enableStructuredLogging) {
      console.log(JSON.stringify(entry, null, 2));
      return;
    }

    const logData = entry.data ? ` ${JSON.stringify(entry.data)}` : '';
    const errorInfo = entry.error ? ` Error: ${entry.error.message}\n${entry.error.stack}` : '';

    switch (entry.level) {
      case LogLevel.DEBUG:
        console.debug(`[${timestamp}] ${level} ${message}${logData}${errorInfo}`);
        break;
      case LogLevel.INFO:
        console.info(`[${timestamp}] ${level} ${message}${logData}${errorInfo}`);
        break;
      case LogLevel.WARN:
        console.warn(`[${timestamp}] ${level} ${message}${logData}${errorInfo}`);
        break;
      case LogLevel.ERROR:
      case LogLevel.FATAL:
        console.error(`[${timestamp}] ${level} ${message}${logData}${errorInfo}`);
        break;
    }
  }
}

/**
 * Console transport for logging to console
 */
export class ConsoleTransport implements ILogTransport {
  public readonly name = 'console';

  async log(entry: LogEntry): Promise<void> {
    // Console logging is handled in the main logger
    // This transport is mainly for consistency
  }
}

/**
 * File transport for logging to files
 */
export class FileTransport implements ILogTransport {
  public readonly name = 'file';
  private readonly filePath: string;

  constructor(filePath: string) {
    this.filePath = filePath;
  }

  async log(entry: LogEntry): Promise<void> {
    // In a real implementation, this would write to a file
    // For now, we'll use console as a placeholder
    console.log(`[FILE: ${this.filePath}]`, JSON.stringify(entry));
  }
}

/**
 * HTTP transport for logging to external services
 */
export class HttpTransport implements ILogTransport {
  public readonly name = 'http';
  private readonly endpoint: string;
  private readonly headers: Record<string, string>;

  constructor(endpoint: string, headers: Record<string, string> = {}) {
    this.endpoint = endpoint;
    this.headers = {
      'Content-Type': 'application/json',
      ...headers
    };
  }

  async log(entry: LogEntry): Promise<void> {
    try {
      const response = await fetch(this.endpoint, {
        method: 'POST',
        headers: this.headers,
        body: JSON.stringify(entry)
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
    } catch (error) {
      console.error(`Failed to send log to ${this.endpoint}:`, error);
      throw error;
    }
  }
}

/**
 * Logger factory for creating configured loggers
 */
export class LoggerFactory {
  private static readonly defaultConfig: LoggerConfig = {
    level: LogLevel.INFO,
    environment: Environment.DEVELOPMENT,
    transports: [],
    enableConsole: true,
    enableStructuredLogging: false,
    enableSampling: false,
    blacklistedFields: ['password', 'token', 'apiKey', 'secret']
  };

  /**
   * Creates a logger with default configuration
   */
  static create(context?: LogContext): Logger {
    return new Logger(this.defaultConfig, context);
  }

  /**
   * Creates a logger with custom configuration
   */
  static createWithConfig(config: Partial<LoggerConfig>, context?: LogContext): Logger {
    const mergedConfig = { ...this.defaultConfig, ...config };
    return new Logger(mergedConfig, context);
  }

  /**
   * Creates a production logger with optimized settings
   */
  static createProduction(transports: ILogTransport[], context?: LogContext): Logger {
    const config: LoggerConfig = {
      ...this.defaultConfig,
      level: LogLevel.INFO,
      environment: Environment.PRODUCTION,
      transports,
      enableConsole: false,
      enableStructuredLogging: true,
      enableSampling: true,
      samplingRate: 0.1 // Sample 10% of logs
    };
    return new Logger(config, context);
  }

  /**
   * Creates a development logger with verbose settings
   */
  static createDevelopment(context?: LogContext): Logger {
    const config: LoggerConfig = {
      ...this.defaultConfig,
      level: LogLevel.DEBUG,
      environment: Environment.DEVELOPMENT,
      transports: [],
      enableConsole: true,
      enableStructuredLogging: false,
      enableSampling: false
    };
    return new Logger(config, context);
  }
}
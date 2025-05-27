import { Severity } from '../../../types/core/enums';
import { IError, IEvent } from '../../../types/core/interfaces';

/**
 * Log levels for controlling logging output
 */
export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
  CRITICAL = 4
}

/**
 * Individual log entry structure
 */
export interface LogEntry {
  readonly timestamp: Date;
  readonly level: LogLevel;
  readonly message: string;
  readonly context?: string;
  readonly metadata?: Record<string, unknown>;
  readonly traceId?: string;
  readonly userId?: string;
  readonly source?: string;
}

/**
 * Interface for formatting log entries
 */
export interface LogFormatter {
  format(entry: LogEntry): string;
}

/**
 * Abstract base logger class
 */
export abstract class Logger {
  protected readonly context: string;
  protected level: LogLevel;

  constructor(context: string, level: LogLevel = LogLevel.INFO) {
    this.context = context;
    this.level = level;
  }

  /**
   * Log a message with optional severity
   */
  log(message: string, severity: Severity = Severity.INFO, metadata?: Record<string, unknown>): void {
    const logLevel = this.severityToLogLevel(severity);
    
    if (!this.shouldLog(logLevel)) {
      return;
    }

    const entry: LogEntry = {
      timestamp: new Date(),
      level: logLevel,
      message: this.formatMessage(message, severity),
      context: this.context,
      metadata,
      source: this.constructor.name
    };

    this.writeLog(entry);
  }

  /**
   * Log an error
   */
  logError(error: IError, metadata?: Record<string, unknown>): void {
    const logLevel = this.severityToLogLevel(error.severity);
    
    if (!this.shouldLog(logLevel)) {
      return;
    }

    const entry: LogEntry = {
      timestamp: new Date(),
      level: logLevel,
      message: error.message,
      context: error.context ?? this.context,
      metadata: {
        ...metadata,
        code: error.code,
        origin: error.origin,
        stack: error.stack,
        errorTimestamp: error.timestamp.toISOString()
      },
      traceId: error.traceId,
      userId: error.userId,
      source: this.constructor.name
    };

    this.writeLog(entry);
  }

  /**
   * Log an event
   */
  logEvent(event: IEvent, metadata?: Record<string, unknown>): void {
    const logLevel = this.eventTypeToLogLevel(event.type);
    
    if (!this.shouldLog(logLevel)) {
      return;
    }

    const entry: LogEntry = {
      timestamp: new Date(),
      level: logLevel,
      message: `Event: ${event.type}`,
      context: event.context ?? this.context,
      metadata: {
        ...metadata,
        eventId: event.id,
        eventSource: event.source,
        payload: event.payload,
        handledBy: event.handledBy
      },
      traceId: event.traceId,
      userId: event.originUserId,
      source: this.constructor.name
    };

    this.writeLog(entry);
  }

  /**
   * Set the logging context
   */
  setContext(context: string): void {
    // Create new instance with updated context to maintain immutability
    Object.defineProperty(this, 'context', {
      value: context,
      writable: false,
      enumerable: true,
      configurable: false
    });
  }

  /**
   * Set the minimum log level
   */
  setLevel(level: LogLevel): void {
    this.level = level;
  }

  /**
   * Get current log level
   */
  getLevel(): LogLevel {
    return this.level;
  }

  /**
   * Check if a log level should be logged
   */
  protected shouldLog(level: LogLevel): boolean {
    return level >= this.level;
  }

  /**
   * Format a message with severity information
   */
  protected formatMessage(message: string, severity: Severity): string {
    return `[${severity}] ${message}`;
  }

  /**
   * Convert Severity to LogLevel
   */
  private severityToLogLevel(severity: Severity): LogLevel {
    switch (severity) {
      case Severity.DEBUG:
        return LogLevel.DEBUG;
      case Severity.INFO:
        return LogLevel.INFO;
      case Severity.WARN:
        return LogLevel.WARN;
      case Severity.ERROR:
        return LogLevel.ERROR;
      case Severity.CRITICAL:
        return LogLevel.CRITICAL;
      default:
        return LogLevel.INFO;
    }
  }

  /**
   * Convert EventType to LogLevel
   */
  private eventTypeToLogLevel(eventType: string): LogLevel {
    switch (eventType.toUpperCase()) {
      case 'ERROR':
        return LogLevel.ERROR;
      case 'WARNING':
        return LogLevel.WARN;
      case 'SECURITY':
      case 'AUDIT':
        return LogLevel.INFO;
      default:
        return LogLevel.DEBUG;
    }
  }

  /**
   * Abstract method for writing log entries
   */
  protected abstract writeLog(entry: LogEntry): void;
}
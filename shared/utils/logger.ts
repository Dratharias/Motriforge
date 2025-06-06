
/**
 * Structured Logger for MōtriForge
 * Provides consistent logging across all services with structured output
 */

export interface LogContext {
  [key: string]: unknown
}

export interface LogEntry {
  readonly level: LogLevel
  readonly message: string
  readonly timestamp: string
  context?: LogContext
  readonly error?: {
    readonly message: string
    readonly stack?: string
  }
}

export type LogLevel = 'debug' | 'info' | 'warn' | 'error'

/**
 * Logger class providing structured logging with different levels
 */
class Logger {
  private readonly serviceName: string
  private readonly minLevel: LogLevel

  constructor(serviceName: string = 'app', minLevel: LogLevel = 'info') {
    this.serviceName = serviceName
    this.minLevel = minLevel
  }

  /**
   * Debug level logging - for detailed diagnostic information
   */
  public debug(message: string, context?: LogContext): void {
    this.log('debug', message, context)
  }

  /**
   * Info level logging - for general information
   */
  public info(message: string, context?: LogContext): void {
    this.log('info', message, context)
  }

  /**
   * Warning level logging - for potentially harmful situations
   */
  public warn(message: string, context?: LogContext): void {
    this.log('warn', message, context)
  }

  /**
   * Error level logging - for error events
   */
  public error(message: string, context?: LogContext): void {
    this.log('error', message, context)
  }

  /**
   * Log an error object with stack trace
   */
  public logError(message: string, error: Error, context?: LogContext): void {
    this.log('error', message, {
      ...context,
      error: {
        message: error.message,
        stack: error.stack,
      },
    })
  }

  /**
   * Core logging method
   */
  private log(level: LogLevel, message: string, context?: LogContext): void {
    if (!this.shouldLog(level)) {
      return
    }

    const logEntry: LogEntry = {
      level,
      message,
      timestamp: new Date().toISOString(),
      ...(context && Object.keys(context).length > 0 && { context }),
    }

    // Add service name to context
    if (logEntry.context) {
      logEntry.context.service = this.serviceName
    } else {
      logEntry.context = { service: this.serviceName }
    }

    this.output(logEntry)
  }

  /**
   * Determine if log level should be output
   */
  private shouldLog(level: LogLevel): boolean {
    const levels: Record<LogLevel, number> = {
      debug: 0,
      info: 1,
      warn: 2,
      error: 3,
    }

    return levels[level] >= levels[this.minLevel]
  }

  /**
   * Output log entry to console
   */
  private output(logEntry: LogEntry): void {
    const output = JSON.stringify(logEntry)

    switch (logEntry.level) {
      case 'debug':
        console.debug(output)
        break
      case 'info':
        console.info(output)
        break
      case 'warn':
        console.warn(output)
        break
      case 'error':
        console.error(output)
        break
    }
  }
}

/**
 * Default logger instance
 */
export const logger = new Logger(
  process.env.SERVICE_NAME ?? 'motriforge',
  (process.env.LOG_LEVEL as LogLevel) ?? 'info'
)

/**
 * Create a logger instance for a specific service
 */
export function createLogger(serviceName: string, minLevel?: LogLevel): Logger {
  return new Logger(serviceName, minLevel)
}
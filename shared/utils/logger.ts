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

export class Logger {
  private readonly serviceName: string
  private readonly minLevel: LogLevel

  constructor(serviceName: string = 'app', minLevel: LogLevel = 'info') {
    this.serviceName = serviceName
    this.minLevel = minLevel
  }

  public debug(message: string, context?: LogContext): void {
    this.log('debug', message, context)
  }

  public info(message: string, context?: LogContext): void {
    this.log('info', message, context)
  }

  public warn(message: string, context?: LogContext): void {
    this.log('warn', message, context)
  }

  public error(message: string, context?: LogContext): void {
    this.log('error', message, context)
  }

  public logError(message: string, error: Error, context?: LogContext): void {
    this.log('error', message, {
      ...context,
      error: {
        message: error.message,
        stack: error.stack,
      },
    })
  }

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

    if (logEntry.context) {
      logEntry.context.service = this.serviceName
    } else {
      logEntry.context = { service: this.serviceName }
    }

    this.output(logEntry)
  }

  private shouldLog(level: LogLevel): boolean {
    const levels: Record<LogLevel, number> = {
      debug: 0,
      info: 1,
      warn: 2,
      error: 3,
    }

    return levels[level] >= levels[this.minLevel]
  }

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

export const logger: Logger = new Logger(
  process.env.SERVICE_NAME ?? 'motriforge',
  (process.env.LOG_LEVEL as LogLevel) ?? 'info'
)

export function createLogger(serviceName: string, minLevel?: LogLevel): Logger {
  return new Logger(serviceName, minLevel)
}
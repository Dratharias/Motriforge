import { Types } from 'mongoose';
import { LogLevel, ApplicationContext } from '@/types/shared/enums/common';
import { LogContext, LogEntry } from '@/types/shared/infrastructure/logging';
import { IFluentLogBuilder, ILogger } from '../interfaces/ILogger';

/**
 * Fixed Log Builder - Single responsibility: building complex log entries
 * Resolves interface conflicts and naming issues
 */
export class LogBuilder implements IFluentLogBuilder<LogBuilder> {
  private logLevel: LogLevel = LogLevel.INFO;
  private logMessage: string = '';
  private logContext: Partial<LogContext> = {};
  private logData: Record<string, any> = {};
  private logError?: Error;

  constructor(private readonly logger: ILogger) {}

  withLevel(level: LogLevel): this {
    this.logLevel = level;
    return this;
  }

  withMessage(message: string): this {
    this.logMessage = message;
    return this;
  }

  withContext(context: LogContext): this {
    this.logContext = { ...this.logContext, ...context };
    return this;
  }

  withData(data: Record<string, any>): this {
    this.logData = { ...this.logData, ...data };
    return this;
  }

  withError(error: Error): this {
    this.logError = error;
    return this;
  }

  withCorrelationId(correlationId: string): this {
    this.logContext.correlationId = correlationId;
    return this;
  }

  withUserId(userId: Types.ObjectId): this {
    this.logContext.userId = userId;
    return this;
  }

  withTags(tags: Record<string, string>): this {
    this.logData.tags = { ...this.logData.tags, ...tags };
    return this;
  }

  withDuration(duration: number): this {
    this.logData.duration = duration;
    return this;
  }

  withMetric(name: string, value: number): this {
    this.logData.metrics = { ...this.logData.metrics, [name]: value };
    return this;
  }

  withHttpStatus(status: number): this {
    this.logData.httpStatus = status;
    return this;
  }

  withUserAgent(userAgent: string): this {
    this.logData.userAgent = userAgent;
    return this;
  }

  withIpAddress(ipAddress: string): this {
    this.logData.ipAddress = ipAddress;
    return this;
  }

  debug(message: string): this {
    return this.withLevel(LogLevel.DEBUG).withMessage(message);
  }

  info(message: string): this {
    return this.withLevel(LogLevel.INFO).withMessage(message);
  }

  warn(message: string): this {
    return this.withLevel(LogLevel.WARN).withMessage(message);
  }

  // Fixed method name to avoid conflict
  error(message: string, error?: Error): this {
    this.withLevel(LogLevel.ERROR).withMessage(message);
    if (error) {
      this.withError(error);
    }
    return this;
  }

  fatal(message: string, error?: Error): this {
    this.withLevel(LogLevel.FATAL).withMessage(message);
    if (error) {
      this.withError(error);
    }
    return this;
  }

  build(): LogEntry {
    if (!this.logMessage) {
      throw new Error('Log message is required');
    }

    return {
      id: new Types.ObjectId(),
      timestamp: new Date(),
      level: this.logLevel,
      message: this.logMessage,
      context: this.logContext.applicationContext ?? ApplicationContext.USER,
      correlationId: this.logContext.correlationId,
      userId: this.logContext.userId,
      organizationId: this.logContext.organizationId,
      sessionId: this.logContext.sessionId,
      requestId: this.logContext.requestId,
      data: Object.keys(this.logData).length > 0 ? this.logData : undefined,
      error: this.logError ? {
        name: this.logError.name,
        message: this.logError.message,
        stack: this.logError.stack
      } : undefined,
      metadata: {
        source: this.logger.name,
        version: process.env.APP_VERSION ?? '1.0.0',
        environment: process.env.NODE_ENV ?? 'development',
        hostname: process.env.HOSTNAME ?? 'localhost',
        pid: process.pid,
        builtAt: new Date()
      }
    };
  }

  async log(): Promise<void> {
    const entry = this.build();
    await this.logger.log(
      entry.level, 
      entry.message, 
      entry.data, 
      this.logContext as LogContext
    );
  }

  reset(): this {
    this.logLevel = LogLevel.INFO;
    this.logMessage = '';
    this.logContext = {};
    this.logData = {};
    this.logError = undefined;
    return this;
  }

  clone(): LogBuilder {
    const cloned = new LogBuilder(this.logger);
    cloned.logLevel = this.logLevel;
    cloned.logMessage = this.logMessage;
    cloned.logContext = { ...this.logContext };
    cloned.logData = { ...this.logData };
    cloned.logError = this.logError;
    return cloned;
  }
}
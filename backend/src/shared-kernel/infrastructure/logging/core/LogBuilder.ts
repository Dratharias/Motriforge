import { Types } from "mongoose";
import { LogLevel } from "@/types/shared/common";
import { ApplicationContext } from "@/types/shared/enums/common";
import { LogContext, LogEntry } from "@/types/shared/infrastructure/logging";
import { IFluentLogBuilder, ILogger } from "../interfaces/ILogger";

/**
 * Builder for constructing complex log entries
 */
export class LogBuilder implements IFluentLogBuilder<LogBuilder> {
  private level: LogLevel = LogLevel.INFO;
  private message: string = '';
  private context: Partial<LogContext> = {};
  private data: Record<string, any> = {};
  private error?: Error;

  constructor(private readonly logger: ILogger) {}

  withLevel(level: LogLevel): this {
    this.level = level;
    return this;
  }

  withMessage(message: string): this {
    this.message = message;
    return this;
  }

  withContext(context: LogContext): this {
    this.context = { ...this.context, ...context };
    return this;
  }

  withData(data: Record<string, any>): this {
    this.data = { ...this.data, ...data };
    return this;
  }

  withError(error: Error): this {
    this.error = error;
    return this;
  }

  withCorrelationId(correlationId: string): this {
    this.context.correlationId = correlationId;
    return this;
  }

  withUserId(userId: Types.ObjectId): this {
    this.context.userId = userId;
    return this;
  }

  withOrganizationId(organizationId: Types.ObjectId): this {
    this.context.organizationId = organizationId;
    return this;
  }

  withSessionId(sessionId: string): this {
    this.context.sessionId = sessionId;
    return this;
  }

  withRequestId(requestId: string): this {
    this.context.requestId = requestId;
    return this;
  }

  withApplicationContext(applicationContext: ApplicationContext): this {
    this.context.applicationContext = applicationContext;
    return this;
  }

  withTags(tags: Record<string, string>): this {
    this.data.tags ??= {};
    this.data.tags = { ...this.data.tags, ...tags };
    return this;
  }

  // Additional fluent methods for common scenarios
  withDuration(duration: number): this {
    this.data.duration = duration;
    return this;
  }

  withMetric(name: string, value: number): this {
    this.data.metrics ??= {};
    this.data.metrics[name] = value;
    return this;
  }

  withHttpStatus(status: number): this {
    this.data.httpStatus = status;
    return this;
  }

  withUserAgent(userAgent: string): this {
    this.data.userAgent = userAgent;
    return this;
  }

  withIpAddress(ipAddress: string): this {
    this.data.ipAddress = ipAddress;
    return this;
  }

  // Convenience methods for setting level and message together
  debug(message: string): this {
    return this.withLevel(LogLevel.DEBUG).withMessage(message);
  }

  info(message: string): this {
    return this.withLevel(LogLevel.INFO).withMessage(message);
  }

  warn(message: string): this {
    return this.withLevel(LogLevel.WARN).withMessage(message);
  }

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
    if (!this.message) {
      throw new Error('Log message is required');
    }

    return {
      id: new Types.ObjectId(),
      timestamp: new Date(),
      level: this.level,
      message: this.message,
      context: this.context.applicationContext ?? ApplicationContext.USER,
      correlationId: this.context.correlationId,
      userId: this.context.userId,
      organizationId: this.context.organizationId,
      sessionId: this.context.sessionId,
      requestId: this.context.requestId,
      data: Object.keys(this.data).length > 0 ? this.data : undefined,
      error: this.error ? {
        name: this.error.name,
        message: this.error.message,
        stack: this.error.stack
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
      this.context as LogContext
    );
  }

  // Reset method to reuse the builder
  reset(): this {
    this.level = LogLevel.INFO;
    this.message = '';
    this.context = {};
    this.data = {};
    this.error = undefined;
    return this;
  }

  // Clone method to create a copy
  clone(): LogBuilder {
    const cloned = new LogBuilder(this.logger);
    cloned.level = this.level;
    cloned.message = this.message;
    cloned.context = { ...this.context };
    cloned.data = { ...this.data };
    cloned.error = this.error;
    return cloned;
  }
}
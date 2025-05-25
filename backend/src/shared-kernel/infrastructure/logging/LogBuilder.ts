import { Types } from "mongoose";
import { LogLevel } from "@/types/shared/common";
import { ApplicationContext } from "@/types/shared/enums/common";
import { LogContext, LogEntry, LogMetadata, IFluentLogBuilder, ILogger } from "@/types/shared/infrastructure/logging";
import { LogContextBuilder } from "./context/LogContextBuilder";
import { LogDataBuilder } from "./data/LogDataBuilder";
import { LogMetadataBuilder } from "./metadata/LogMetadataBuilder";
import { LogExecutor } from "./execution/LogExecutor";

/**
 * Main facade for log building - delegates to specialized builders
 */
export class LogBuilder implements IFluentLogBuilder<LogBuilder> {
  private logLevel: LogLevel = LogLevel.INFO;
  private logMessage: string = '';
  private errorInfo?: Error; // Renamed to avoid conflict

  private readonly contextBuilder: LogContextBuilder;
  private readonly dataBuilder: LogDataBuilder;
  private readonly metadataBuilder: LogMetadataBuilder;
  private readonly executor: LogExecutor;

  constructor(private readonly logger: ILogger) {
    this.contextBuilder = new LogContextBuilder();
    this.dataBuilder = new LogDataBuilder();
    this.metadataBuilder = new LogMetadataBuilder(logger.name);
    this.executor = new LogExecutor(logger);
  }

  // ===== LEVEL AND MESSAGE =====
  withLevel(level: LogLevel): this {
    this.logLevel = level;
    return this;
  }

  withMessage(message: string): this {
    this.logMessage = message;
    return this;
  }

  withError(error: Error): this {
    this.errorInfo = error;
    return this;
  }

  // ===== CONTEXT DELEGATION =====
  withContext(context: LogContext): this {
    this.contextBuilder.withContext(context);
    return this;
  }

  withCorrelationId(correlationId: string): this {
    this.contextBuilder.withCorrelationId(correlationId);
    return this;
  }

  withUserId(userId: Types.ObjectId): this {
    this.contextBuilder.withUserId(userId);
    return this;
  }

  withOrganizationId(organizationId: Types.ObjectId): this {
    this.contextBuilder.withOrganizationId(organizationId);
    return this;
  }

  withSessionId(sessionId: string): this {
    this.contextBuilder.withSessionId(sessionId);
    return this;
  }

  withRequestId(requestId: string): this {
    this.contextBuilder.withRequestId(requestId);
    return this;
  }

  withApplicationContext(applicationContext: ApplicationContext): this {
    this.contextBuilder.withApplicationContext(applicationContext);
    return this;
  }

  // ===== DATA DELEGATION =====
  withData(data: Record<string, any>): this {
    this.dataBuilder.withData(data);
    return this;
  }

  withTags(tags: Record<string, string>): this {
    this.dataBuilder.withTags(tags);
    return this;
  }

  withDuration(duration: number): this {
    this.dataBuilder.withDuration(duration);
    return this;
  }

  withMetric(name: string, value: number): this {
    this.dataBuilder.withMetric(name, value);
    return this;
  }

  withHttpStatus(status: number): this {
    this.dataBuilder.withHttpStatus(status);
    return this;
  }

  withUserAgent(userAgent: string): this {
    this.dataBuilder.withUserAgent(userAgent);
    return this;
  }

  withIpAddress(ipAddress: string): this {
    this.dataBuilder.withIpAddress(ipAddress);
    return this;
  }

  // ===== CONVENIENCE METHODS =====
  debug(message: string): this {
    return this.withLevel(LogLevel.DEBUG).withMessage(message);
  }

  info(message: string): this {
    return this.withLevel(LogLevel.INFO).withMessage(message);
  }

  warn(message: string): this {
    return this.withLevel(LogLevel.WARN).withMessage(message);
  }

  // Renamed method to avoid conflict
  logError(message: string, error?: Error): this {
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

  // ===== BUILD AND EXECUTE =====
  build(): LogEntry {
    if (!this.logMessage) {
      throw new Error('Log message is required');
    }

    const context = this.contextBuilder.build();
    const data = this.dataBuilder.build();
    const metadata = this.metadataBuilder.build();

    return {
      id: new Types.ObjectId(),
      timestamp: new Date(),
      level: this.logLevel,
      message: this.logMessage,
      context: context.applicationContext ?? ApplicationContext.USER,
      correlationId: context.correlationId,
      userId: context.userId,
      organizationId: context.organizationId,
      sessionId: context.sessionId,
      requestId: context.requestId,
      data: Object.keys(data).length > 0 ? data : undefined,
      error: this.errorInfo ? {
        name: this.errorInfo.name,
        message: this.errorInfo.message,
        stack: this.errorInfo.stack
      } : undefined,
      metadata
    };
  }

  async log(): Promise<void> {
    const entry = this.build();
    const context = this.contextBuilder.build();
    await this.executor.execute(entry, context);
  }

  reset(): this {
    this.logLevel = LogLevel.INFO;
    this.logMessage = '';
    this.errorInfo = undefined;
    this.contextBuilder.reset();
    this.dataBuilder.reset();
    this.metadataBuilder.reset();
    return this;
  }

  clone(): LogBuilder {
    const cloned = new LogBuilder(this.logger);
    cloned.logLevel = this.logLevel;
    cloned.logMessage = this.logMessage;
    cloned.errorInfo = this.errorInfo;
    cloned.contextBuilder.copyFrom(this.contextBuilder);
    cloned.dataBuilder.copyFrom(this.dataBuilder);
    return cloned;
  }
}

// ===== SPECIALIZED BUILDERS =====


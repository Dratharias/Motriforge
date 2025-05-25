import { Types } from 'mongoose';
import { LogContext } from '@/types/shared/infrastructure/logging';
import { IContextualLogger, ILogger } from './interfaces/ILogger';
import { LogLevel } from '@/types/shared/common';
import { ApplicationContext } from '@/types/shared/enums/common';

/**
 * Contextual Logger - single responsibility for context-aware logging
 */
export class ContextualLogger implements IContextualLogger {
  private readonly context: LogContext;

  constructor(
    private readonly baseLogger: ILogger,
    initialContext: Partial<LogContext> = {}
  ) {
    this.context = {
      applicationContext: ApplicationContext.USER,
      ...initialContext
    };
  }

  get name(): string {
    return this.baseLogger.name;
  }

  async log(level: LogLevel, message: string, data?: any, context?: LogContext): Promise<void> {
    const mergedContext = { ...this.context, ...context };
    await this.baseLogger.log(level, message, data, mergedContext);
  }

  async debug(message: string, data?: any, context?: LogContext): Promise<void> {
    await this.log(LogLevel.DEBUG, message, data, context);
  }

  async info(message: string, data?: any, context?: LogContext): Promise<void> {
    await this.log(LogLevel.INFO, message, data, context);
  }

  async warn(message: string, data?: any, context?: LogContext): Promise<void> {
    await this.log(LogLevel.WARN, message, data, context);
  }

  async error(message: string, error?: Error, data?: any, context?: LogContext): Promise<void> {
    await this.baseLogger.error(message, error, data, { ...this.context, ...context });
  }

  async fatal(message: string, error?: Error, data?: any, context?: LogContext): Promise<void> {
    await this.baseLogger.fatal(message, error, data, { ...this.context, ...context });
  }

  withContext(context: Partial<LogContext>): IContextualLogger {
    return new ContextualLogger(this.baseLogger, { ...this.context, ...context });
  }

  withCorrelationId(correlationId: string): IContextualLogger {
    return this.withContext({ correlationId });
  }

  withUserId(userId: Types.ObjectId): IContextualLogger {
    return this.withContext({ userId });
  }

  withOrganizationId(organizationId: Types.ObjectId): IContextualLogger {
    return this.withContext({ organizationId });
  }

  withSessionId(sessionId: string): IContextualLogger {
    return this.withContext({ sessionId });
  }

  withRequestId(requestId: string): IContextualLogger {
    return this.withContext({ requestId });
  }

  withApplicationContext(applicationContext: ApplicationContext): IContextualLogger {
    return this.withContext({ applicationContext });
  }

  getContext(): LogContext {
    return { ...this.context };
  }
}
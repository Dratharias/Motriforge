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
  private readonly defaultData: Record<string, any>;

  constructor(
    private readonly baseLogger: ILogger,
    initialContext: Partial<LogContext> = {},
    initialData: Record<string, any> = {}
  ) {
    this.context = {
      applicationContext: ApplicationContext.USER,
      ...initialContext
    };
    this.defaultData = { ...initialData };
  }

  get name(): string {
    return this.baseLogger.name;
  }

  async log(level: LogLevel, message: string, data?: any, context?: LogContext): Promise<void> {
    const mergedContext = { ...this.context, ...context };
    const mergedData = this.mergeData(data);
    await this.baseLogger.log(level, message, mergedData, mergedContext);
  }

  async debug(message: string, data?: any, context?: LogContext): Promise<void> {
    const mergedData = this.mergeData(data);
    await this.log(LogLevel.DEBUG, message, mergedData, context);
  }

  async info(message: string, data?: any, context?: LogContext): Promise<void> {
    const mergedData = this.mergeData(data);
    await this.log(LogLevel.INFO, message, mergedData, context);
  }

  async warn(message: string, data?: any, context?: LogContext): Promise<void> {
    const mergedData = this.mergeData(data);
    await this.log(LogLevel.WARN, message, mergedData, context);
  }

  async error(message: string, error?: Error, data?: any, context?: LogContext): Promise<void> {
    const mergedData = this.mergeData(data);
    await this.baseLogger.error(message, error, mergedData, { ...this.context, ...context });
  }

  async fatal(message: string, error?: Error, data?: any, context?: LogContext): Promise<void> {
    const mergedData = this.mergeData(data);
    await this.baseLogger.fatal(message, error, mergedData, { ...this.context, ...context });
  }

  withContext(context: Partial<LogContext>): IContextualLogger {
    return new ContextualLogger(this.baseLogger, { ...this.context, ...context }, this.defaultData);
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

  withData(data: Record<string, any>): IContextualLogger {
    const mergedData = { ...this.defaultData, ...data };
    return new ContextualLogger(this.baseLogger, this.context, mergedData);
  }

  withIpAddress(ipAddress: string): IContextualLogger {
    return this.withData({ ipAddress });
  }

  getContext(): LogContext {
    return { ...this.context };
  }

  getData(): Record<string, any> {
    return { ...this.defaultData };
  }

  private mergeData(data?: any): any {
    if (!data && Object.keys(this.defaultData).length === 0) {
      return undefined;
    }
    
    if (!data) {
      return { ...this.defaultData };
    }
    
    if (Object.keys(this.defaultData).length === 0) {
      return data;
    }
    
    return { ...this.defaultData, ...data };
  }
}
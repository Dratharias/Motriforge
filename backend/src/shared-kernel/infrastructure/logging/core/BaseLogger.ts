
import { ObjectId } from 'mongodb';
import { LogLevel, ApplicationContext } from '@/types/shared/enums/common';
import { LogEntry, LogContext } from '@/types/shared/infrastructure/logging';
import { 
  ILogger, 
  ILogStrategy, 
  ILogFilter, 
  ILogEventPublisher 
} from '../interfaces/ILogger';

/**
 * Core logger implementation - single responsibility for basic logging
 * Uses composition to avoid god object anti-pattern
 */
export class BaseLogger implements ILogger {
  private readonly strategies: Map<string, ILogStrategy> = new Map();
  private readonly filters: ILogFilter[] = [];
  private readonly eventPublisher: ILogEventPublisher;

  constructor(
    public readonly name: string,
    eventPublisher: ILogEventPublisher
  ) {
    this.eventPublisher = eventPublisher;
  }

  /**
   * Add a logging strategy
   */
  addStrategy(strategy: ILogStrategy): void {
    this.strategies.set(strategy.name, strategy);
  }

  /**
   * Remove a logging strategy
   */
  removeStrategy(strategyName: string): void {
    this.strategies.delete(strategyName);
  }

  /**
   * Add a log filter
   */
  addFilter(filter: ILogFilter): void {
    this.filters.push(filter);
  }

  /**
   * Core logging method
   */
  async log(level: LogLevel, message: string, data?: any, context?: LogContext): Promise<void> {
    try {
      const entry = this.createLogEntry(level, message, data, context);
      
      // Apply filters
      if (!this.shouldLog(entry)) {
        return;
      }

      // Transform entry if needed
      const transformedEntry = this.transformEntry(entry);

      // Write to all strategies
      await this.writeToStrategies(transformedEntry);

      // Publish event
      await this.eventPublisher.publishLogEntry(transformedEntry);
    } catch (error) {
      await this.handleLoggingError(error as Error, { level, message, data, context });
    }
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
    const errorData = error ? {
      ...data,
      error: {
        name: error.name,
        message: error.message,
        stack: error.stack
      }
    } : data;

    await this.log(LogLevel.ERROR, message, errorData, context);
  }

  async fatal(message: string, error?: Error, data?: any, context?: LogContext): Promise<void> {
    const errorData = error ? {
      ...data,
      error: {
        name: error.name,
        message: error.message,
        stack: error.stack
      }
    } : data;

    await this.log(LogLevel.FATAL, message, errorData, context);
  }

  /**
   * Create a log entry
   */
  private createLogEntry(level: LogLevel, message: string, data?: any, context?: LogContext): LogEntry {
    return {
      id: new ObjectId(),
      timestamp: new Date(),
      level,
      message,
      context: context?.applicationContext ?? ApplicationContext.USER,
      correlationId: context?.correlationId,
      userId: context?.userId,
      organizationId: context?.organizationId,
      sessionId: context?.sessionId,
      requestId: context?.requestId,
      data,
      metadata: {
        source: this.name,
        version: process.env.APP_VERSION ?? '1.0.0',
        environment: process.env.NODE_ENV ?? 'development',
        hostname: process.env.HOSTNAME ?? 'localhost',
        pid: process.pid
      }
    };
  }

  /**
   * Check if entry should be logged based on filters
   */
  private shouldLog(entry: LogEntry): boolean {
    return this.filters.every(filter => filter.shouldLog(entry));
  }

  /**
   * Transform entry using filters
   */
  private transformEntry(entry: LogEntry): LogEntry {
    return this.filters.reduce((transformedEntry, filter) => {
      return filter.transform ? filter.transform(transformedEntry) : transformedEntry;
    }, entry);
  }

  /**
   * Write to all strategies
   */
  private async writeToStrategies(entry: LogEntry): Promise<void> {
    const writePromises = Array.from(this.strategies.values()).map(strategy =>
      strategy.write(entry).catch(error => 
        this.handleStrategyError(strategy.name, error, entry)
      )
    );

    await Promise.allSettled(writePromises);
  }

  /**
   * Handle logging errors
   */
  private async handleLoggingError(error: Error, logData: any): Promise<void> {
    try {
      await this.eventPublisher.publishError(error);
      // Fallback to console if available
      console.error('Logging error:', error, 'Original log data:', logData);
    } catch (publishError) {
      // Ultimate fallback
      console.error('Critical logging failure:', error, publishError);
    }
  }

  /**
   * Handle strategy-specific errors
   */
  private async handleStrategyError(strategyName: string, error: Error, entry: LogEntry): Promise<void> {
    const errorMessage = `Strategy '${strategyName}' failed to write log entry`;
    console.error(errorMessage, error);
    
    try {
      await this.eventPublisher.publishError(new Error(errorMessage), entry);
    } catch (publishError) {
      console.error('Failed to publish strategy error:', publishError);
    }
  }
}


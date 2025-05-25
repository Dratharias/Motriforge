import { LogLevel } from "@/types/shared/common";
import { LogContext } from "@/types/shared/infrastructure/logging";

export class PerformanceLogDecorator extends BaseLogDecorator {
  get name(): string {
    return `Performance(${this.logger.name})`;
  }

  async log(level: LogLevel, message: string, data?: Record<string, any>, context?: LogContext): Promise<void> {
    const startTime = Date.now();
    
    try {
      await super.log(level, message, data, context);
    } finally {
      const duration = Date.now() - startTime;
      if (duration > 100) { // Log slow operations
        await super.log(
          LogLevel.WARN,
          `Slow log operation detected`,
          { ...data, logDuration: duration, originalMessage: message },
          context
        );
      }
    }
  }

  async debug(message: string, data?: Record<string, any>, context?: LogContext): Promise<void> {
    return this.log(LogLevel.DEBUG, message, data, context);
  }

  async info(message: string, data?: Record<string, any>, context?: LogContext): Promise<void> {
    return this.log(LogLevel.INFO, message, data, context);
  }

  async warn(message: string, data?: Record<string, any>, context?: LogContext): Promise<void> {
    return this.log(LogLevel.WARN, message, data, context);
  }

  async logError(message: string, errorInfo?: Error, data?: Record<string, any>, context?: LogContext): Promise<void> {
    return this.log(LogLevel.ERROR, message, data, context);
  }

  async fatal(message: string, errorInfo?: Error, data?: Record<string, any>, context?: LogContext): Promise<void> {
    return this.log(LogLevel.FATAL, message, data, context);
  }
}


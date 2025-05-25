import { LogLevel } from '@/types/shared/enums/common';
import { LogContext } from '@/types/shared/infrastructure/logging';
import { ILogger } from '../interfaces/ILogger';

export abstract class BaseLogDecorator implements ILogger {
  constructor(protected readonly logger: ILogger) {}

  get name(): string {
    return this.logger.name;
  }

  async debug(message: string, data?: Record<string, any>, context?: LogContext): Promise<void> {
    return this.logger.debug(message, data, context);
  }

  async info(message: string, data?: Record<string, any>, context?: LogContext): Promise<void> {
    return this.logger.info(message, data, context);
  }

  async warn(message: string, data?: Record<string, any>, context?: LogContext): Promise<void> {
    return this.logger.warn(message, data, context);
  }

  async error(message: string, error?: Error, data?: Record<string, any>, context?: LogContext): Promise<void> {
    return this.logger.error(message, error, data, context);
  }

  async fatal(message: string, error?: Error, data?: Record<string, any>, context?: LogContext): Promise<void> {
    return this.logger.fatal(message, error, data, context);
  }

  async log(level: LogLevel, message: string, data?: Record<string, any>, context?: LogContext): Promise<void> {
    return this.logger.log(level, message, data, context);
  }
}


import { LogLevel } from '@/types/shared/enums/common';
import { LogEntry, LogContext } from '@/types/shared/infrastructure/logging';
import { ILogger } from '../interfaces/ILogger';

export class LogExecutor {
  constructor(private readonly logger: ILogger) {}

  async execute(entry: LogEntry, context: Partial<LogContext>): Promise<void> {
    switch (entry.level) {
      case LogLevel.DEBUG:
        await this.logger.debug(entry.message, entry.data, context as LogContext);
        break;
      case LogLevel.INFO:
        await this.logger.info(entry.message, entry.data, context as LogContext);
        break;
      case LogLevel.WARN:
        await this.logger.warn(entry.message, entry.data, context as LogContext);
        break;
      case LogLevel.ERROR:
        await this.logger.error(
          entry.message, 
          entry.error ? new Error(entry.error.message) : undefined,
          entry.data, 
          context as LogContext
        );
        break;
      case LogLevel.FATAL:
        await this.logger.fatal(
          entry.message, 
          entry.error ? new Error(entry.error.message) : undefined,
          entry.data, 
          context as LogContext
        );
        break;
      default:
        await this.logger.log(entry.level, entry.message, entry.data, context as LogContext);
    }
  }
}


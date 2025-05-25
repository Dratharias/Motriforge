import { ILogger } from '../interfaces/ILogger';
import { ILoggerRegistry } from './ILoggerRegistry';
import { BaseLogger } from '../core/BaseLogger';
import { LogEventPublisher } from '../core/LogEventPublisher';

/**
 * Logger Registry - Single responsibility: managing logger instances
 */
export class LoggerRegistry implements ILoggerRegistry {
  private readonly loggers: Map<string, ILogger> = new Map();

  constructor(private readonly eventPublisher: LogEventPublisher) {}

  getLogger(name: string): ILogger {
    if (!this.loggers.has(name)) {
      this.loggers.set(name, this.createLogger(name));
    }
    return this.loggers.get(name)!;
  }

  hasLogger(name: string): boolean {
    return this.loggers.has(name);
  }

  removeLogger(name: string): void {
    this.loggers.delete(name);
  }

  getAllLoggers(): readonly ILogger[] {
    return Array.from(this.loggers.values());
  }

  clear(): void {
    this.loggers.clear();
  }

  private createLogger(name: string): ILogger {
    return new BaseLogger(name, this.eventPublisher);
  }
}


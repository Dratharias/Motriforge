import { LogContext } from '@/types/shared/infrastructure/logging';
import { 
  ILogger, 
  IContextualLogger, 
  IAuditLogger, 
  IPerformanceLogger, 
  ILogBuilder 
} from '../interfaces/ILogger';
import { ILoggerCreationFactory } from './ILoggerCreationFactory';
import { ILoggerRegistry } from '../registry/ILoggerRegistry';
import { ContextualLogger } from '../ContextualLogger';
import { AuditLogger } from '../AuditLogger';
import { PerformanceLogger } from '../PerformanceLogger';
import { LogBuilder } from '../core/LogBuilder';

/**
 * Logger Creation Factory - Single responsibility: creating different types of loggers
 */
export class LoggerCreationFactory implements ILoggerCreationFactory {
  constructor(private readonly loggerRegistry: ILoggerRegistry) {}

  createLogger(name: string): ILogger {
    return this.loggerRegistry.getLogger(name);
  }

  createContextualLogger(name: string, context?: Partial<LogContext>): IContextualLogger {
    const baseLogger = this.createLogger(name);
    return new ContextualLogger(baseLogger, context);
  }

  createAuditLogger(name: string = 'audit'): IAuditLogger {
    const baseLogger = this.createLogger(name);
    return new AuditLogger(baseLogger);
  }

  createPerformanceLogger(name: string = 'performance'): IPerformanceLogger {
    const baseLogger = this.createLogger(name);
    return new PerformanceLogger(baseLogger);
  }

  createBuilder(loggerName: string): ILogBuilder {
    const logger = this.createLogger(loggerName);
    return new LogBuilder(logger);
  }
}


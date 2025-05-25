import { LogContext } from '@/types/shared/infrastructure/logging';
import { 
  ILogger, 
  IContextualLogger, 
  IAuditLogger, 
  IPerformanceLogger, 
  ILogBuilder 
} from '../interfaces/ILogger';

export interface ILoggerCreationFactory {
  createLogger(name: string): ILogger;
  createContextualLogger(name: string, context?: Partial<LogContext>): IContextualLogger;
  createAuditLogger(name?: string): IAuditLogger;
  createPerformanceLogger(name?: string): IPerformanceLogger;
  createBuilder(loggerName: string): ILogBuilder;
}


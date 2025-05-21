import { LogLevel } from './LogLevel';
import { LoggerService } from './LoggerService';
import { LogContext } from './LogContext';

export class LoggerFacade {
  private readonly loggerService: LoggerService;
  private readonly component?: string;
  private readonly context: Partial<LogContext>;

  constructor(
    loggerService: LoggerService,
    component?: string,
    context: Partial<LogContext> = {}
  ) {
    this.loggerService = loggerService;
    this.component = component;
    this.context = context;
  }

  public trace(message: string, meta?: Record<string, any>): void {
    this.log(LogLevel.TRACE, message, meta);
  }

  public debug(message: string, meta?: Record<string, any>): void {
    this.log(LogLevel.DEBUG, message, meta);
  }

  public info(message: string, meta?: Record<string, any>): void {
    this.log(LogLevel.INFO, message, meta);
  }

  public warn(message: string, meta?: Record<string, any>): void {
    this.log(LogLevel.WARN, message, meta);
  }

  public error(message: string, error?: Error, meta?: Record<string, any>): void {
    if (error) {
      this.loggerService.error(message, error, this.addContext(meta));
    } else {
      this.log(LogLevel.ERROR, message, meta);
    }
  }

  public fatal(message: string, error?: Error, meta?: Record<string, any>): void {
    if (error) {
      const enhancedMeta = { ...this.addContext(meta), isFatal: true };
      this.loggerService.error(message, error, enhancedMeta);
    } else {
      this.log(LogLevel.FATAL, message, { ...meta, isFatal: true });
    }
  }

  public log(level: LogLevel, message: string, meta?: Record<string, any>): void {
    this.loggerService.log(level, message, this.addContext(meta));
  }

  public child(childContext: Record<string, any>): LoggerFacade {
    const childLogger = this.loggerService.createChildLogger(childContext);
    return new LoggerFacade(childLogger, this.component, { ...this.context, ...childContext });
  }

  public withContext(context: Record<string, any>): LoggerFacade {
    return new LoggerFacade(this.loggerService, this.component, { ...this.context, ...context });
  }

  public withComponent(component: string): LoggerFacade {
    return new LoggerFacade(this.loggerService, component, this.context);
  }

  public setLogLevel(level: LogLevel): void {
    this.loggerService.setLogLevel(level);
  }

  public getLogLevel(): LogLevel {
    // This is a simplified implementation - in a real system,
    // the logger service would expose this method
    return LogLevel.INFO;
  }

  private addContext(meta?: Record<string, any>): Record<string, any> {
    const result = { ...meta };
    
    if (this.component && !result.component) {
      result.component = this.component;
    }
    
    if (Object.keys(this.context).length > 0) {
      result.context = { ...this.context, ...result.context };
    }
    
    return result;
  }
}
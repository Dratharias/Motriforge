import { ErrorSeverity } from '@/types/errors';
import { ErrorLoggerConfig, ErrorLogEntry } from '@/types/errors/logger';
import { LoggerFacade } from '../logging/LoggerFacade';
import { ErrorContext } from './ErrorContext';
import { ErrorMetrics } from './ErrorMetrics';


export class ErrorLoggerService {
  private readonly logger: LoggerFacade;
  private readonly config: ErrorLoggerConfig;
  private readonly metrics: ErrorMetrics;
  private readonly recentErrors: ErrorLogEntry[] = [];

  constructor(
    logger: LoggerFacade,
    metrics: ErrorMetrics,
    config: ErrorLoggerConfig = {}
  ) {
    this.logger = logger;
    this.metrics = metrics;
    this.config = {
      maxLogEntries: 100,
      includeStack: true,
      maskSensitiveData: true,
      sensitiveKeys: ['password', 'token', 'secret', 'key', 'auth'],
      enableMetrics: true,
      ...config
    };
  }

  public logError(error: Error, context?: ErrorContext): void {
    this.logWithSeverity(error, ErrorSeverity.ERROR, context);
  }

  public logWarning(error: Error, context?: ErrorContext): void {
    this.logWithSeverity(error, ErrorSeverity.WARNING, context);
  }

  public logCritical(error: Error, context?: ErrorContext): void {
    this.logWithSeverity(error, ErrorSeverity.CRITICAL, context);
  }

  public getRecentErrors(): ErrorLogEntry[] {
    return [...this.recentErrors];
  }

  public getSeverity(error: Error): ErrorSeverity {
    if (error.name === 'ValidationError') {
      return ErrorSeverity.WARNING;
    }
    
    if (error.name === 'DatabaseError') {
      return ErrorSeverity.CRITICAL;
    }
    
    if (error.name === 'AuthError') {
      return ErrorSeverity.WARNING;
    }
    
    return ErrorSeverity.ERROR;
  }

  private logWithSeverity(error: Error, severity: ErrorSeverity, context?: ErrorContext): void {
    const formattedError = this.formatErrorForLogging(error, context);
    
    switch (severity) {
      case ErrorSeverity.DEBUG:
        this.logger.debug(`Error: ${error.message}`, formattedError);
        break;
      case ErrorSeverity.INFO:
        this.logger.info(`Error: ${error.message}`, formattedError);
        break;
      case ErrorSeverity.WARNING:
        this.logger.warn(`Warning: ${error.message}`, formattedError);
        break;
      case ErrorSeverity.ERROR:
        this.logger.error(`Error: ${error.message}`, error, formattedError);
        break;
      case ErrorSeverity.CRITICAL:
        this.logger.error(`Critical Error: ${error.message}`, error, { ...formattedError, isCritical: true });
        break;
      case ErrorSeverity.FATAL:
        this.logger.error(`Fatal Error: ${error.message}`, error, { ...formattedError, isFatal: true });
        break;
    }
    
    const logEntry: ErrorLogEntry = {
      error,
      context,
      severity,
      timestamp: new Date(),
      formattedError
    };
    
    this.recentErrors.unshift(logEntry);
    
    if (this.recentErrors.length > this.config.maxLogEntries!) {
      this.recentErrors.pop();
    }
    
    if (this.config.enableMetrics) {
      this.metrics.incrementErrorCount(error.name || 'Unknown');
      this.metrics.recordErrorTypes(error);
      if (context?.metadata?.statusCode) {
        this.metrics.recordStatusCode(context.metadata.statusCode as number);
      }
    }
  }

  private formatErrorForLogging(error: Error, context?: ErrorContext): Record<string, any> {
    const formatted: Record<string, any> = {
      name: error.name,
      message: error.message,
      timestamp: new Date().toISOString()
    };
    
    if (this.config.includeStack && this.shouldLogStack(error)) {
      formatted.stack = error.stack;
    }
    
    if ((error as any).code) {
      formatted.code = (error as any).code;
    }
    
    if ((error as any).cause) {
      formatted.cause = (error as any).cause instanceof Error 
        ? { name: (error as any).cause.name, message: (error as any).cause.message }
        : (error as any).cause;
    }
    
    if (context) {
      const sanitizedContext = this.config.maskSensitiveData 
        ? this.maskSensitiveData(context)
        : context;
      
      formatted.context = sanitizedContext;
      
      if (context.request) {
        formatted.request = {
          method: context.request.method,
          url: context.request.url,
          headers: this.sanitizeHeaders(context.request.headers)
        };
      }
      
      if (context.correlationId) {
        formatted.correlationId = context.correlationId;
      }
    }
    
    return formatted;
  }

  private shouldLogStack(error: Error): boolean {
    if (error.name === 'ValidationError') {
      return false;
    }
    return true;
  }

  private maskSensitiveData(obj: any): any {
    if (!obj || typeof obj !== 'object') {
      return obj;
    }
    
    if (Array.isArray(obj)) {
      return obj.map(item => this.maskSensitiveData(item));
    }
    
    const result: Record<string, any> = {};
    
    for (const [key, value] of Object.entries(obj)) {
      if (this.config.sensitiveKeys!.includes(key.toLowerCase())) {
        result[key] = '[REDACTED]';
      } else if (typeof value === 'object' && value !== null) {
        result[key] = this.maskSensitiveData(value);
      } else {
        result[key] = value;
      }
    }
    
    return result;
  }

  private sanitizeHeaders(headers: Headers): Record<string, string> {
    const result: Record<string, string> = {};
    
    headers.forEach((value, key) => {
      if (['authorization', 'cookie', 'x-api-key'].includes(key.toLowerCase())) {
        result[key] = '[REDACTED]';
      } else {
        result[key] = value;
      }
    });
    
    return result;
  }
}
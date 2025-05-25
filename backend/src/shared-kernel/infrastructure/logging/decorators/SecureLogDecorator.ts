import { LogLevel } from '@/types/shared/enums/common';
import { LogContext } from '@/types/shared/infrastructure/logging';
import { BaseLogDecorator } from './BaseLogDecorator';

export class SecureLogDecorator extends BaseLogDecorator {
  private readonly sensitiveFields = ['password', 'token', 'secret', 'key', 'apiKey', 'credential'];

  get name(): string {
    return `Secure(${this.logger.name})`;
  }

  async debug(message: string, data?: Record<string, any>, context?: LogContext): Promise<void> {
    const sanitizedData = this.sanitizeData(data);
    const sanitizedMessage = this.sanitizeMessage(message);
    return super.debug(sanitizedMessage, sanitizedData, context);
  }

  async info(message: string, data?: Record<string, any>, context?: LogContext): Promise<void> {
    const sanitizedData = this.sanitizeData(data);
    const sanitizedMessage = this.sanitizeMessage(message);
    return super.info(sanitizedMessage, sanitizedData, context);
  }

  async warn(message: string, data?: Record<string, any>, context?: LogContext): Promise<void> {
    const sanitizedData = this.sanitizeData(data);
    const sanitizedMessage = this.sanitizeMessage(message);
    return super.warn(sanitizedMessage, sanitizedData, context);
  }

  async error(message: string, error?: Error, data?: Record<string, any>, context?: LogContext): Promise<void> {
    const sanitizedData = this.sanitizeData(data);
    const sanitizedMessage = this.sanitizeMessage(message);
    return super.error(sanitizedMessage, error, sanitizedData, context);
  }

  async fatal(message: string, error?: Error, data?: Record<string, any>, context?: LogContext): Promise<void> {
    const sanitizedData = this.sanitizeData(data);
    const sanitizedMessage = this.sanitizeMessage(message);
    return super.fatal(sanitizedMessage, error, sanitizedData, context);
  }

  async log(level: LogLevel, message: string, data?: Record<string, any>, context?: LogContext): Promise<void> {
    const sanitizedData = this.sanitizeData(data);
    const sanitizedMessage = this.sanitizeMessage(message);
    return super.log(level, sanitizedMessage, sanitizedData, context);
  }

  private sanitizeData(data?: Record<string, any>): Record<string, any> | undefined {
    if (!data) return data;
    
    const sanitized = { ...data };
    
    for (const field of this.sensitiveFields) {
      if (field in sanitized) {
        sanitized[field] = '[REDACTED]';
      }
    }
    
    return sanitized;
  }

  private sanitizeMessage(message: string): string {
    // Basic sanitization - could be more sophisticated
    return message.replace(/\b(?:password|token|secret|key|apiKey|credential)\s*[:=]\s*\S+/gi, '[REDACTED]');
  }
}


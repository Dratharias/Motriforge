import { ApplicationError } from './exceptions/ApplicationError';
import { ValidationError } from './exceptions/ValidationError';
import { AuthError } from './exceptions/AuthError';
import { DatabaseError } from './exceptions/DatabaseError';
import { ErrorConfig, ErrorTypeConfig } from '@/types/errors';

export class ErrorFactory {
  private readonly errorConfig: ErrorConfig;
  private readonly errorTypes: Map<string, any>;

  constructor(errorConfig: ErrorConfig) {
    this.errorConfig = errorConfig;
    this.errorTypes = new Map();
    
    // Register default error types - fixing type issues
    this.registerErrorType('application', ApplicationError);
    this.registerErrorType('validation', ValidationError);
    this.registerErrorType('auth', AuthError);
    this.registerErrorType('database', DatabaseError);
  }

  public create(code: string, message: string, details?: any): ApplicationError {
    const errorType = this.getErrorTypeFromCode(code);
    const ErrorClass = this.getErrorType(errorType) ?? ApplicationError;
    const statusCode = this.getStatusCodeForError(code);
    
    const error = new ErrorClass(message, code);
    error.setStatusCode(statusCode);
    
    if (details) {
      error.setDetails(details);
    }
    
    const errorConfig = this.getErrorConfigForCode(code);
    if (errorConfig) {
      error.setOperational(errorConfig.isOperational);
    }
    
    return error;
  }

  public createFromCode(code: string, details?: any): ApplicationError {
    const message = this.getErrorMessage(code);
    return this.create(code, message, details);
  }

  public wrap(originalError: Error, code: string, message?: string): ApplicationError {
    const errorMessage = message ?? this.getErrorMessage(code) ?? originalError.message;
    const error = this.create(code, errorMessage);
    error.setCause(originalError);
    return error;
  }

  public registerErrorType(type: string, errorClass: any): void {
    // Check if the error class extends ApplicationError at runtime
    // instead of using TypeScript's type system
    if (errorClass.prototype instanceof ApplicationError || errorClass === ApplicationError) {
      this.errorTypes.set(type, errorClass);
    } else {
      throw new Error(`Error class must extend ApplicationError: ${errorClass.name}`);
    }
  }

  public getErrorType(type: string): any {
    return this.errorTypes.get(type) ?? null;
  }

  private getErrorMessage(code: string, defaultMessage?: string): string {
    const config = this.getErrorConfigForCode(code);
    return config?.message ?? this.errorConfig.defaultMessages[code] ?? defaultMessage ?? `Error: ${code}`;
  }

  private getErrorConfigForCode(code: string): ErrorTypeConfig | null {
    return this.errorConfig.errorTypes[code] ?? null;
  }

  private getStatusCodeForError(code: string): number {
    const config = this.getErrorConfigForCode(code);
    return config?.statusCode ?? this.errorConfig.statusCodes[code] ?? 500;
  }

  private getErrorTypeFromCode(code: string): string {
    const match = RegExp(/^([A-Z]+)_/).exec(code);
    return match ? match[1].toLowerCase() : 'application';
  }
}
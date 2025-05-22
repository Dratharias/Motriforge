import { ErrorContext } from "@/core/error/ErrorContext";
import { ErrorResult } from "@/core/error/ErrorResult";


/**
 * Interface for error handlers that process specific types of errors
 * and determine appropriate responses.
 */
export interface ErrorHandler {
  /**
   * Handle a specific error with optional context
   * 
   * @param error - The error to handle
   * @param context - Optional context information about where/how the error occurred
   * @returns Result of error handling with appropriate response information
   */
  handle(error: Error, context?: ErrorContext): ErrorResult;
  
  /**
   * Determines if this handler can handle the given error
   * 
   * @param error - The error to check
   * @returns True if this handler can handle the error
   */
  canHandle(error: Error): boolean;
  
  /**
   * Gets the priority of this handler
   * Higher priority handlers are checked first when multiple handlers can handle an error
   * 
   * @returns Priority value (higher is higher priority)
   */
  getPriority(): number;
}

/**
 * Configuration options for the AuthErrorHandler
 */
export interface AuthErrorConfig {
  loginRedirectUrl?: string;
  includeOriginalMessage?: boolean;
  includeDetails?: boolean;
  maxFailedAttempts?: number;
  rateLimitWindowSeconds?: number;
}

/**
 * Configuration options for the DatabaseErrorHandler
 */
export interface DatabaseErrorConfig {
  includeDetails?: boolean;
  includeOriginalMessage?: boolean;
  errorMessages?: Record<string, string>;
  retryOn?: string[];
}

/**
 * Configuration options for the ValidationErrorHandler
 */
export interface ValidationErrorConfig {
  logValidationErrors?: boolean;
  logLevel?: 'debug' | 'info' | 'warn' | 'error';
  includeDetails?: boolean;
}
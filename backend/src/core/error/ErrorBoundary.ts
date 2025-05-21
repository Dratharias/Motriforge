import { ErrorHandlingFacade } from './ErrorHandlingFacade';
import { ErrorContext } from './ErrorContext';

export interface ErrorBoundaryConfig {
  logErrors?: boolean;
  showDetails?: boolean;
  captureStackTrace?: boolean;
}

export class ErrorBoundary {
  private errorHandlingFacade: ErrorHandlingFacade;
  private config: ErrorBoundaryConfig;
  
  constructor(errorHandlingFacade: ErrorHandlingFacade, config: ErrorBoundaryConfig = {}) {
    this.errorHandlingFacade = errorHandlingFacade;
    this.config = {
      logErrors: true,
      showDetails: false,
      captureStackTrace: true,
      ...config
    };
  }

  /**
   * Wraps a function execution in an error boundary
   * @param fn Function to execute
   * @param onError Optional error handler
   * @returns Result of the function or fallback value
   */
  public wrap<T>(fn: () => T, onError?: (error: Error) => T | void): T {
    try {
      return fn();
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      this.logError(error);
      
      if (onError) {
        const result = onError(error);
        if (result !== undefined) {
          return result;
        }
      }
      
      throw error;
    }
  }

  /**
   * Wraps an async function execution in an error boundary
   * @param fn Async function to execute
   * @param onError Optional error handler
   * @returns Promise with the result or fallback value
   */
  public async wrapAsync<T>(fn: () => Promise<T>, onError?: (error: Error) => Promise<T> | T | void): Promise<T> {
    try {
      return await fn();
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      this.logError(error);
      
      if (onError) {
        const result = await onError(error);
        if (result !== undefined) {
          return result;
        }
      }
      
      throw error;
    }
  }

  /**
   * Logs an error using the error handling facade
   */
  private logError(error: Error): void {
    if (this.config.logErrors) {
      const errorContext = new ErrorContext({
        source: 'error-boundary',
        isClient: false,
        correlationId: crypto.randomUUID(),
        metadata: {
          stackTrace: this.config.captureStackTrace ? error.stack : undefined
        }
      });
      
      this.errorHandlingFacade.logError(error, errorContext);
    }
  }
}

/**
 * Creates a configured error boundary
 */
export function createErrorBoundary(
  errorHandlingFacade: ErrorHandlingFacade, 
  config?: ErrorBoundaryConfig
): ErrorBoundary {
  return new ErrorBoundary(errorHandlingFacade, config);
}
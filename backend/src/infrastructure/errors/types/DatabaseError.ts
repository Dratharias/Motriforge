import { BaseError } from '../base/BaseError.js';
import { Severity } from '../../../types/core/enums.js';

/**
 * Error for database operation failures
 */
export class DatabaseError extends BaseError {
  public readonly query: string;
  public readonly operation: string;
  public readonly table?: string;
  public readonly originalError: Error;

  constructor(
    query: string,
    operation: string,
    originalError: Error,
    table?: string,
    context?: string,
    traceId?: string,
    userId?: string
  ) {
    const message = `Database ${operation} failed: ${originalError.message}`;
    super(message, 'DATABASE_ERROR', Severity.ERROR, context, traceId, userId);
    this.query = query;
    this.operation = operation;
    this.table = table;
    this.originalError = originalError;
  }

  /**
   * Check if error is retryable
   */
  isRetryable(): boolean {
    const retryableErrors = [
      'connection timeout',
      'connection reset',
      'temporary failure',
      'deadlock',
      'lock timeout'
    ];
    
    const errorMessage = this.originalError.message.toLowerCase();
    return retryableErrors.some(retryable => errorMessage.includes(retryable));
  }

  /**
   * Check if error is due to connection issues
   */
  isConnectionError(): boolean {
    const connectionErrors = ['connection', 'network', 'timeout'];
    const errorMessage = this.originalError.message.toLowerCase();
    return connectionErrors.some(error => errorMessage.includes(error));
  }

  /**
   * Get suggested retry delay in milliseconds
   */
  getRetryDelay(): number {
    if (!this.isRetryable()) {
      return 0;
    }
    
    // Exponential backoff based on error type
    if (this.isConnectionError()) {
      return 1000; // 1 second for connection errors
    }
    
    return 5000; // 5 seconds for other retryable errors
  }

  /**
   * Override toJSON to include database-specific fields
   */
  toJSON(): Record<string, unknown> {
    return {
      ...super.toJSON(),
      query: this.query,
      operation: this.operation,
      table: this.table,
      originalError: this.originalError.message,
      isRetryable: this.isRetryable(),
      isConnectionError: this.isConnectionError()
    };
  }
}


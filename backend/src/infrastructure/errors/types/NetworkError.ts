import { BaseError } from '../base/BaseError';
import { Severity } from '../../../types/core/enums';

/**
 * Error for network operation failures
 */
export class NetworkError extends BaseError {
  public readonly url: string;
  public readonly method: string;
  public readonly statusCode?: number;
  public readonly originalError: Error;

  constructor(
    url: string,
    method: string,
    originalError: Error,
    statusCode?: number,
    context?: string,
    traceId?: string,
    userId?: string
  ) {
    const message = `Network ${method} request to ${url} failed: ${originalError.message}`;
    super(message, 'NETWORK_ERROR', Severity.ERROR, context, traceId, userId);
    this.url = url;
    this.method = method;
    this.statusCode = statusCode;
    this.originalError = originalError;
  }

  /**
   * Check if error is due to timeout
   */
  isTimeout(): boolean {
    const timeoutKeywords = ['timeout', 'etimedout', 'time out'];
    const errorMessage = this.originalError.message.toLowerCase();
    return timeoutKeywords.some(keyword => errorMessage.includes(keyword));
  }

  /**
   * Check if error is retryable based on status code
   */
  isRetryable(): boolean {
    if (this.isTimeout()) {
      return true;
    }
    
    if (!this.statusCode) {
      return true; // Network errors without status codes are usually retryable
    }
    
    // 5xx errors are retryable, 4xx errors are not
    return this.statusCode >= 500 && this.statusCode < 600;
  }

  /**
   * Check if error is client-side (4xx)
   */
  isClientError(): boolean {
    return this.statusCode !== undefined && this.statusCode >= 400 && this.statusCode < 500;
  }

  /**
   * Check if error is server-side (5xx)
   */
  isServerError(): boolean {
    return this.statusCode !== undefined && this.statusCode >= 500 && this.statusCode < 600;
  }

  /**
   * Get suggested retry delay in milliseconds
   */
  getRetryDelay(): number {
    if (!this.isRetryable()) {
      return 0;
    }
    
    if (this.isTimeout()) {
      return 2000; // 2 seconds for timeouts
    }
    
    if (this.statusCode === 429) { // Rate limiting
      return 60000; // 1 minute for rate limiting
    }
    
    return 5000; // 5 seconds for other retryable errors
  }

  /**
   * Override toJSON to include network-specific fields
   */
  toJSON(): Record<string, unknown> {
    return {
      ...super.toJSON(),
      url: this.url,
      method: this.method,
      statusCode: this.statusCode,
      originalError: this.originalError.message,
      isTimeout: this.isTimeout(),
      isRetryable: this.isRetryable(),
      isClientError: this.isClientError(),
      isServerError: this.isServerError()
    };
  }
}
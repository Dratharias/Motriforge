import { IError, IErrorWrapper } from '../../../types/core/interfaces';
import { ErrorType, Severity } from '../../../types/core/enums';

/**
 * Base error class that all application errors extend
 */
export abstract class BaseError extends Error implements IError {
  public readonly code: string;
  public readonly severity: Severity;
  public readonly timestamp: Date;
  public readonly context?: string;
  public readonly origin?: string;
  public readonly traceId?: string;
  public readonly userId?: string;

  constructor(
    message: string,
    code: string,
    severity: Severity = Severity.ERROR,
    context?: string,
    traceId?: string,
    userId?: string
  ) {
    super(message);
    this.name = this.constructor.name;
    this.code = code;
    this.severity = severity;
    this.timestamp = new Date();
    this.context = context;
    this.origin = this.constructor.name;
    this.traceId = traceId;
    this.userId = userId;

    // Maintain proper stack trace
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }

  /**
   * Convert error to JSON for logging/serialization
   */
  toJSON(): Record<string, unknown> {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      severity: this.severity,
      timestamp: this.timestamp.toISOString(),
      context: this.context,
      origin: this.origin,
      traceId: this.traceId,
      userId: this.userId,
      stack: this.stack
    };
  }

  /**
   * Create a wrapped version of this error
   */
  wrap(type: ErrorType, metadata?: Record<string, unknown>): IErrorWrapper {
    return {
      type,
      error: this,
      metadata
    };
  }
}


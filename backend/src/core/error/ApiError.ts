/**
 * Standardized API error response format that can be returned to clients.
 */
export class ApiError {
  /**
   * Unique error code identifying the type of error
   */
  errorCode: string;
  
  /**
   * Human-readable error message
   */
  message: string;
  
  /**
   * HTTP status code for the error
   */
  statusCode: number;
  
  /**
   * Additional error details, if available
   */
  details?: any;
  
  /**
   * Field-specific error messages for validation errors
   */
  errors?: Record<string, string>;
  
  /**
   * Correlation ID for tracing the error across the system
   */
  correlationId?: string;
  
  /**
   * Timestamp when the error occurred
   */
  timestamp: Date;
  
  /**
   * Request path that triggered the error
   */
  path?: string;
  
  constructor(
    errorCode: string,
    message: string,
    statusCode: number,
    details?: any,
    errors?: Record<string, string>
  ) {
    this.errorCode = errorCode;
    this.message = message;
    this.statusCode = statusCode;
    this.details = details;
    this.errors = errors;
    this.timestamp = new Date();
  }
  
  /**
   * Converts the ApiError to a plain object for serialization
   */
  toJSON(): Record<string, any> {
    return {
      errorCode: this.errorCode,
      message: this.message,
      statusCode: this.statusCode,
      details: this.details,
      errors: this.errors,
      correlationId: this.correlationId,
      timestamp: this.timestamp.toISOString(),
      path: this.path
    };
  }
}
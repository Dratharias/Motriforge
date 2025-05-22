/**
 * Standardized API error response format that can be returned to clients.
 */
export class ApiError {
  errorCode: string;
  message: string;
  statusCode: number;
  details?: any;
  errors?: Record<string, string>;
  correlationId?: string;
  timestamp: Date;
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
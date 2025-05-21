/**
 * Base class for all application-specific errors.
 * Extends the native Error class with additional properties and methods.
 */
export class ApplicationError extends Error {
  /**
   * Unique error code identifying the type of error
   */
  public code: string;
  
  /**
   * HTTP status code to use when returning this error
   */
  public statusCode: number;
  
  /**
   * Additional error details
   */
  public details?: any;
  
  /**
   * Original error that caused this error, if applicable
   */
  public cause?: Error;
  
  /**
   * Timestamp when the error occurred
   */
  public timestamp: Date;
  
  /**
   * Whether this error is operational (expected/handled) vs. programmer error
   */
  public isOperational: boolean;
  
  /**
   * Create a new ApplicationError
   * 
   * @param message - Human-readable error message
   * @param code - Unique error code
   * @param statusCode - HTTP status code (default: 500)
   * @param details - Additional error details
   * @param cause - Original error that caused this error
   */
  constructor(
    message: string,
    code: string,
    statusCode: number = 500,
    details?: any,
    cause?: Error
  ) {
    super(message);
    
    // Set the prototype explicitly to ensure instanceof works correctly
    Object.setPrototypeOf(this, ApplicationError.prototype);
    
    this.name = this.constructor.name;
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;
    this.cause = cause;
    this.timestamp = new Date();
    this.isOperational = true; // Most application errors are operational by default
    
    // Capture stack trace, excluding the constructor call
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }
  
  /**
   * Convert the error to a plain object for serialization
   */
  public toJSON(): Record<string, any> {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      statusCode: this.statusCode,
      details: this.details,
      timestamp: this.timestamp.toISOString(),
      isOperational: this.isOperational,
      stack: this.stack
    };
  }
  
  /**
   * Set the HTTP status code for this error
   * 
   * @param code - HTTP status code
   * @returns This error for method chaining
   */
  public setStatusCode(code: number): this {
    this.statusCode = code;
    return this;
  }
  
  /**
   * Set additional details for this error
   * 
   * @param details - Error details
   * @returns This error for method chaining
   */
  public setDetails(details: any): this {
    this.details = details;
    return this;
  }
  
  /**
   * Set the cause of this error
   * 
   * @param cause - Original error that caused this error
   * @returns This error for method chaining
   */
  public setCause(cause: Error): this {
    this.cause = cause;
    return this;
  }
  
  /**
   * Set whether this error is operational
   * 
   * @param isOperational - Whether this error is operational
   * @returns This error for method chaining
   */
  public setOperational(isOperational: boolean): this {
    this.isOperational = isOperational;
    return this;
  }
}
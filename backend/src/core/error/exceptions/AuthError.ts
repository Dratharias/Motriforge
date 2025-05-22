import { ApplicationError } from './ApplicationError';

/**
 * Error thrown when authentication or authorization fails
 */
export class AuthError extends ApplicationError {
  public userId?: string;
  public action?: string;
  
  /**
   * Create a new AuthError
   * 
   * @param message - Human-readable error message
   * @param code - Error code
   * @param statusCode - HTTP status code (default: 401)
   * @param userId - ID of the user related to the error
   * @param action - Action that the user was trying to perform
   */
  constructor(
    message: string,
    code: string,
    statusCode: number = 401,
    userId?: string,
    action?: string
  ) {
    super(message, code, statusCode);
    
    // Set the prototype explicitly to ensure instanceof works correctly
    Object.setPrototypeOf(this, AuthError.prototype);
    
    this.name = this.constructor.name;
    this.userId = userId;
    this.action = action;
  }
  
  /**
   * Set the user ID related to this authentication error
   * 
   * @param userId - User ID
   * @returns This error for method chaining
   */
  public setUserId(userId: string): this {
    this.userId = userId;
    return this;
  }
  
  /**
   * Set the action that the user was trying to perform
   * 
   * @param action - Action name
   * @returns This error for method chaining
   */
  public setAction(action: string): this {
    this.action = action;
    return this;
  }
  
  /**
   * Get a standardized error code based on this error
   * 
   * @returns Standardized error code
   */
  public getErrorCode(): string {
    return this.code;
  }
}

/**
 * Error thrown when token validation fails
 */
export class TokenExpiredError extends AuthError {
  constructor(message: string = 'Token has expired', userId?: string) {
    super(
      message,
      'TOKEN_EXPIRED',
      401,
      userId
    );
    Object.setPrototypeOf(this, TokenExpiredError.prototype);
    this.name = this.constructor.name;
  }
}

/**
 * Error thrown when credentials are invalid
 */
export class InvalidCredentialsError extends AuthError {
  constructor(message: string = 'Invalid credentials', userId?: string) {
    super(
      message,
      'INVALID_CREDENTIALS',
      401,
      userId
    );
    Object.setPrototypeOf(this, InvalidCredentialsError.prototype);
    this.name = this.constructor.name;
  }
}
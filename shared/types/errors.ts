/**
 * API Error class for consistent error handling across services
 * Extends native Error with additional metadata for API responses
 */
export class APIError extends Error {
  public readonly code: string
  public readonly statusCode: number
  public readonly details?: Record<string, unknown>

  constructor(
    code: string,
    message: string,
    statusCode: number = 500,
    details?: Record<string, unknown>
  ) {
    super(message)
    this.name = 'APIError'
    this.code = code
    this.statusCode = statusCode
    this.details = details

    // Maintains proper stack trace for where our error was thrown (only available on V8)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, APIError)
    }
  }

  /**
   * Convert error to JSON for API responses
   */
  public toJSON(): {
    name: string
    code: string
    message: string
    statusCode: number
    details?: Record<string, unknown>
  } {
    return {
      name: this.name,
      code: this.code,
      message: this.message,
      statusCode: this.statusCode,
      ...(this.details && { details: this.details }),
    }
  }

  /**
   * Create validation error
   */
  public static validation(message: string, details?: Record<string, unknown>): APIError {
    return new APIError('VALIDATION_ERROR', message, 400, details)
  }

  /**
   * Create not found error
   */
  public static notFound(resource: string, id?: string): APIError {
    const message = id ? `${resource} with id '${id}' not found` : `${resource} not found`
    return new APIError('NOT_FOUND', message, 404)
  }

  /**
   * Create unauthorized error
   */
  public static unauthorized(message: string = 'Unauthorized access'): APIError {
    return new APIError('UNAUTHORIZED', message, 401)
  }

  /**
   * Create forbidden error
   */
  public static forbidden(message: string = 'Forbidden access'): APIError {
    return new APIError('FORBIDDEN', message, 403)
  }

  /**
   * Create conflict error
   */
  public static conflict(message: string, details?: Record<string, unknown>): APIError {
    return new APIError('CONFLICT', message, 409, details)
  }

  /**
   * Create rate limit error
   */
  public static rateLimitExceeded(): APIError {
    return new APIError('RATE_LIMIT_EXCEEDED', 'Too many requests, please try again later', 429)
  }

  /**
   * Create internal server error
   */
  public static internal(message: string = 'Internal server error'): APIError {
    return new APIError('INTERNAL_SERVER_ERROR', message, 500)
  }

  /**
   * Create service unavailable error
   */
  public static serviceUnavailable(service: string): APIError {
    return new APIError('SERVICE_UNAVAILABLE', `${service} service is currently unavailable`, 503)
  }
}

/**
 * Database error types
 */
export class DatabaseError extends APIError {
  constructor(message: string, details?: Record<string, unknown>) {
    super('DATABASE_ERROR', message, 500, details)
    this.name = 'DatabaseError'
  }
}

/**
 * Validation error types
 */
export class ValidationError extends APIError {
  constructor(message: string, details?: Record<string, unknown>) {
    super('VALIDATION_ERROR', message, 400, details)
    this.name = 'ValidationError'
  }
}

/**
 * Authentication error types
 */
export class AuthenticationError extends APIError {
  constructor(message: string = 'Authentication failed') {
    super('AUTHENTICATION_ERROR', message, 401)
    this.name = 'AuthenticationError'
  }
}

/**
 * Authorization error types
 */
export class AuthorizationError extends APIError {
  constructor(message: string = 'Access forbidden') {
    super('AUTHORIZATION_ERROR', message, 403)
    this.name = 'AuthorizationError'
  }
}

/**
 * Business logic error types
 */
export class BusinessLogicError extends APIError {
  constructor(message: string, details?: Record<string, unknown>) {
    super('BUSINESS_LOGIC_ERROR', message, 422, details)
    this.name = 'BusinessLogicError'
  }
}

/**
 * External service error types
 */
export class ExternalServiceError extends APIError {
  constructor(service: string, message: string, details?: Record<string, unknown>) {
    super('EXTERNAL_SERVICE_ERROR', `${service}: ${message}`, 502, details)
    this.name = 'ExternalServiceError'
  }
}
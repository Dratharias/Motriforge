import { ErrorMapper } from '../ErrorMapper';
import { ApiError } from '../ApiError';
import { ApplicationError } from '../exceptions/ApplicationError';
import { ValidationError } from '../exceptions/ValidationError';
import { AuthError } from '../exceptions/AuthError';
import { DatabaseError, EntityNotFoundError, ConstraintViolationError } from '../exceptions/DatabaseError';

/**
 * Error mapper that maps application errors to HTTP API errors
 * with appropriate status codes.
 */
export class HttpErrorMapper implements ErrorMapper {
  /**
   * Map of error codes to HTTP status codes
   */
  private readonly errorCodeMap: Map<string, number>;
  
  /**
   * Create a new HttpErrorMapper
   */
  constructor() {
    this.errorCodeMap = new Map<string, number>([
      // Validation errors - 400 Bad Request
      ['VALIDATION_ERROR', 400],
      
      // Authentication errors - 401 Unauthorized
      ['AUTHENTICATION_FAILED', 401],
      ['INVALID_CREDENTIALS', 401],
      ['TOKEN_EXPIRED', 401],
      ['TOKEN_INVALID', 401],
      
      // Authorization errors - 403 Forbidden
      ['PERMISSION_DENIED', 403],
      ['INSUFFICIENT_PERMISSIONS', 403],
      
      // Not found errors - 404 Not Found
      ['ENTITY_NOT_FOUND', 404],
      ['RESOURCE_NOT_FOUND', 404],
      
      // Conflict errors - 409 Conflict
      ['CONFLICT', 409],
      ['CONSTRAINT_VIOLATION', 409],
      ['DUPLICATE_ENTRY', 409],
      
      // Business logic errors - 422 Unprocessable Entity
      ['BUSINESS_RULE_VIOLATION', 422],
      ['INVALID_STATE', 422],
      
      // Server errors - 500 Internal Server Error
      ['DATABASE_ERROR', 500],
      ['INTERNAL_SERVER_ERROR', 500],
      ['UNEXPECTED_ERROR', 500]
    ]);
  }
  
  /**
   * Map an error to a standardized API error
   * 
   * @param error - The error to map
   * @returns Standardized API error
   */
  public map(error: Error): ApiError {
    // If it's already an ApplicationError, use its properties
    if (error instanceof ApplicationError) {
      return new ApiError(
        error.code,
        error.message,
        error.statusCode,
        error.details
      );
    }
    
    // For ValidationError, include validation details
    if (error instanceof ValidationError) {
      const fieldErrors: Record<string, string> = {};
      for (const validationError of error.errors) {
        fieldErrors[validationError.field] = validationError.message;
      }
      
      return new ApiError(
        'VALIDATION_ERROR',
        error.message,
        400,
        error.details,
        fieldErrors
      );
    }
    
    // For EntityNotFoundError, use 404 status
    if (error instanceof EntityNotFoundError) {
      return new ApiError(
        'ENTITY_NOT_FOUND',
        error.message,
        404,
        {
          entityType: error.entityType,
          entityId: error.entityId
        }
      );
    }
    
    // For ConstraintViolationError, use 409 status
    if (error instanceof ConstraintViolationError) {
      return new ApiError(
        'CONSTRAINT_VIOLATION',
        error.message,
        409,
        {
          constraintName: error.constraintName
        }
      );
    }
    
    // For other DatabaseErrors, use 500 status
    if (error instanceof DatabaseError) {
      return new ApiError(
        'DATABASE_ERROR',
        'A database error occurred',
        500
      );
    }
    
    // For AuthErrors, use appropriate auth status
    if (error instanceof AuthError) {
      return new ApiError(
        error.code,
        error.message,
        this.getStatusCode(error)
      );
    }
    
    // For unknown errors, create a generic server error
    return new ApiError(
      'INTERNAL_SERVER_ERROR',
      'An unexpected error occurred',
      500
    );
  }
  
  /**
   * Determines if this mapper can map the given error
   * 
   * @param error - The error to check
   * @returns Always true, as this mapper can handle any error
   */
  public canMap(error: Error): boolean {
    return true; // This mapper can handle any error
  }
  
  /**
   * Gets the priority of this mapper
   * 
   * @returns Low priority, so more specific mappers can be tried first
   */
  public getPriority(): number {
    return 0; // Low priority
  }
  
  /**
   * Get the HTTP status code for an error
   * 
   * @param error - Error to get status code for
   * @returns HTTP status code
   */
  private getStatusCode(error: Error): number {
    if (error instanceof ApplicationError) {
      return error.statusCode;
    }
    
    // Look up the status code by error code
    if ('code' in error && typeof (error as any).code === 'string') {
      const code = (error as any).code;
      const statusCode = this.errorCodeMap.get(code);
      if (statusCode) {
        return statusCode;
      }
    }
    
    // Map Node.js error codes to HTTP status codes
    if ('code' in error && typeof (error as any).code === 'string') {
      const code = (error as any).code;
      
      switch (code) {
        case 'ENOENT':
          return 404; // Not Found
        case 'EACCES':
          return 403; // Forbidden
        case 'ETIMEDOUT':
        case 'ESOCKETTIMEDOUT':
          return 504; // Gateway Timeout
        default:
          break;
      }
    }
    
    return 500; // Internal Server Error by default
  }
  
  /**
   * Map an error code to an HTTP status code
   * 
   * @param errorCode - Error code
   * @returns HTTP status code
   */
  private mapErrorCode(errorCode: string): number {
    return this.errorCodeMap.get(errorCode) ?? 500;
  }
}
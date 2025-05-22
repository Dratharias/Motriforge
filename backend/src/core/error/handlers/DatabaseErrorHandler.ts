import { DatabaseError, EntityNotFoundError, ConstraintViolationError } from '../exceptions/DatabaseError';
import { ErrorContext } from '../ErrorContext';
import { ErrorResult } from '../ErrorResult';
import { ApiError } from '../ApiError';
import { LoggerFacade } from '../../logging/LoggerFacade';
import { v4 as uuidv4 } from 'uuid';
import { DatabaseErrorConfig, ErrorAction, ErrorHandler } from '@/types/errors';


/**
 * Handler for database errors
 */
export class DatabaseErrorHandler implements ErrorHandler {
  /**
   * Configuration options
   */
  private readonly config: DatabaseErrorConfig;
  
  /**
   * Logger for database errors
   */
  private readonly logger: LoggerFacade;
  
  /**
   * Create a new DatabaseErrorHandler
   * 
   * @param config - Configuration options
   * @param logger - Logger instance
   */
  constructor(config: DatabaseErrorConfig, logger: LoggerFacade) {
    this.config = {
      includeDetails: false,
      includeOriginalMessage: false,
      errorMessages: {},
      retryOn: [],
      ...config
    };
    
    this.logger = logger.withComponent('DatabaseErrorHandler');
  }
  
  /**
   * Handle a database error
   * 
   * @param error - Database error to handle
   * @param context - Error context
   * @returns Error handling result
   */
  public handle(error: Error, context?: ErrorContext): ErrorResult {
    if (!(error instanceof DatabaseError)) {
      throw new Error(`DatabaseErrorHandler cannot handle error of type ${error.constructor.name}`);
    }
    
    const dbError = error;
    const correlationId = context?.correlationId ?? uuidv4();
    
    // Log the database error
    this.logger.error(
      `Database error in operation '${dbError.operation}': ${dbError.message}`,
      dbError.cause,
      {
        collection: dbError.collection,
        query: this.sanitizeDatabaseError(dbError),
        correlationId,
        path: context?.request?.path,
        userId: context?.user?.id
      }
    );
    
    // Map the database error to an application error
    const mappedError = this.mapDatabaseError(dbError);
    
    // Create API error from mapped error
    const apiError = new ApiError(
      mappedError.code,
      this.config.includeOriginalMessage ? mappedError.message : 'A database error occurred',
      mappedError.statusCode,
      this.config.includeDetails ? this.sanitizeDatabaseError(dbError) : undefined
    );
    
    apiError.correlationId = correlationId;
    
    if (context?.request) {
      apiError.path = context.request.path;
    }
    
    // Determine if we should retry the operation
    const shouldRetry = this.config.retryOn?.includes(dbError.code);
    
    return new ErrorResult(
      true,
      apiError,
      correlationId,
      undefined,
      undefined,
      shouldRetry ? ErrorAction.RETRY : ErrorAction.NOTIFY
    );
  }
  
  /**
   * Check if this handler can handle the given error
   * 
   * @param error - Error to check
   * @returns True if this handler can handle the error
   */
  public canHandle(error: Error): boolean {
    return error instanceof DatabaseError;
  }
  
  /**
   * Get the priority of this handler
   * 
   * @returns Priority value
   */
  public getPriority(): number {
    return 90; // High priority but lower than validation
  }
  
  /**
   * Map a database error to an application error
   * This could be expanded to handle specific database error codes
   * 
   * @param error - Database error
   * @returns Mapped application error
   */
  private mapDatabaseError(error: DatabaseError): DatabaseError {
    // Handle specific types of database errors
    if (error instanceof EntityNotFoundError) {
      return error; // Already properly mapped
    }
    
    if (error instanceof ConstraintViolationError) {
      return error; // Already properly mapped
    }
    
    // Map MongoDB-specific error codes (if using MongoDB)
    if (error.cause) {
      const mongoError = error.cause as any;
      
      // Handle specific MongoDB error codes
      if (mongoError.code === 11000) {
        // Duplicate key error
        return new ConstraintViolationError(
          'unique_constraint',
          'A record with this identifier already exists',
          error.collection
        );
      }
    }
    
    // Return the original error if no specific mapping applies
    return error;
  }
  
  /**
   * Sanitize database error details to remove sensitive information
   * 
   * @param error - Database error
   * @returns Sanitized error details
   */
  private sanitizeDatabaseError(error: DatabaseError): Record<string, any> {
    const sanitized: Record<string, any> = {
      operation: error.operation,
      collection: error.collection
    };
    
    // Include a safe version of the query if available
    if (error.query) {
      // Remove potentially sensitive fields from query
      const sensitiveFields = ['password', 'token', 'secret', 'apiKey', 'creditCard'];
      
      const safeQuery = { ...error.query };
      
      for (const field of sensitiveFields) {
        if (field in safeQuery) {
          safeQuery[field] = '***REDACTED***';
        }
      }
      
      sanitized.query = safeQuery;
    }
    
    return sanitized;
  }
}
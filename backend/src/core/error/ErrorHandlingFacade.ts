import { ErrorHandlerRegistry } from './ErrorHandlerRegistry';
import { ErrorMapperRegistry } from './ErrorMapperRegistry';
import { ErrorFormatterRegistry } from './ErrorFormatterRegistry';
import { LoggerFacade } from '../logging/LoggerFacade';
import { EventMediator } from '../events/EventMediator';
import { ErrorContext } from './ErrorContext';
import { ErrorResult } from './ErrorResult';
import { ApiError } from './ApiError';
import { FormattedError } from './FormattedError';
import { ApplicationError } from './exceptions/ApplicationError';
import { v4 as uuidv4 } from 'uuid';

/**
 * Main entry point for application error handling.
 * Coordinates between various error handling components to provide
 * a consistent error handling experience.
 */
export class ErrorHandlingFacade {
  /**
   * Registry of error handlers
   */
  private readonly errorHandlerRegistry: ErrorHandlerRegistry;
  
  /**
   * Registry of error mappers
   */
  private readonly errorMapperRegistry: ErrorMapperRegistry;
  
  /**
   * Registry of error formatters
   */
  private readonly errorFormatterRegistry: ErrorFormatterRegistry;
  
  /**
   * Logger for error handling
   */
  private readonly logger: LoggerFacade;
  
  /**
   * Event mediator for publishing error events
   */
  private readonly eventMediator: EventMediator;
  
  /**
   * Create a new ErrorHandlingFacade
   * 
   * @param errorHandlerRegistry - Registry of error handlers
   * @param errorMapperRegistry - Registry of error mappers
   * @param errorFormatterRegistry - Registry of error formatters
   * @param logger - Logger instance
   * @param eventMediator - Event mediator instance
   */
  constructor(
    errorHandlerRegistry: ErrorHandlerRegistry,
    errorMapperRegistry: ErrorMapperRegistry,
    errorFormatterRegistry: ErrorFormatterRegistry,
    logger: LoggerFacade,
    eventMediator: EventMediator
  ) {
    this.errorHandlerRegistry = errorHandlerRegistry;
    this.errorMapperRegistry = errorMapperRegistry;
    this.errorFormatterRegistry = errorFormatterRegistry;
    this.logger = logger.withComponent('ErrorHandlingFacade');
    this.eventMediator = eventMediator;
  }
  
  /**
   * Handle an error with the appropriate handler
   * 
   * @param error - Error to handle
   * @param context - Optional context information about where/how the error occurred
   * @returns Result of error handling with appropriate response information
   */
  public handleError(error: Error, context?: ErrorContext): ErrorResult {
    try {
      // Get the appropriate handler for this error
      const handler = this.errorHandlerRegistry.getHandler(error);
      
      // Use the handler to handle the error
      const result = handler.handle(error, context);
      
      // Publish error event for monitoring/metrics
      this.publishErrorEvent(error, result, context);
      
      return result;
    } catch (handlerError) {
      // If error handling itself fails, log and return a generic error
      this.logger.error(
        'Error occurred during error handling',
        handlerError as Error,
        { originalError: error, context }
      );
      
      const correlationId = context?.correlationId ?? uuidv4();
      
      const apiError = new ApiError(
        'INTERNAL_SERVER_ERROR',
        'An unexpected error occurred',
        500
      );
      
      apiError.correlationId = correlationId;
      
      if (context?.request) {
        apiError.path = context.request.path;
      }
      
      return new ErrorResult(false, apiError, correlationId);
    }
  }
  
  /**
   * Format an error for a specific output format
   * 
   * @param error - Error to format
   * @param format - Output format (e.g., 'json', 'html')
   * @returns Formatted error
   */
  public formatError(error: Error | ApiError, format: string = 'json'): FormattedError {
    try {
      // If the error is already an ApiError, format it directly
      if ('errorCode' in error && 'statusCode' in error) {
        const formatter = this.errorFormatterRegistry.getFormatter(format);
        return formatter.format(error);
      }
      
      // Otherwise, map it to an ApiError first
      const apiError = this.mapToApiError(error);
      const formatter = this.errorFormatterRegistry.getFormatter(format);
      return formatter.format(apiError);
    } catch (formattingError) {
      this.logger.error(
        'Error occurred during error formatting',
        formattingError as Error,
        { originalError: error, format }
      );
      
      // Return a simple JSON error as fallback
      return {
        content: JSON.stringify({ 
          error: 'Internal Server Error',
          message: 'An unexpected error occurred'
        }),
        contentType: 'application/json',
        statusCode: 500
      };
    }
  }
  
  /**
   * Map an error to a standardized API error
   * 
   * @param error - Error to map
   * @returns Standardized API error
   */
  public mapToApiError(error: Error): ApiError {
    try {
      const mapper = this.errorMapperRegistry.getMapper(error);
      return mapper.map(error);
    } catch (mappingError) {
      this.logger.error(
        'Error occurred during error mapping',
        mappingError as Error,
        { originalError: error }
      );
      
      // Return a generic API error as fallback
      return new ApiError(
        'INTERNAL_SERVER_ERROR',
        'An unexpected error occurred',
        500
      );
    }
  }
  
  /**
   * Create a new application error
   * 
   * @param code - Error code
   * @param message - Error message
   * @param details - Additional error details
   * @returns New application error
   */
  public createError(code: string, message: string, details?: any): ApplicationError {
    return new ApplicationError(message, code, 500, details);
  }
  
  /**
   * Wrap an original error with additional context
   * 
   * @param originalError - Original error
   * @param message - New error message
   * @returns Wrapped application error
   */
  public wrapError(originalError: Error, message: string): ApplicationError {
    return new ApplicationError(
      message,
      'WRAPPED_ERROR',
      500,
      undefined,
      originalError
    );
  }
  
  /**
   * Log an error with the appropriate logger
   * 
   * @param error - Error to log
   * @param context - Optional error context
   */
  public logError(error: Error, context?: ErrorContext): void {
    // Determine severity based on error type and context
    const isOperational = this.isApplicationError(error) && 
      (error as ApplicationError).isOperational;
    
    const logger = this.logger.withContext({
      correlationId: context?.correlationId,
      userId: context?.user?.id,
      path: context?.request?.path
    });
    
    if (isOperational) {
      // Operational errors are expected and can be handled, so log at warning level
      logger.warn(
        `Operational error: ${error.message}`,
        { error, context }
      );
    } else {
      // Non-operational errors are unexpected and might indicate bugs, so log at error level
      logger.error(
        `Non-operational error: ${error.message}`,
        error,
        { context }
      );
    }
  }
  
  /**
   * Check if an error is an application error
   * 
   * @param error - Error to check
   * @returns True if the error is an application error
   */
  public isApplicationError(error: any): boolean {
    return error instanceof ApplicationError;
  }
  
  /**
   * Check if an error is a known error type that we have specific handling for
   * 
   * @param error - Error to check
   * @returns True if the error is a known error type
   */
  public isKnownError(error: any): boolean {
    return this.errorHandlerRegistry.getHandler(error as Error) !== undefined;
  }
  
  /**
   * Publish an error event for monitoring and metrics
   * 
   * @param error - Original error
   * @param result - Error handling result
   * @param context - Error context
   */
  private publishErrorEvent(error: Error, result: ErrorResult, context?: ErrorContext): void {
    this.eventMediator.publish({
      type: 'error.occurred',
      payload: {
        errorType: error.constructor.name,
        message: error.message,
        handled: result.handled,
        statusCode: result.error.statusCode,
        correlationId: result.correlationId,
        path: context?.request?.path,
        timestamp: new Date()
      }
    });
  }
}
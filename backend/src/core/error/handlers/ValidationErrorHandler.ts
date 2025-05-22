import { ErrorContext } from '../ErrorContext';
import { ErrorResult } from '../ErrorResult';
import { ApiError } from '../ApiError';
import { LoggerFacade } from '../../logging/LoggerFacade';
import { v4 as uuidv4 } from 'uuid';
import { ErrorAction, ErrorHandler, ValidationErrorConfig, ValidationErrorDetail } from '@/types/errors';
import { ValidationError } from '../exceptions/ValidationError';



/**
 * Handler for validation errors
 */
export class ValidationErrorHandler implements ErrorHandler {
  /**
   * Configuration options
   */
  private readonly config: ValidationErrorConfig;
  
  /**
   * Logger for validation errors
   */
  private readonly logger: LoggerFacade;
  
  /**
   * Create a new ValidationErrorHandler
   * 
   * @param config - Configuration options
   * @param logger - Logger instance
   */
  constructor(config: ValidationErrorConfig, logger: LoggerFacade) {
    this.config = {
      logValidationErrors: true,
      logLevel: 'debug',
      includeDetails: true,
      ...config
    };
    
    this.logger = logger.withComponent('ValidationErrorHandler');
  }
  
  /**
   * Handle a validation error
   * 
   * @param error - Validation error to handle
   * @param context - Error context
   * @returns Error handling result
   */
  public handle(error: Error, context?: ErrorContext): ErrorResult {
    if (!(error instanceof ValidationError)) {
      throw new Error(`ValidationErrorHandler cannot handle error of type ${error.constructor.name}`);
    }
    
    const validationError = error;
    const correlationId = context?.correlationId ?? uuidv4();
    
    // Log the validation error if configured to do so
    if (this.config.logValidationErrors && this.shouldLogValidationError(validationError)) {
      // Create a metadata object for the third parameter
      const metadata = {
        errorDetails: validationError.errors,
        correlationId,
        path: context?.request?.path,
        userId: context?.user?.id
      };
      
      // Logger signature: logger.debug(message, error?, metadata?)
      this.logger[this.config.logLevel ?? 'debug'](
        `Validation failed: ${validationError.message}`,
        validationError,  // Pass the actual error as second parameter
        metadata          // Pass metadata as third parameter
      );
    }
    
    // Create API error from validation error
    const apiError = new ApiError(
      'VALIDATION_ERROR',
      validationError.message,
      400,
      this.config.includeDetails ? validationError.details : undefined,
      this.formatValidationErrors(validationError.errors)
    );
    
    apiError.correlationId = correlationId;
    
    if (context?.request) {
      apiError.path = context.request.path;
    }
    
    return new ErrorResult(
      true, // Validation errors are always considered handled
      apiError,
      correlationId,
      undefined,
      undefined,
      ErrorAction.NOTIFY
    );
  }
  
  /**
   * Check if this handler can handle the given error
   * 
   * @param error - Error to check
   * @returns True if this handler can handle the error
   */
  public canHandle(error: Error): boolean {
    return error instanceof ValidationError;
  }
  
  /**
   * Get the priority of this handler
   * 
   * @returns Priority value
   */
  public getPriority(): number {
    return 100; // High priority for validation errors
  }
  
  /**
   * Format validation errors into a field-message map
   * 
   * @param errors - Validation error details
   * @returns Map of field names to error messages
   */
  private formatValidationErrors(errors: ValidationErrorDetail[]): Record<string, string> {
    const result: Record<string, string> = {};
    
    for (const error of errors) {
      // If there are multiple errors for the same field, we'll use the last one
      // This could be enhanced to concatenate messages or use arrays instead
      result[error.field] = error.message;
    }
    
    return result;
  }
  
  /**
   * Determine if a validation error should be logged
   * 
   * @param error - Validation error
   * @returns True if the error should be logged
   */
  private shouldLogValidationError(error: ValidationError): boolean {
    // Example logic: could filter based on error severity, field names, etc.
    // For now, log all validation errors that have at least one error detail
    return error.errors.length > 0;
  }
}
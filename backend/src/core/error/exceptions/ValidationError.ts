import { ValidationErrorDetail } from '@/types/errors';
import { ApplicationError } from './ApplicationError';


/**
 * Error thrown when validation fails for user input
 */
export class ValidationError extends ApplicationError {
  public errors: ValidationErrorDetail[];
  public field?: string;
  public constraint?: string;
  
  /**
   * Create a new ValidationError
   * 
   * @param message - Human-readable error message
   * @param errors - List of validation errors
   * @param code - Error code (default: 'VALIDATION_ERROR')
   */
  constructor(
    message: string = 'Validation failed',
    errors: ValidationErrorDetail[] = [],
    code: string = 'VALIDATION_ERROR'
  ) {
    super(message, code, 400);
    
    // Set the prototype explicitly to ensure instanceof works correctly
    Object.setPrototypeOf(this, ValidationError.prototype);
    
    this.name = this.constructor.name;
    this.errors = errors;
    
    // If there's only one error, set field and constraint for convenience
    if (errors.length === 1) {
      this.field = errors[0].field;
      this.constraint = errors[0].constraint;
    }
  }
  
  /**
   * Check if this validation error has any error details
   */
  public hasErrors(): boolean {
    return this.errors.length > 0;
  }
  
  /**
   * Add a validation error for a specific field
   * 
   * @param field - Field that failed validation
   * @param message - Error message
   * @param constraint - Constraint that failed
   * @returns This error for method chaining
   */
  public addError(field: string, message: string, constraint?: string): this {
    this.errors.push({ field, message, constraint });
    return this;
  }
  
  /**
   * Get all errors for a specific field
   * 
   * @param field - Field name
   * @returns List of validation errors for the field
   */
  public getFieldErrors(field: string): ValidationErrorDetail[] {
    return this.errors.filter(error => error.field === field);
  }
  
  /**
   * Convert the validation error to a plain object for serialization
   */
  public override toJSON(): Record<string, any> {
    const json = super.toJSON();
    
    // Convert errors to a field-message map for easier client consumption
    const fieldErrors: Record<string, string> = {};
    for (const error of this.errors) {
      fieldErrors[error.field] = error.message;
    }
    
    return {
      ...json,
      errors: this.errors,
      fieldErrors
    };
  }
}
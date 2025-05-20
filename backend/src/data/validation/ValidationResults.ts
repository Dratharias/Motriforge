/**
 * Represents a validation error detail.
 */
export interface ValidationErrorDetail {
  /**
   * The field that failed validation
   */
  field: string;
  
  /**
   * The validation error message
   */
  message: string;
  
  /**
   * The constraint that was violated
   */
  constraint?: string;
  
  /**
   * The received value that was invalid
   */
  value?: any;
}

/**
 * Represents the result of a validation operation.
 * Contains information about whether validation passed and any validation errors.
 * 
 * Used in both frontend and backend.
 */
export interface ValidationResult {
  /**
   * Whether the validation was successful
   */
  isValid: boolean;
  
  /**
   * The list of validation errors (if any)
   */
  errors: ValidationErrorDetail[];
  
  /**
   * Add a validation error
   */
  addError(field: string, message: string, constraint?: string, value?: any): ValidationResult;
  
  /**
   * Check if the result has errors for a specific field
   */
  hasErrorForField(field: string): boolean;
  
  /**
   * Get all errors for a specific field
   */
  getErrorsForField(field: string): ValidationErrorDetail[];
  
  /**
   * Get the first error message for a specific field
   */
  getFirstErrorMessage(field: string): string | undefined;
  
  /**
   * Get all error messages mapped by field
   */
  getErrorMessages(): Record<string, string[]>;
}

/**
 * Implementation of the ValidationResult interface
 */
export class ValidationResultImpl implements ValidationResult {
  isValid: boolean;
  errors: ValidationErrorDetail[];
  
  constructor(isValid: boolean = true, errors: ValidationErrorDetail[] = []) {
    this.isValid = isValid;
    this.errors = errors;
  }
  
  /**
   * Add a validation error
   */
  addError(field: string, message: string, constraint?: string, value?: any): ValidationResult {
    this.errors.push({
      field,
      message,
      constraint,
      value
    });
    
    this.isValid = false;
    return this;
  }
  
  /**
   * Check if the result has errors for a specific field
   */
  hasErrorForField(field: string): boolean {
    return this.errors.some(error => error.field === field);
  }
  
  /**
   * Get all errors for a specific field
   */
  getErrorsForField(field: string): ValidationErrorDetail[] {
    return this.errors.filter(error => error.field === field);
  }
  
  /**
   * Get the first error message for a specific field
   */
  getFirstErrorMessage(field: string): string | undefined {
    const error = this.errors.find(error => error.field === field);
    return error?.message;
  }
  
  /**
   * Get all error messages mapped by field
   */
  getErrorMessages(): Record<string, string[]> {
    const result: Record<string, string[]> = {};
    
    for (const error of this.errors) {
      if (!result[error.field]) {
        result[error.field] = [];
      }
      
      result[error.field].push(error.message);
    }
    
    return result;
  }
  
  /**
   * Creates a valid validation result
   */
  static valid(): ValidationResult {
    return new ValidationResultImpl(true, []);
  }
  
  /**
   * Creates an invalid validation result with a single error
   */
  static invalid(field: string, message: string, constraint?: string, value?: any): ValidationResult {
    const result = new ValidationResultImpl(false, []);
    return result.addError(field, message, constraint, value);
  }
  
  /**
   * Creates a validation result from multiple error details
   */
  static fromErrors(errors: ValidationErrorDetail[]): ValidationResult {
    return new ValidationResultImpl(errors.length === 0, [...errors]);
  }
  
  /**
   * Combines multiple validation results into one
   */
  static combine(...results: ValidationResult[]): ValidationResult {
    const allErrors: ValidationErrorDetail[] = [];
    
    for (const result of results) {
      allErrors.push(...result.errors);
    }
    
    return ValidationResultImpl.fromErrors(allErrors);
  }
}

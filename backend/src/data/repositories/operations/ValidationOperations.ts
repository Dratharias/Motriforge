import { LoggerFacade } from '@/core/logging';
import { ValidationResult } from '@/types/repositories/base';

/**
 * Handles validation operations for repository data
 */
export class ValidationOperations<T> {
  constructor(
    private readonly logger: LoggerFacade,
    private readonly componentName: string
  ) {}

  /**
   * Validate data using custom validator function
   */
  public validate(
    data: Partial<T>, 
    validator: (data: Partial<T>) => ValidationResult
  ): ValidationResult {
    try {
      return validator(data);
    } catch (error) {
      this.logger.error('Error during data validation', error as Error, {
        component: this.componentName
      });
      
      return {
        valid: false,
        errors: ['Validation error occurred']
      };
    }
  }

  /**
   * Validate data and throw error if invalid
   */
  public validateAndThrow(
    data: Partial<T>, 
    validator: (data: Partial<T>) => ValidationResult
  ): void {
    const validation = this.validate(data, validator);
    
    if (!validation.valid) {
      const errorMessage = `Validation failed: ${validation.errors?.join(', ')}`;
      this.logger.warn('Validation failed', { 
        errors: validation.errors,
        data: this.sanitizeForLogging(data)
      });
      throw new Error(errorMessage);
    }
  }

  /**
   * Validate multiple data items
   */
  public validateMany(
    dataItems: Partial<T>[], 
    validator: (data: Partial<T>) => ValidationResult
  ): { valid: boolean; errors: string[]; itemErrors: Array<{ index: number; errors: string[] }> } {
    const allErrors: string[] = [];
    const itemErrors: Array<{ index: number; errors: string[] }> = [];
    
    dataItems.forEach((data, index) => {
      const validation = this.validate(data, validator);
      
      if (!validation.valid && validation.errors) {
        validation.errors.forEach(error => {
          allErrors.push(`Item ${index}: ${error}`);
        });
        
        itemErrors.push({
          index,
          errors: validation.errors
        });
      }
    });
    
    return {
      valid: allErrors.length === 0,
      errors: allErrors,
      itemErrors
    };
  }

  /**
   * Validate multiple data items and throw if any invalid
   */
  public validateManyAndThrow(
    dataItems: Partial<T>[], 
    validator: (data: Partial<T>) => ValidationResult
  ): void {
    const validation = this.validateMany(dataItems, validator);
    
    if (!validation.valid) {
      const errorMessage = `Validation failed for ${validation.itemErrors.length} items: ${validation.errors.join(', ')}`;
      this.logger.warn('Batch validation failed', {
        itemCount: dataItems.length,
        failedItems: validation.itemErrors.length,
        errors: validation.errors
      });
      throw new Error(errorMessage);
    }
  }

  /**
   * Check if validation should be skipped
   */
  public shouldSkipValidation(skipValidation?: boolean): boolean {
    return skipValidation === true;
  }

  /**
   * Sanitize data for logging (remove sensitive fields)
   */
  private sanitizeForLogging(data: any): any {
    if (!data || typeof data !== 'object') {
      return data;
    }

    const sensitiveFields = [
      'password', 
      'passwordHash', 
      'token', 
      'secret', 
      'key', 
      'auth',
      'credential',
      'private'
    ];

    const sanitized = { ...data };
    
    sensitiveFields.forEach(field => {
      if (field in sanitized) {
        sanitized[field] = '[REDACTED]';
      }
    });

    return sanitized;
  }

  /**
   * Create validation context for logging
   */
  public createValidationContext(operation: string, additionalData?: any): any {
    return {
      operation,
      component: this.componentName,
      timestamp: new Date(),
      ...additionalData
    };
  }
}
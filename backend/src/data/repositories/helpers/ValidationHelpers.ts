import { ValidationContext, ValidationResult } from '@/types/repositories';

/**
 * Validation helpers for repository operations
 */
export class ValidationHelpers {
  /**
   * Common email validation
   */
  public static validateEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * Common username validation
   */
  public static validateUsername(username: string): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    if (username.length < 3) {
      errors.push('Username must be at least 3 characters long');
    }
    
    if (username.length > 50) {
      errors.push('Username must be less than 50 characters');
    }
    
    const usernameRegex = /^[a-zA-Z0-9_-]+$/;
    if (!usernameRegex.test(username)) {
      errors.push('Username can only contain letters, numbers, hyphens, and underscores');
    }
    
    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Common password validation
   */
  public static validatePassword(password: string): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    if (password.length < 8) {
      errors.push('Password must be at least 8 characters long');
    }
    
    if (password.length > 128) {
      errors.push('Password must be less than 128 characters');
    }
    
    if (!/[a-z]/.test(password)) {
      errors.push('Password must contain at least one lowercase letter');
    }
    
    if (!/[A-Z]/.test(password)) {
      errors.push('Password must contain at least one uppercase letter');
    }
    
    if (!/\d/.test(password)) {
      errors.push('Password must contain at least one number');
    }
    
    if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
      errors.push('Password must contain at least one special character');
    }
    
    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Validate required fields
   */
  public static validateRequiredFields(
    data: Record<string, any>, 
    requiredFields: string[]
  ): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    requiredFields.forEach(field => {
      if (!data[field] || (typeof data[field] === 'string' && data[field].trim().length === 0)) {
        errors.push(`${field} is required`);
      }
    });
    
    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Validate field length
   */
  public static validateFieldLength(
    value: string,
    fieldName: string,
    min?: number,
    max?: number
  ): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    if (min !== undefined && value.length < min) {
      errors.push(`${fieldName} must be at least ${min} characters long`);
    }
    
    if (max !== undefined && value.length > max) {
      errors.push(`${fieldName} must be less than ${max} characters`);
    }
    
    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Validate enum values
   */
  public static validateEnum(
    value: any,
    enumObject: Record<string, any>,
    fieldName: string
  ): { valid: boolean; errors: string[] } {
    const validValues = Object.values(enumObject);
    const valid = validValues.includes(value);
    
    return {
      valid,
      errors: valid ? [] : [`Invalid ${fieldName}. Must be one of: ${validValues.join(', ')}`]
    };
  }

  /**
   * Validate URL format
   */
  public static validateUrl(url: string): boolean {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Validate phone number format (basic)
   */
  public static validatePhoneNumber(phone: string): boolean {
    const phoneRegex = /^\+?[\d\s\-\(\)]+$/;
    return phoneRegex.test(phone) && phone.replace(/\D/g, '').length >= 10;
  }

  /**
   * Validate MongoDB ObjectId format
   */
  public static validateObjectId(id: string): boolean {
    const objectIdRegex = /^[0-9a-fA-F]{24}$/;
    return objectIdRegex.test(id);
  }

  /**
   * Validate date range
   */
  public static validateDateRange(startDate: Date, endDate: Date): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    if (startDate >= endDate) {
      errors.push('Start date must be before end date');
    }
    
    const now = new Date();
    if (startDate < now && endDate < now) {
      errors.push('Date range cannot be entirely in the past');
    }
    
    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Validate numeric range
   */
  public static validateNumericRange(
    value: number,
    fieldName: string,
    min?: number,
    max?: number
  ): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    if (min !== undefined && value < min) {
      errors.push(`${fieldName} must be at least ${min}`);
    }
    
    if (max !== undefined && value > max) {
      errors.push(`${fieldName} must be at most ${max}`);
    }
    
    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Combine multiple validation results
   */
  public static combineValidationResults(...results: ValidationResult[]): ValidationResult {
    const allErrors: string[] = [];
    let isValid = true;
    
    results.forEach(result => {
      if (!result.valid) {
        isValid = false;
        if (result.errors) {
          allErrors.push(...result.errors);
        }
      }
    });
    
    return {
      valid: isValid,
      errors: allErrors.length > 0 ? allErrors : undefined
    };
  }

  /**
   * Create validation context
   */
  public static createValidationContext(
    isCreate: boolean,
    currentData?: any,
    userId?: string,
    organizationId?: string
  ): ValidationContext {
    return {
      isCreate,
      isUpdate: !isCreate,
      currentData,
      userId,
      organizationId
    };
  }
}
import type { ValidationResult, ValidationError } from '@/shared/types/api';
import { Logger } from '@/utils/Logger';

interface ValidationRule {
  readonly field: string;
  readonly type: 'string' | 'number' | 'boolean' | 'email' | 'uuid' | 'array' | 'object';
  readonly required?: boolean;
  readonly minLength?: number;
  readonly maxLength?: number;
  readonly min?: number;
  readonly max?: number;
  readonly pattern?: RegExp;
  readonly custom?: (value: any) => boolean | string;
}

interface Schema {
  readonly rules: ValidationRule[];
  readonly strict?: boolean;
}

export class ValidationEngine {
  private readonly schemas: Map<string, Schema> = new Map();
  private readonly logger: Logger;

  constructor() {
    this.logger = new Logger('ValidationEngine');
    this.registerDefaultSchemas();
  }

  public registerSchema(name: string, schema: Schema): void {
    this.schemas.set(name, schema);
    this.logger.debug(`Schema registered: ${name}`);
  }

  public async validate(data: any, schemaName: string): Promise<ValidationResult> {
    const schema = this.schemas.get(schemaName);
    
    if (!schema) {
      throw new Error(`Schema not found: ${schemaName}`);
    }

    const errors: ValidationError[] = [];
    const sanitizedData: any = {};

    for (const rule of schema.rules) {
      const value = this.getNestedValue(data, rule.field);
      const fieldErrors = this.validateField(value, rule);
      
      if (fieldErrors.length > 0) {
        errors.push(...fieldErrors);
      } else {
        this.setNestedValue(sanitizedData, rule.field, this.sanitizeValue(value, rule));
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      sanitizedData: errors.length === 0 ? sanitizedData : undefined
    };
  }

  public sanitize(data: any): any {
    if (data === null || data === undefined) {
      return data;
    }

    if (typeof data === 'string') {
      return data.trim();
    }

    if (Array.isArray(data)) {
      return data.map(item => this.sanitize(item));
    }

    if (typeof data === 'object') {
      const sanitized: any = {};
      for (const [key, value] of Object.entries(data)) {
        sanitized[key] = this.sanitize(value);
      }
      return sanitized;
    }

    return data;
  }

  private validateField(value: any, rule: ValidationRule): ValidationError[] {
    const errors: ValidationError[] = [];

    // Required check
    if (rule.required && (value === undefined || value === null || value === '')) {
      errors.push({
        field: rule.field,
        message: `${rule.field} is required`,
        code: 'REQUIRED',
        value
      });
      return errors;
    }

    // Skip further validation if value is not provided and not required
    if (value === undefined || value === null) {
      return errors;
    }

    // Type validation
    if (!this.validateType(value, rule.type)) {
      errors.push({
        field: rule.field,
        message: `${rule.field} must be of type ${rule.type}`,
        code: 'INVALID_TYPE',
        value
      });
      return errors;
    }

    // Length validation for strings
    if (rule.type === 'string' && typeof value === 'string') {
      if (rule.minLength !== undefined && value.length < rule.minLength) {
        errors.push({
          field: rule.field,
          message: `${rule.field} must be at least ${rule.minLength} characters`,
          code: 'MIN_LENGTH',
          value
        });
      }
      
      if (rule.maxLength !== undefined && value.length > rule.maxLength) {
        errors.push({
          field: rule.field,
          message: `${rule.field} must be at most ${rule.maxLength} characters`,
          code: 'MAX_LENGTH',
          value
        });
      }
    }

    // Range validation for numbers
    if (rule.type === 'number' && typeof value === 'number') {
      if (rule.min !== undefined && value < rule.min) {
        errors.push({
          field: rule.field,
          message: `${rule.field} must be at least ${rule.min}`,
          code: 'MIN_VALUE',
          value
        });
      }
      
      if (rule.max !== undefined && value > rule.max) {
        errors.push({
          field: rule.field,
          message: `${rule.field} must be at most ${rule.max}`,
          code: 'MAX_VALUE',
          value
        });
      }
    }

    // Pattern validation
    if (rule.pattern && typeof value === 'string' && !rule.pattern.test(value)) {
      errors.push({
        field: rule.field,
        message: `${rule.field} format is invalid`,
        code: 'INVALID_FORMAT',
        value
      });
    }

    // Custom validation
    if (rule.custom) {
      const customResult = rule.custom(value);
      if (customResult !== true) {
        errors.push({
          field: rule.field,
          message: typeof customResult === 'string' ? customResult : `${rule.field} is invalid`,
          code: 'CUSTOM_VALIDATION',
          value
        });
      }
    }

    return errors;
  }

  private validateType(value: any, type: string): boolean {
    switch (type) {
      case 'string':
        return typeof value === 'string';
      case 'number':
        return typeof value === 'number' && !isNaN(value);
      case 'boolean':
        return typeof value === 'boolean';
      case 'email':
        return typeof value === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
      case 'uuid':
        return typeof value === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
      case 'array':
        return Array.isArray(value);
      case 'object':
        return typeof value === 'object' && value !== null && !Array.isArray(value);
      default:
        return true;
    }
  }

  private sanitizeValue(value: any, rule: ValidationRule): any {
    if (rule.type === 'string' && typeof value === 'string') {
      return value.trim();
    }
    return value;
  }

  private getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => current?.[key], obj);
  }

  private setNestedValue(obj: any, path: string, value: any): void {
    const keys = path.split('.');
    const lastKey = keys.pop();
    
    if (!lastKey) return;
    
    const target = keys.reduce((current, key) => {
      if (!(key in current)) {
        current[key] = {};
      }
      return current[key];
    }, obj);
    
    target[lastKey] = value;
  }

  private registerDefaultSchemas(): void {
    // User registration schema
    this.registerSchema('post_api_auth_register', {
      rules: [
        { field: 'body.email', type: 'email', required: true },
        { field: 'body.password', type: 'string', required: true, minLength: 8 },
        { field: 'body.firstName', type: 'string', required: true, minLength: 1, maxLength: 100 },
        { field: 'body.lastName', type: 'string', required: true, minLength: 1, maxLength: 100 }
      ]
    });

    // User login schema
    this.registerSchema('post_api_auth_login', {
      rules: [
        { field: 'body.email', type: 'email', required: true },
        { field: 'body.password', type: 'string', required: true }
      ]
    });

    // Exercise creation schema
    this.registerSchema('post_api_exercises', {
      rules: [
        { field: 'body.name', type: 'string', required: true, minLength: 1, maxLength: 100 },
        { field: 'body.description', type: 'string', required: true, maxLength: 500 },
        { field: 'body.instructions', type: 'string', required: true, maxLength: 5000 },
        { field: 'body.difficultyLevelId', type: 'uuid', required: true },
        { field: 'body.visibilityId', type: 'uuid', required: true }
      ]
    });
  }
}
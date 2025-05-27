import { BaseError } from '../base/BaseError';
import { Severity } from '../../../types/core/enums';

/**
 * Error for validation failures
 */
export class ValidationError extends BaseError {
  public readonly field: string;
  public readonly value: unknown;
  public readonly rule: string;

  constructor(
    field: string,
    value: unknown,
    rule: string,
    message: string,
    context?: string,
    traceId?: string,
    userId?: string
  ) {
    super(message, 'VALIDATION_ERROR', Severity.ERROR, context, traceId, userId);
    this.field = field;
    this.value = value;
    this.rule = rule;
  }

  /**
   * Get validation error details
   */
  getDetails(): {
    field: string;
    value: unknown;
    rule: string;
    message: string;
  } {
    return {
      field: this.field,
      value: this.value,
      rule: this.rule,
      message: this.message
    };
  }

  /**
   * Check if error is for a specific field
   */
  isFieldError(fieldName: string): boolean {
    return this.field === fieldName;
  }

  /**
   * Override toJSON to include validation-specific fields
   */
  toJSON(): Record<string, unknown> {
    return {
      ...super.toJSON(),
      field: this.field,
      value: this.value,
      rule: this.rule
    };
  }
}


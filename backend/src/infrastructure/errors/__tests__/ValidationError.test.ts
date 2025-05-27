import { describe, it, expect } from 'vitest';
import { ValidationError } from '../types/ValidationError.js';
import { Severity } from '../../../types/core/enums.js';

describe('ValidationError', () => {
  it('should create validation error with field details', () => {
    const error = new ValidationError(
      'email',
      'invalid-email',
      'format',
      'Invalid email format'
    );

    expect(error.field).toBe('email');
    expect(error.value).toBe('invalid-email');
    expect(error.rule).toBe('format');
    expect(error.message).toBe('Invalid email format');
    expect(error.code).toBe('VALIDATION_ERROR');
    expect(error.severity).toBe(Severity.ERROR);
  });

  it('should provide validation details', () => {
    const error = new ValidationError('name', '', 'required', 'Name is required');
    const details = error.getDetails();

    expect(details).toEqual({
      field: 'name',
      value: '',
      rule: 'required',
      message: 'Name is required'
    });
  });

  it('should check if error is for specific field', () => {
    const error = new ValidationError('email', 'test', 'format', 'Invalid email');
    
    expect(error.isFieldError('email')).toBe(true);
    expect(error.isFieldError('name')).toBe(false);
  });

  it('should serialize with validation-specific fields', () => {
    const error = new ValidationError('age', -5, 'min_value', 'Age must be positive');
    const json = error.toJSON();

    expect(json).toMatchObject({
      field: 'age',
      value: -5,
      rule: 'min_value',
      code: 'VALIDATION_ERROR'
    });
  });
});


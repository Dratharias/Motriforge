import { describe, it, expect, beforeEach } from 'vitest';
import { BaseError } from '../base/BaseError';
import { Severity, ErrorType } from '../../../types/core/enums';

class TestError extends BaseError {
  constructor(message: string, code: string = 'TEST_ERROR') {
    super(message, code, Severity.ERROR, 'test-context', 'trace-123', 'user-456');
  }
}

describe('BaseError', () => {
  let error: TestError;

  beforeEach(() => {
    error = new TestError('Test error message');
  });

  it('should create error with required properties', () => {
    expect(error.message).toBe('Test error message');
    expect(error.code).toBe('TEST_ERROR');
    expect(error.severity).toBe(Severity.ERROR);
    expect(error.context).toBe('test-context');
    expect(error.traceId).toBe('trace-123');
    expect(error.userId).toBe('user-456');
    expect(error.timestamp).toBeInstanceOf(Date);
  });

  it('should serialize to JSON correctly', () => {
    const json = error.toJSON();
    
    expect(json).toMatchObject({
      name: 'TestError',
      message: 'Test error message',
      code: 'TEST_ERROR',
      severity: Severity.ERROR,
      context: 'test-context',
      traceId: 'trace-123',
      userId: 'user-456'
    });
    expect(json.timestamp).toBeDefined();
    expect(json.stack).toBeDefined();
  });

  it('should wrap error with metadata', () => {
    const wrapped = error.wrap(ErrorType.VALIDATION, { field: 'test' });
    
    expect(wrapped.type).toBe(ErrorType.VALIDATION);
    expect(wrapped.error).toBe(error);
    expect(wrapped.metadata).toEqual({ field: 'test' });
  });

  it('should maintain stack trace', () => {
    expect(error.stack).toBeDefined();
    expect(error.stack).toContain('TestError');
  });
});


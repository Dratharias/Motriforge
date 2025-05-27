import { BaseError } from '../base/BaseError.js';
import { ValidationError } from '../types/ValidationError.js';
import { Severity } from '../../../types/core/enums.js';

/**
 * Utility for formatting errors for different outputs
 */
export class ErrorFormatter {
  /**
   * Format error for console output with colors
   */
  static formatForConsole(error: BaseError): string {
    const timestamp = error.timestamp.toISOString();
    const severity = error.severity.padEnd(8);
    const code = error.code.padEnd(20);
    
    const lines = [
      `[${timestamp}] ${severity} ${code} ${error.message}`
    ];
    
    if (error.context) {
      lines.push(`  Context: ${error.context}`);
    }
    
    if (error.traceId) {
      lines.push(`  Trace ID: ${error.traceId}`);
    }
    
    if (error.userId) {
      lines.push(`  User ID: ${error.userId}`);
    }
    
    // Add specific error details
    if (error instanceof ValidationError) {
      lines.push(`  Field: ${error.field}`);
      lines.push(`  Rule: ${error.rule}`);
      lines.push(`  Value: ${JSON.stringify(error.value)}`);
    }
    
    return lines.join('\n');
  }

  /**
   * Format error for structured logging (JSON)
   */
  static formatForLogging(error: BaseError): Record<string, unknown> {
    const baseLog = {
      timestamp: error.timestamp.toISOString(),
      level: error.severity.toLowerCase(),
      message: error.message,
      code: error.code,
      origin: error.origin,
      context: error.context,
      traceId: error.traceId,
      userId: error.userId
    };

    // Add error-specific fields
    const specificFields = ErrorFormatter.getSpecificFields(error);
    
    return {
      ...baseLog,
      ...specificFields,
      stack: error.stack
    };
  }

  /**
   * Format error for user display (sanitized)
   */
  static formatForUser(error: BaseError): {
    message: string;
    code: string;
    timestamp: string;
    canRetry: boolean;
  } {
    return {
      message: ErrorFormatter.getSanitizedMessage(error),
      code: error.code,
      timestamp: error.timestamp.toISOString(),
      canRetry: ErrorFormatter.isRetryable(error)
    };
  }

  /**
   * Format multiple errors as a summary
   */
  static formatErrorSummary(errors: readonly BaseError[]): {
    total: number;
    bySeverity: Record<string, number>;
    byType: Record<string, number>;
    criticalErrors: BaseError[];
  } {
    const bySeverity: Record<string, number> = {};
    const byType: Record<string, number> = {};
    const criticalErrors: BaseError[] = [];

    for (const error of errors) {
      // Count by severity
      bySeverity[error.severity] = (bySeverity[error.severity] ?? 0) + 1;
      
      // Count by type
      const errorType = error.constructor.name;
      byType[errorType] = (byType[errorType] ?? 0) + 1;
      
      // Collect critical errors
      if (error.severity === Severity.CRITICAL) {
        criticalErrors.push(error);
      }
    }

    return {
      total: errors.length,
      bySeverity,
      byType,
      criticalErrors
    };
  }

  /**
   * Get error-specific fields for logging
   */
  private static getSpecificFields(error: BaseError): Record<string, unknown> {
    const specificFields: Record<string, unknown> = {};
    
    if (error instanceof ValidationError) {
      specificFields.field = error.field;
      specificFields.rule = error.rule;
      specificFields.value = error.value;
    }
    
    // Add more error type specific fields as needed
    
    return specificFields;
  }

  /**
   * Get sanitized message for user display
   */
  private static getSanitizedMessage(error: BaseError): string {
    // Don't expose internal details to users
    const publicMessages: Record<string, string> = {
      'VALIDATION_ERROR': 'The provided data is invalid. Please check your input.',
      'AUTHENTICATION_ERROR': 'Authentication failed. Please check your credentials.',
      'AUTHORIZATION_ERROR': 'You do not have permission to perform this action.',
      'DATABASE_ERROR': 'A system error occurred. Please try again later.',
      'NETWORK_ERROR': 'A network error occurred. Please check your connection.'
    };
    
    return publicMessages[error.code] ?? 'An unexpected error occurred. Please try again.';
  }

  /**
   * Check if error is retryable
   */
  private static isRetryable(error: BaseError): boolean {
    // Check if error has a retryable method
    if ('isRetryable' in error && typeof error.isRetryable === 'function') {
      return error.isRetryable();
    }
    
    // Default retry logic for different error types
    const retryableCodes = ['DATABASE_ERROR', 'NETWORK_ERROR'];
    return retryableCodes.includes(error.code);
  }
}


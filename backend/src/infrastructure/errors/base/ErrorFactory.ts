import { BaseError } from './BaseError';
import { Severity } from '../../../types/core/enums';
import { ValidationError } from '../types/ValidationError';
import { AuthenticationError } from '../types/AuthenticationError';
import { AuthorizationError } from '../types/AuthorizationError';
import { DatabaseError } from '../types/DatabaseError';
import { NetworkError } from '../types/NetworkError';

/**
 * Factory for creating typed errors
 */
export class ErrorFactory {
  /**
   * Create a validation error
   */
  static createValidationError(
    field: string,
    value: unknown,
    rule: string,
    message?: string,
    context?: string,
    traceId?: string,
    userId?: string
  ): ValidationError {
    const errorMessage = message ?? `Validation failed for field '${field}' with rule '${rule}'`;
    return new ValidationError(field, value, rule, errorMessage, context, traceId, userId);
  }

  /**
   * Create an authentication error
   */
  static createAuthenticationError(
    userId: string,
    attemptedAction: string,
    reason?: string,
    context?: string,
    traceId?: string
  ): AuthenticationError {
    const message = reason ?? `Authentication failed for user ${userId} attempting ${attemptedAction}`;
    return new AuthenticationError(userId, attemptedAction, message, context, traceId);
  }

  /**
   * Create an authorization error
   */
  static createAuthorizationError(
    userId: string,
    resource: string,
    action: string,
    reason?: string,
    context?: string,
    traceId?: string
  ): AuthorizationError {
    const message = reason ?? `User ${userId} not authorized to ${action} on ${resource}`;
    return new AuthorizationError(userId, resource, action, message, context, traceId);
  }

  /**
   * Create a database error
   */
  static createDatabaseError(
    operation: string,
    query: string,
    originalError: Error,
    table?: string,
    context?: string,
    traceId?: string,
    userId?: string
  ): DatabaseError {
    return new DatabaseError(query, operation, originalError, table, context, traceId, userId);
  }

  /**
   * Create a network error
   */
  static createNetworkError(
    url: string,
    method: string,
    originalError: Error,
    statusCode?: number,
    context?: string,
    traceId?: string,
    userId?: string
  ): NetworkError {
    return new NetworkError(url, method, originalError, statusCode, context, traceId, userId);
  }

  /**
   * Create a generic error from an unknown error
   */
  static createFromUnknown(
    error: unknown,
    context?: string,
    traceId?: string,
    userId?: string
  ): BaseError {
    if (error instanceof BaseError) {
      return error;
    }



    if (error instanceof Error) {
      const err = error as any
      return new (class extends BaseError {
        constructor() {
          super(
            err.message,
            'GENERIC_ERROR',
            Severity.ERROR,
            context,
            traceId,
            userId
          );
          this.stack = err.stack;
        }
      })();
    }

    const message = typeof error === 'string' ? error : 'Unknown error occurred';
    return new (class extends BaseError {
      constructor() {
        super(message, 'UNKNOWN_ERROR', Severity.ERROR, context, traceId, userId);
      }
    })();
  }
}


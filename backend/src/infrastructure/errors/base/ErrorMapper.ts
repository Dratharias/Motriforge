import { BaseError } from './BaseError';
import { IError, IErrorWrapper } from '../../../types/core/interfaces';
import { ErrorType } from '../../../types/core/enums';

/**
 * Maps errors to different formats and structures
 */
export class ErrorMapper {
  /**
   * Map BaseError to IError interface
   */
  static toIError(error: BaseError): IError {
    return {
      code: error.code,
      message: error.message,
      severity: error.severity,
      timestamp: error.timestamp,
      context: error.context,
      origin: error.origin,
      stack: error.stack,
      traceId: error.traceId,
      userId: error.userId
    };
  }

  /**
   * Map error to HTTP response format
   */
  static toHttpResponse(error: BaseError): {
    status: number;
    body: {
      error: {
        code: string;
        message: string;
        timestamp: string;
        traceId?: string;
      };
    };
  } {
    const status = ErrorMapper.getHttpStatus(error);
    
    return {
      status,
      body: {
        error: {
          code: error.code,
          message: error.message,
          timestamp: error.timestamp.toISOString(),
          traceId: error.traceId
        }
      }
    };
  }

  /**
   * Map error to logging format
   */
  static toLogFormat(error: BaseError): {
    level: string;
    message: string;
    error: Record<string, unknown>;
    context?: string;
    traceId?: string;
    userId?: string;
  } {
    return {
      level: error.severity.toLowerCase(),
      message: error.message,
      error: error.toJSON(),
      context: error.context,
      traceId: error.traceId,
      userId: error.userId
    };
  }

  /**
   * Get appropriate HTTP status code for error
   */
  private static getHttpStatus(error: BaseError): number {
    switch (error.constructor.name) {
      case 'ValidationError':
        return 400;
      case 'AuthenticationError':
        return 401;
      case 'AuthorizationError':
        return 403;
      case 'DatabaseError':
        return 500;
      case 'NetworkError':
        return 502;
      default:
        return 500;
    }
  }

  /**
   * Create error wrapper with appropriate type
   */
  static wrapError(error: BaseError, metadata?: Record<string, unknown>): IErrorWrapper {
    const type = ErrorMapper.determineErrorType(error);
    return error.wrap(type, metadata);
  }

  /**
   * Determine error type from error instance
   */
  private static determineErrorType(error: BaseError): ErrorType {
    switch (error.constructor.name) {
      case 'ValidationError':
        return ErrorType.VALIDATION;
      case 'AuthenticationError':
        return ErrorType.AUTHENTICATION;
      case 'AuthorizationError':
        return ErrorType.AUTHORIZATION;
      case 'DatabaseError':
        return ErrorType.DATABASE;
      case 'NetworkError':
        return ErrorType.NETWORK;
      default:
        return ErrorType.GENERIC;
    }
  }
}
import type { ApiResponse, ApiError, RequestContext } from '@/shared/types/api';
import { Logger } from '@/utils/Logger';

interface ErrorMapper {
  match(error: Error): boolean;
  map(error: Error): ApiError;
}

export class ErrorHandler {
  private readonly logger: Logger;
  private readonly errorMappers: ErrorMapper[];

  constructor(logger: Logger) {
    this.logger = logger;
    this.errorMappers = this.createErrorMappers();
  }

  public handleError(error: Error, context: RequestContext): Response {
    try {
      this.logError(error, context);
      const mappedError = this.mapError(error);
      const response = this.formatErrorResponse(mappedError, context);
      
      return new Response(JSON.stringify(response), {
        status: mappedError.statusCode,
        headers: {
          'Content-Type': 'application/json',
          'X-Request-ID': context.requestId
        }
      });
    } catch (handlerError) {
      this.logger.error('Error in error handler', handlerError);
      return this.createFallbackErrorResponse(context);
    }
  }

  private mapError(error: Error): ApiError {
    for (const mapper of this.errorMappers) {
      if (mapper.match(error)) {
        return mapper.map(error);
      }
    }

    // Default error mapping
    return {
      code: 'INTERNAL_SERVER_ERROR',
      message: 'An unexpected error occurred',
      statusCode: 500,
      timestamp: new Date()
    };
  }

  private formatErrorResponse(error: ApiError, context: RequestContext): ApiResponse {
    return {
      success: false,
      error,
      metadata: {
        version: context.metadata.get('apiVersion') ?? 'v1',
        processingTime: Date.now() - context.startTime.getTime()
      },
      timestamp: new Date(),
      requestId: context.requestId
    };
  }

  private logError(error: Error, context: RequestContext): void {
    this.logger.error('API Error', {
      error: error.message,
      stack: error.stack,
      requestId: context.requestId,
      url: context.request.url,
      method: context.request.method
    });
  }

  private createErrorMappers(): ErrorMapper[] {
    return [
      {
        match: (error: Error) => error.message.includes('Validation failed'),
        map: (error: Error): ApiError => ({
          code: 'VALIDATION_ERROR',
          message: error.message,
          statusCode: 400,
          timestamp: new Date()
        })
      },
      {
        match: (error: Error) => error.message.includes('unauthorized') || error.message.includes('token'),
        map: (_error: Error): ApiError => ({
          code: 'UNAUTHORIZED',
          message: 'Authentication required',
          statusCode: 401,
          timestamp: new Date()
        })
      },
      {
        match: (error: Error) => error.message.includes('permission') || error.message.includes('forbidden'),
        map: (_error: Error): ApiError => ({
          code: 'FORBIDDEN',
          message: 'Insufficient permissions',
          statusCode: 403,
          timestamp: new Date()
        })
      },
      {
        match: (error: Error) => error.message.includes('not found'),
        map: (_error: Error): ApiError => ({
          code: 'NOT_FOUND',
          message: 'Resource not found',
          statusCode: 404,
          timestamp: new Date()
        })
      },
      {
        match: (error: Error) => error.message.includes('rate limit'),
        map: (_error: Error): ApiError => ({
          code: 'RATE_LIMIT_EXCEEDED',
          message: 'Too many requests',
          statusCode: 429,
          timestamp: new Date()
        })
      }
    ];
  }

  private createFallbackErrorResponse(context: RequestContext): Response {
    const fallbackResponse: ApiResponse = {
      success: false,
      error: {
        code: 'CRITICAL_ERROR',
        message: 'A critical error occurred',
        statusCode: 500,
        timestamp: new Date()
      },
      metadata: {
        version: 'v1',
        processingTime: Date.now() - context.startTime.getTime()
      },
      timestamp: new Date(),
      requestId: context.requestId
    };

    return new Response(JSON.stringify(fallbackResponse), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        'X-Request-ID': context.requestId
      }
    });
  }
}
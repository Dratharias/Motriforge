import type { Middleware, RequestContext, NextFunction, ApiResponse } from '@/shared/types/api';
import { Logger } from '@/utils/Logger';

export class ResponseMiddleware implements Middleware {
  private readonly logger: Logger;

  constructor() {
    this.logger = new Logger('ResponseMiddleware');
  }

  public async execute(context: RequestContext, next: NextFunction): Promise<void> {
    try {
      await next();
      
      if (context.response) {
        this.addHeaders(context);
        this.logResponse(context);
      }
    } catch (error) {
      this.logger.error('Response middleware error', error);
      throw error;
    }
  }

  public formatResponse<T>(data: T, context: RequestContext): ApiResponse<T> {
    const processingTime = Date.now() - context.startTime.getTime();
    
    return {
      success: true,
      data,
      metadata: {
        version: context.metadata.get('apiVersion') ?? 'v1',
        processingTime
      },
      timestamp: new Date(),
      requestId: context.requestId
    };
  }

  private addHeaders(context: RequestContext): void {
    if (!context.response) return;

    const headers = new Headers(context.response.headers);
    headers.set('X-Request-ID', context.requestId);
    headers.set('X-Processing-Time', `${Date.now() - context.startTime.getTime()}ms`);
    headers.set('X-API-Version', context.metadata.get('apiVersion') ?? 'v1');
    
    // Create new response with updated headers
    context.response = new Response(context.response.body, {
      status: context.response.status,
      statusText: context.response.statusText,
      headers
    });
  }

  private logResponse(context: RequestContext): void {
    const processingTime = Date.now() - context.startTime.getTime();
    const status = context.response?.status ?? 0;
    
    this.logger.info('Response sent', {
      requestId: context.requestId,
      status,
      processingTime: `${processingTime}ms`
    });
  }
}
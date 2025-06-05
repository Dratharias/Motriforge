import type { Middleware, RequestContext, NextFunction } from '@/shared/types/api';
import { Logger } from '@/utils/Logger';

export class RequestMiddleware implements Middleware {
  private readonly logger: Logger;

  constructor() {
    this.logger = new Logger('RequestMiddleware');
  }

  public async execute(context: RequestContext, next: NextFunction): Promise<void> {
    try {
      this.attachRequestId(context);
      await this.parseRequest(context);
      this.logRequest(context);
      await next();
    } catch (error) {
      this.logger.error('Request middleware error', error);
      throw error;
    }
  }

  private attachRequestId(context: RequestContext): void {
    context.metadata.set('requestId', context.requestId);
  }

  private async parseRequest(context: RequestContext): Promise<void> {
    try {
      const url = new URL(context.request.url);
      const method = context.request.method;
      
      // Fix: Headers doesn't have entries() method, use proper iteration
      const headers: Record<string, string> = {};
      context.request.headers.forEach((value: string, key: string) => {
        headers[key] = value;
      });

      let body: any = null;
      
      if (method !== 'GET' && method !== 'HEAD') {
        const contentType = headers['content-type'] ?? '';
        
        if (contentType.includes('application/json')) {
          const text = await context.request.text();
          body = text ? JSON.parse(text) : null;
        } else if (contentType.includes('application/x-www-form-urlencoded')) {
          const text = await context.request.text();
          body = Object.fromEntries(new URLSearchParams(text));
        }
      }

      context.metadata.set('parsedRequest', {
        url: url.pathname,
        query: Object.fromEntries(url.searchParams.entries()),
        method,
        headers,
        body
      });
    } catch (error) {
      this.logger.error('Failed to parse request', error);
      throw new Error('Invalid request format');
    }
  }

  private logRequest(context: RequestContext): void {
    const parsedRequest = context.metadata.get('parsedRequest');
    const { url, method } = parsedRequest ?? { url: 'unknown', method: 'unknown' };
    
    this.logger.info(`${method} ${url}`, {
      requestId: context.requestId,
      timestamp: context.startTime.toISOString()
    });
  }
}
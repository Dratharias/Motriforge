import { Context, Next } from 'hono';
import { ErrorHandlingFacade } from './ErrorHandlingFacade';
import { ErrorContext } from './ErrorContext';

export interface ErrorMiddlewareOptions {
  logErrors?: boolean;
  includeStackTrace?: boolean;
  defaultFormat?: string;
}

export class ErrorMiddleware {
  private readonly errorHandlingFacade: ErrorHandlingFacade;
  private readonly options: ErrorMiddlewareOptions;

  constructor(errorHandlingFacade: ErrorHandlingFacade, options: ErrorMiddlewareOptions = {}) {
    this.errorHandlingFacade = errorHandlingFacade;
    this.options = {
      logErrors: true,
      includeStackTrace: false,
      defaultFormat: 'json',
      ...options
    };
  }

  public execute = async (c: Context, next: Next) => {
    try {
      return await next();
    } catch (error) {
      if (!this.shouldHandleError(error)) {
        throw error;
      }
      
      const errorContext = this.createErrorContext(c, error as Error);
      return this.errorToResponse(error as Error, errorContext, c);
    }
  };

  private createErrorContext(c: Context, error: Error): ErrorContext {
    const url = new URL(c.req.url);
    const correlationId = c.req.header('x-correlation-id') ?? crypto.randomUUID();
    
    // Assuming ErrorContext is a class with a constructor that takes these parameters
    // If it's an interface, you'll need to implement a factory or builder function
    return new ErrorContext({
      source: 'http',
      isClient: true,
      correlationId,
      metadata: {
        path: url.pathname,
        method: c.req.method,
        userAgent: c.req.header('user-agent'),
        referer: c.req.header('referer'),
        ip: c.req.header('x-forwarded-for') ?? 'unknown',
        error: {
          name: error.name,
          message: error.message,
          stack: this.options.includeStackTrace ? error.stack : undefined
        },
        request: {
          method: c.req.method,
          url: c.req.url,
          path: url.pathname,
          query: Object.fromEntries(url.searchParams),
          headers: this.getSanitizedHeaders(c)
        }
      }
    });
  }

  private getSanitizedHeaders(c: Context): Record<string, string> {
    const headers: Record<string, string> = {};
    // Get all headers from Hono context
    for (const [key, value] of Object.entries(c.req.raw.headers)) {
      // Skip sensitive headers or sanitize them
      if (['authorization', 'cookie', 'x-api-key'].includes(key.toLowerCase())) {
        headers[key] = '[REDACTED]';
      } else {
        headers[key] = value as string;
      }
    }
    return headers;
  }

  private errorToResponse(error: Error, context: ErrorContext, c: Context): Response {
    const errorResult = this.errorHandlingFacade.handleError(error, context);
    
    const acceptHeader = c.req.header('accept') ?? '';
    let format = this.options.defaultFormat;
    
    if (acceptHeader.includes('text/html')) {
      format = 'html';
    } else if (acceptHeader.includes('application/json')) {
      format = 'json';
    }
    
    const formattedError = this.errorHandlingFacade.formatError(errorResult.error, format);
    
    return new Response(formattedError.content, {
      status: formattedError.statusCode,
      headers: {
        'Content-Type': formattedError.contentType,
        'X-Correlation-ID': errorResult.correlationId
      }
    });
  }

  private shouldHandleError(error: unknown): boolean {
    // Customize this to determine which errors to handle
    return error instanceof Error;
  }
}
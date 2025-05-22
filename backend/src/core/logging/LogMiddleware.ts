import { LogLevel, LogMiddlewareOptions } from '@/types/logging';
import { LoggerFacade } from './LoggerFacade';
import { RequestLogEnricher } from './RequestLogEnricher';


export class LogMiddleware {
  private readonly logger: LoggerFacade;
  private readonly options: LogMiddlewareOptions;
  private readonly enricher: RequestLogEnricher;

  constructor(logger: LoggerFacade, options: LogMiddlewareOptions = {}) {
    this.logger = logger;
    this.options = {
      logRequestBody: false,
      logResponseBody: false,
      skipPaths: ['/health', '/metrics', '/favicon.ico'],
      skipStaticFiles: true,
      logLevel: LogLevel.INFO,
      ...options
    };
    this.enricher = new RequestLogEnricher();
  }

  public async execute(request: Request, next: () => Promise<Response>): Promise<Response> {
    if (this.shouldSkip(request)) {
      return next();
    }

    // Attach start time to the request for performance measurement
    (request as any).startTime = Date.now();
    
    // Log the incoming request
    this.logRequest(request);

    try {
      // Execute the next middleware/handler in the chain
      const response = await next();
      
      // Log the response
      this.logResponse(response, request, Date.now() - (request as any).startTime);
      
      return response;
    } catch (error) {
      // Log the error
      this.logger.error(
        'Request failed',
        error instanceof Error ? error : new Error(String(error)),
        { request: this.enricher.sanitizeRequestData(request) }
      );
      
      // Re-throw the error to be handled by error middleware
      throw error;
    }
  }

  private logRequest(request: Request): void {
    const url = new URL(request.url);
    const userInfo = this.enricher.extractUserInfo(request);
    const clientInfo = this.enricher.extractClientInfo(request);
  
    const logLevel = this.options?.logLevel ?? LogLevel.INFO;
  
    this.logger.log(
      logLevel,
      `${request.method} ${url.pathname} - Incoming request`,
      {
        request: this.enricher.sanitizeRequestData(request),
        user: userInfo,
        client: clientInfo,
      }
    );
  }

  private logResponse(response: Response, request: Request, duration: number): void {
    const url = new URL(request.url);
    const level = this.getLogLevelForStatus(response.status);
    
    this.logger.log(
      level,
      `${request.method} ${url.pathname} - ${response.status} - ${duration}ms`,
      {
        response: {
          status: response.status,
          statusText: response.statusText,
          headers: this.sanitizeHeaders(Object.fromEntries(response.headers.entries())),
          duration,
          size: response.headers.get('content-length'),
          contentType: response.headers.get('content-type'),
        },
        performance: this.enricher.extractPerformanceMetrics(request)
      }
    );
  }

  private shouldSkip(request: Request): boolean {
    const url = new URL(request.url);
    const path = url.pathname;
    
    // Skip specific paths
    if (this.options.skipPaths?.some(p => path.startsWith(p))) {
      return true;
    }
    
    // Skip static files
    if (this.options.skipStaticFiles) {
      const staticExtensions = ['.js', '.css', '.png', '.jpg', '.jpeg', '.gif', '.svg', '.woff', '.woff2', '.ttf', '.eot'];
      if (staticExtensions.some(ext => path.endsWith(ext))) {
        return true;
      }
    }
    
    return false;
  }

  private sanitizeHeaders(headers: Record<string, string>): Record<string, string> {
    const sensitiveHeaders = ['authorization', 'cookie', 'set-cookie', 'x-api-key', 'x-token'];
    const sanitized: Record<string, string> = {};
    
    for (const [name, value] of Object.entries(headers)) {
      if (sensitiveHeaders.includes(name.toLowerCase())) {
        sanitized[name] = '[REDACTED]';
      } else {
        sanitized[name] = value;
      }
    }
    
    return sanitized;
  }

  private getLogLevelForStatus(status: number): LogLevel {
    if (status >= 500) {
      return LogLevel.ERROR;
    } else if (status >= 400) {
      return LogLevel.WARN;
    } else {
      return this.options?.logLevel ?? LogLevel.INFO;
    }
  }  
}
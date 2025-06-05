import type { Middleware, RequestContext, NextFunction } from '@/shared/types/api';
import { ApiConfigFactory } from '@/config/api.config';

export class CorsMiddleware implements Middleware {
  private readonly allowedOrigins: readonly string[];

  constructor() {
    const config = ApiConfigFactory.createForEnvironment();
    this.allowedOrigins = config.corsOrigins;
  }

  public async execute(context: RequestContext, next: NextFunction): Promise<void> {
    const origin = context.request.headers.get('Origin');
    
    // Set CORS headers
    const headers = new Headers();
    
    if (origin && this.isOriginAllowed(origin)) {
      headers.set('Access-Control-Allow-Origin', origin);
    } else if (this.allowedOrigins.includes('*')) {
      headers.set('Access-Control-Allow-Origin', '*');
    }
    
    headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
    headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-API-Version, X-Request-ID');
    headers.set('Access-Control-Allow-Credentials', 'true');
    headers.set('Access-Control-Max-Age', '86400'); // 24 hours

    // Handle preflight requests
    if (context.request.method === 'OPTIONS') {
      context.response = new Response(null, {
        status: 204,
        headers
      });
      return;
    }

    await next();

    // Add CORS headers to response
    if (context.response) {
      headers.forEach((value, key) => {
        context.response!.headers.set(key, value);
      });
    }
  }

  private isOriginAllowed(origin: string): boolean {
    return this.allowedOrigins.includes(origin) ?? this.allowedOrigins.includes('*');
  }
}
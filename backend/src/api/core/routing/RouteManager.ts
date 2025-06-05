import type { RouteDefinition, RouteHandler, RequestContext } from '@/shared/types/api';
import { MiddlewareChain } from '../middleware/MiddlewareChain';
import { Logger } from '@/utils/Logger';
import { Middleware } from '@/shared/types/api';

interface RouteMatch {
  readonly handler: RouteHandler;
  readonly params: Record<string, string>;
}

export class RouteManager {
  private readonly routes: Map<string, RouteDefinition> = new Map();
  private readonly logger: Logger;

  constructor(_middlewareChain: MiddlewareChain) {
    this.logger = new Logger('RouteManager');
  }

  public registerRoute(definition: RouteDefinition): void {
    const key = `${definition.method}:${definition.path}`;
    this.routes.set(key, definition);
    this.logger.debug(`Route registered: ${key}`);
  }

  public async handleRequest(request: Request): Promise<any> {
    const url = new URL(request.url);
    const method = request.method;
    const routeMatch = this.matchRoute(url.pathname, method);

    if (!routeMatch) {
      throw new Error(`Route not found: ${method} ${url.pathname}`);
    }

    const context: RequestContext = {
      request,
      requestId: this.generateRequestId(),
      startTime: new Date(),
      metadata: new Map([
        ['params', routeMatch.params]
      ])
    };

    // Execute route-specific middleware
    const route = this.getRouteDefinition(url.pathname, method);
    if (route?.middlewares) {
      const routeMiddlewareChain = new MiddlewareChain();
      route.middlewares.forEach((middleware: Middleware) => routeMiddlewareChain.use(middleware));
      await routeMiddlewareChain.execute(context);
    }

    return await routeMatch.handler(context);
  }

  public registerDefaultRoutes(): void {
    // Health check route
    this.registerRoute({
      path: '/api/health',
      method: 'GET',
      version: 'v1',
      handler: async () => ({
        status: 'healthy',
        timestamp: new Date().toISOString()
      })
    });

    // Status route
    this.registerRoute({
      path: '/api/status',
      method: 'GET',
      version: 'v1',
      handler: async () => ({
        status: 'operational',
        version: '1.0.0',
        timestamp: new Date().toISOString()
      })
    });
  }

  private matchRoute(path: string, method: string): RouteMatch | null {
    // First try exact match
    const exactKey = `${method}:${path}`;
    const exactRoute = this.routes.get(exactKey);
    
    if (exactRoute) {
      return {
        handler: exactRoute.handler,
        params: {}
      };
    }

    // Try pattern matching for parameterized routes
    for (const [key, route] of this.routes.entries()) {
      if (!key.startsWith(`${method}:`)) {
        continue;
      }

      const routePath = key.substring(method.length + 1);
      const params = this.extractParams(path, routePath);
      
      if (params !== null) {
        return {
          handler: route.handler,
          params
        };
      }
    }

    return null;
  }

  private extractParams(actualPath: string, routePath: string): Record<string, string> | null {
    const actualSegments = actualPath.split('/').filter(Boolean);
    const routeSegments = routePath.split('/').filter(Boolean);

    if (actualSegments.length !== routeSegments.length) {
      return null;
    }

    const params: Record<string, string> = {};

    for (let i = 0; i < routeSegments.length; i++) {
      const routeSegment = routeSegments[i];
      const actualSegment = actualSegments[i];

      if (routeSegment.startsWith(':')) {
        const paramName = routeSegment.substring(1);
        params[paramName] = actualSegment;
      } else if (routeSegment !== actualSegment) {
        return null;
      }
    }

    return params;
  }

  private getRouteDefinition(path: string, method: string): RouteDefinition | undefined {
    const key = `${method}:${path}`;
    return this.routes.get(key);
  }

  private generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }
}
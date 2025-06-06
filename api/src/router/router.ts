import { RouteHandler } from '../routes/route.types';

interface RouteEntry {
  readonly method: string;
  readonly path: string;
  readonly handler: RouteHandler;
  readonly pathRegex: RegExp;
  readonly paramNames: readonly string[];
}

export class Router {
  private readonly routes: RouteEntry[] = [];

  /**
   * Add a single route
   */
  public addRoute(method: string, path: string, handler: RouteHandler): void {
    const { regex, paramNames } = this.createPathMatcher(path);
    
    this.routes.push({
      method: method.toUpperCase(),
      path,
      handler,
      pathRegex: regex,
      paramNames
    });
  }

  /**
   * Add multiple routes from a route group
   */
  public addRoutes(routes: Array<{ method: string; path: string; handler: RouteHandler }>): void {
    routes.forEach(route => {
      this.addRoute(route.method, route.path, route.handler);
    });
  }

  /**
   * Find matching route and return handler
   */
  public match(method: string, pathname: string): RouteHandler | null {
    const normalizedMethod = method.toUpperCase();
    
    for (const route of this.routes) {
      if (route.method !== normalizedMethod) {
        continue;
      }

      const match = RegExp(route.pathRegex).exec(pathname);
      if (match) {
        // Extract path parameters
        const params: Record<string, string> = {};
        route.paramNames.forEach((name, index) => {
          params[name] = match[index + 1] ?? '';
        });

        // Return handler with parameter injection
        return async (context) => {
          // Add params to context
          Object.defineProperty(context, 'params', {
            value: params,
            writable: false,
            enumerable: true
          });
          
          return route.handler(context);
        };
      }
    }

    return null;
  }

  /**
   * Convert path pattern to regex and extract parameter names
   */
  private createPathMatcher(path: string): { regex: RegExp; paramNames: string[] } {
    const paramNames: string[] = [];
    
    // Convert path like "/users/:id/posts/:postId" to regex
    const regexPattern = path
      .replace(/:[^/]+/g, (match) => {
        const paramName = match.slice(1); // Remove ':'
        paramNames.push(paramName);
        return '([^/]+)'; // Match any characters except '/'
      })
      .replace(/\//g, '\\/'); // Escape forward slashes

    const regex = new RegExp(`^${regexPattern}$`);
    
    return { regex, paramNames };
  }
}

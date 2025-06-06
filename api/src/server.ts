import { createServer, IncomingMessage, ServerResponse } from 'http';
import { parse } from 'url';
import { APIConfig } from '@/shared/config/api.config';
import { logger } from '@/shared/utils/logger';
import { MiddlewareContext, MiddlewareNext, Middleware } from './middleware/types';
import { errorHandler } from './middleware/error.middleware';
import { authMiddleware } from './middleware/auth.middleware';
import { validationMiddleware } from './middleware/validation.middleware';
import { loggingMiddleware } from './middleware/logging.middleware';
import { rateLimitMiddleware } from './middleware/rate-limit.middleware';
import { corsMiddleware } from './middleware/cors.middleware';
import { Router } from './router/router';
import { healthRoutes } from './routes/health.routes';
import { authRoutes } from './routes/auth.routes';
import { userRoutes } from './routes/user.routes';
import { exerciseRoutes } from './routes/exercise.routes';
import { workoutRoutes } from './routes/workout.routes';
import { programRoutes } from './routes/program.routes';

/**
 * API Gateway Server - Backend for Frontend
 * Orchestrates requests between frontend and microservices
 */
export class APIGateway {
  private readonly config: APIConfig;
  private server?: ReturnType<typeof createServer>;
  private readonly router: Router;
  private readonly middleware: readonly Middleware[];

  constructor(config: APIConfig) {
    this.config = config;
    this.router = new Router();
    this.middleware = this.setupMiddleware();
    this.setupRoutes();
  }

  /**
   * Initialize and start the API gateway server
   */
  public async start(): Promise<void> {
    try {
      logger.info('Starting API Gateway...', {
        port: this.config.port,
        environment: this.config.environment,
        version: this.config.version
      });

      this.server = createServer((req, res) => {
        this.handleRequest(req, res).catch((error) => {
          logger.error('Unhandled request error', { error });
          if (!res.headersSent) {
            res.statusCode = 500;
            res.end('Internal Server Error');
          }
        });
      });

      await new Promise<void>((resolve, reject) => {
        this.server!.listen(this.config.port, (error?: Error) => {
          if (error) {
            reject(error);
          } else {
            resolve();
          }
        });
      });
      
      logger.info('API Gateway started successfully', {
        port: this.config.port,
        uptime: process.uptime()
      });
    } catch (error) {
      logger.error('Failed to start API Gateway', { error });
      throw error;
    }
  }

  /**
   * Gracefully shutdown the server
   */
  public async shutdown(): Promise<void> {
    try {
      logger.info('Shutting down API Gateway...');
      
      if (this.server) {
        await new Promise<void>((resolve, reject) => {
          this.server!.close((error) => {
            if (error) {
              reject(error);
            } else {
              resolve();
            }
          });
        });
      }
      
      logger.info('API Gateway shutdown complete');
    } catch (error) {
      logger.error('Error during shutdown', { error });
      throw error;
    }
  }

  /**
   * Handle incoming HTTP requests
   */
  private async handleRequest(req: IncomingMessage, res: ServerResponse): Promise<void> {
    const request = await this.createWebRequest(req);
    const context = this.createMiddlewareContext(request, res);
    
    try {
      const response = await this.executeMiddlewareChain(context);
      await this.sendResponse(res, response);
    } catch (error) {
      await this.handleError(error, res, context);
    }
  }

  /**
   * Create Web API Request from Node.js IncomingMessage
   */
  private async createWebRequest(req: IncomingMessage): Promise<Request> {
    const url = `http://${req.headers.host ?? 'localhost'}${req.url ?? '/'}`;
    const headers = new Headers();
    
    Object.entries(req.headers).forEach(([key, value]) => {
      if (typeof value === 'string') {
        headers.set(key, value);
      } else if (Array.isArray(value)) {
        headers.set(key, value.join(', '));
      }
    });

    let body: BodyInit | null = null;
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      const chunks: Buffer[] = [];
      for await (const chunk of req) {
        chunks.push(chunk);
      }
      body = Buffer.concat(chunks);
    }

    return new Request(url, {
      method: req.method ?? 'GET',
      headers,
      body
    });
  }

  /**
   * Create middleware context for request processing
   */
  private createMiddlewareContext(request: Request, res: ServerResponse): MiddlewareContext {
    return {
      request,
      response: res,
      requestId: '',
      startTime: Date.now()
    } as MiddlewareContext;
  }

  /**
   * Execute the middleware chain
   */
  private async executeMiddlewareChain(context: MiddlewareContext): Promise<Response> {
    let index = 0;

    const next: MiddlewareNext = async (): Promise<Response> => {
      if (index >= this.middleware.length) {
        // All middleware executed, handle the route
        return this.handleRoute(context);
      }

      const middleware = this.middleware[index++];
      return middleware(context, next);
    };

    return next();
  }

  /**
   * Handle route after middleware processing
   */
  private async handleRoute(context: MiddlewareContext): Promise<Response> {
    const { request } = context;
    const url = parse(request.url, true);
    const method = request.method ?? 'GET';
    const pathname = url.pathname ?? '/';

    const handler = this.router.match(method, pathname);
    
    if (!handler) {
      return new Response(
        JSON.stringify({
          success: false,
          error: {
            code: 'ROUTE_NOT_FOUND',
            message: `Route ${method} ${pathname} not found`,
            timestamp: new Date().toISOString()
          }
        }),
        {
          status: 404,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    return handler(context);
  }

  /**
   * Send Response back to client
   */
  private async sendResponse(res: ServerResponse, response: Response): Promise<void> {
    res.statusCode = response.status;
    
    response.headers.forEach((value, key) => {
      res.setHeader(key, value);
    });

    const body = await response.text();
    res.end(body);
  }

  /**
   * Handle errors during request processing
   */
  private async handleError(error: unknown, res: ServerResponse, context: MiddlewareContext): Promise<void> {
    try {
      const errorResponse = await errorHandler()(context, async () => {
        throw error;
      });
      await this.sendResponse(res, errorResponse);
    } catch (handlerError) {
      logger.error('Error in error handler', { error: handlerError });
      if (!res.headersSent) {
        res.statusCode = 500;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({
          success: false,
          error: {
            code: 'INTERNAL_SERVER_ERROR',
            message: 'An unexpected error occurred',
            timestamp: new Date().toISOString()
          }
        }));
      }
    }
  }

  /**
   * Setup middleware pipeline in correct order
   */
  private setupMiddleware(): readonly Middleware[] {
    return [
      corsMiddleware(this.config.cors),
      loggingMiddleware(),
      rateLimitMiddleware(this.config.rateLimit),
      authMiddleware(this.config.auth),
      validationMiddleware()
    ];
  }

  /**
   * Setup route handlers
   */
  private setupRoutes(): void {
    // Health routes
    this.router.addRoutes(healthRoutes());
    
    // API routes
    this.router.addRoutes(authRoutes());
    this.router.addRoutes(userRoutes());
    this.router.addRoutes(exerciseRoutes());
    this.router.addRoutes(workoutRoutes());
    this.router.addRoutes(programRoutes());
  }
}
import { MiddlewareChain } from './middleware/MiddlewareChain';
import { ErrorHandler } from './error/ErrorHandler';
import { ValidationEngine } from './validation/ValidationEngine';
import { APIVersionManager } from './versioning/APIVersionManager';
import { RouteManager } from './routing/RouteManager';

import { Logger } from '@/utils/Logger';
import type { RequestContext, ApiResponse } from '@/shared/types/api';
import { AuthMiddleware } from './middleware/AuthMiddleware';
import { RequestMiddleware } from './middleware/RequestMiddleware';
import { ResponseMiddleware } from './middleware/ResponseMiddleware';
import { ValidationMiddleware } from './middleware/ValidationMiddleware';

export class ApiFoundationFacade {
  private readonly middlewareChain: MiddlewareChain;
  private readonly errorHandler: ErrorHandler;
  private readonly validationEngine: ValidationEngine;
  private readonly versionManager: APIVersionManager;
  private readonly routeManager: RouteManager;
  private readonly logger: Logger;

  constructor() {
    this.logger = new Logger('ApiFoundationFacade');
    this.validationEngine = new ValidationEngine();
    this.errorHandler = new ErrorHandler(this.logger);
    this.versionManager = new APIVersionManager();
    this.middlewareChain = this.createMiddlewareChain();
    this.routeManager = new RouteManager(this.middlewareChain);
  }

  public setupRoutes(): void {
    try {
      this.logger.info('Setting up API routes...');
      this.routeManager.registerDefaultRoutes();
      this.logger.info('API routes setup completed');
    } catch (error) {
      this.logger.error('Failed to setup API routes', error);
      throw error;
    }
  }

  public async handleRequest(request: Request): Promise<Response> {
    const startTime = new Date();
    const requestId = this.generateRequestId();
    
    const context: RequestContext = {
      request,
      requestId,
      startTime,
      metadata: new Map()
    };

    try {
      await this.middlewareChain.execute(context);
      
      const result = await this.routeManager.handleRequest(request);
      
      const response: ApiResponse = {
        success: true,
        data: result,
        metadata: {
          version: this.versionManager.getVersionFromRequest(request),
          processingTime: Date.now() - startTime.getTime()
        },
        timestamp: new Date(),
        requestId
      };

      return new Response(JSON.stringify(response), {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'X-Request-ID': requestId,
          'X-API-Version': this.versionManager.getVersionFromRequest(request)
        }
      });
    } catch (error) {
      return this.errorHandler.handleError(error as Error, context);
    }
  }

  private createMiddlewareChain(): MiddlewareChain {
    const chain = new MiddlewareChain();
    
    chain.use(new RequestMiddleware());
    chain.use(new ValidationMiddleware(this.validationEngine));
    chain.use(new AuthMiddleware());
    chain.use(new ResponseMiddleware());
    
    return chain;
  }

  private generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }
}
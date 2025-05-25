import { Hono } from 'hono';
import { IAMContainer, IAMContainerConfig } from './container/IAMContainer';
import { createIAMRoutes } from '@/presentation/iam/routes/iamRoutes';
import { LoggerFactory } from '@/shared-kernel/infrastructure/logging/factory/LoggerFactory';

export class IAMModule {
  private readonly container: IAMContainer;
  private readonly logger = LoggerFactory.getContextualLogger('IAMModule');

  constructor(config: IAMContainerConfig) {
    this.logger.info('Initializing IAM Module');
    this.container = new IAMContainer(config);
    this.logger.info('IAM Module initialized successfully');
  }

  createRoutes(): Hono {
    this.logger.debug('Creating IAM routes');
    
    const routes = createIAMRoutes(
      this.container.getIdentityController(),
      this.container.getSessionController(),
      this.container.getAccessController()
    );

    // Add authentication middleware to protected routes
    routes.use('/identities/:id/*', (c, next) => 
      this.container.getAuthenticationMiddleware().authenticate(c, next)
    );
    
    routes.use('/access/*', (c, next) => 
      this.container.getAuthenticationMiddleware().authenticate(c, next)
    );

    this.logger.debug('IAM routes created successfully');
    return routes;
  }

  getContainer(): IAMContainer {
    return this.container;
  }

  async healthCheck(): Promise<{ status: string; details: Record<string, unknown> }> {
    try {
      // Perform basic health checks
      const commandBusHealthy = this.container.getCommandBus() !== null;
      const queryBusHealthy = this.container.getQueryBus() !== null;
      const eventBusHealthy = this.container.getEventBus() !== null;

      const details = {
        commandBus: commandBusHealthy ? 'healthy' : 'unhealthy',
        queryBus: queryBusHealthy ? 'healthy' : 'unhealthy',
        eventBus: eventBusHealthy ? 'healthy' : 'unhealthy',
        timestamp: new Date().toISOString()
      };

      const allHealthy = commandBusHealthy && queryBusHealthy && eventBusHealthy;

      return {
        status: allHealthy ? 'healthy' : 'unhealthy',
        details
      };
    } catch (error) {
      this.logger.error('Health check failed', error as Error);
      return {
        status: 'unhealthy',
        details: {
          error: (error as Error).message,
          timestamp: new Date().toISOString()
        }
      };
    }
  }
}


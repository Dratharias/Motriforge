
import { Hono } from 'hono';
import { IAMContainer, IAMContainerConfig } from '../container/IAMContainer';
import { createIAMRoutes } from '@/presentation/iam/routes/iamRoutes';
import { LoggerFactory } from '@/shared-kernel/infrastructure/logging/factory/LoggerFactory';

export class IAMModule {
  private readonly container: IAMContainer;
  private readonly logger = LoggerFactory.getContextualLogger('IAMModule');
  private initialized = false;

  constructor(config: IAMContainerConfig) {
    this.logger.info('Creating IAM Module');
    this.container = new IAMContainer(config);
  }

  /**
   * Asynchronously initializes the IAM module
   */
  async initialize(): Promise<void> {
    if (this.initialized) {
      this.logger.warn('IAM Module already initialized');
      return;
    }

    try {
      this.logger.info('Initializing IAM Module');
      await this.container.initialize();
      this.initialized = true;
      this.logger.info('IAM Module initialized successfully');
    } catch (error) {
      this.logger.error('Failed to initialize IAM Module', error as Error);
      throw error;
    }
  }

  createRoutes(): Hono {
    this.ensureInitialized();
    
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
    this.ensureInitialized();
    return this.container;
  }

  async healthCheck(): Promise<{ status: string; details: Record<string, unknown> }> {
    if (!this.initialized) {
      return {
        status: 'unhealthy',
        details: {
          error: 'Module not initialized',
          timestamp: new Date().toISOString()
        }
      };
    }

    try {
      const containerHealth = await this.container.healthCheck();
      return {
        status: containerHealth.status,
        details: {
          module: 'healthy',
          container: containerHealth.details,
          timestamp: new Date().toISOString()
        }
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

  async dispose(): Promise<void> {
    this.logger.info('Disposing IAM Module');
    await this.container.dispose();
    this.initialized = false;
  }

  private ensureInitialized(): void {
    if (!this.initialized) {
      throw new Error('IAM Module not initialized. Call initialize() first.');
    }
  }
}
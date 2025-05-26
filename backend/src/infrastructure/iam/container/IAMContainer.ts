import { RepositoryFactory, IAMRepositories } from '../factories/RepositoryFactory';
import { AdapterFactory, IAMAdapters, AdapterConfig } from '../factories/AdapterFactory';
import { ServiceFactory, IAMDomainServices } from '../factories/ServiceFactory';
import { ApplicationServiceFactory, IAMApplicationServices } from '../factories/ApplicationServiceFactory';
import { PolicyEngineFactory, IAMPolicyEngine } from '../factories/PolicyEngineFactory';
import { CQRSFactory, IAMCQRS } from '../factories/CQRSFactory';
import { ControllerFactory, IAMControllers } from '../factories/ControllerFactory';
import { LoggerFactory } from '@/shared-kernel/infrastructure/logging/factory/LoggerFactory';

export interface IAMContainerConfig extends AdapterConfig {
  // Configuration can be extended here
}

export class IAMContainer {
  private readonly logger = LoggerFactory.getContextualLogger('IAMContainer');
  private initialized = false;
  
  // Core Components - will be initialized in async method
  private repositories!: IAMRepositories;
  private adapters!: IAMAdapters;
  private domainServices!: IAMDomainServices;
  private applicationServices!: IAMApplicationServices;
  private policyEngine!: IAMPolicyEngine;
  private cqrs!: IAMCQRS;
  private controllers!: IAMControllers;

  constructor(private readonly config: IAMContainerConfig) {
    // No async operations in constructor
  }

  /**
   * Asynchronous initialization method to setup all components
   */
  async initialize(): Promise<void> {
    if (this.initialized) {
      this.logger.warn('IAM Container already initialized');
      return;
    }

    this.logger.info('Starting IAM Container initialization');

    try {
      // Initialize components in dependency order with detailed logging
      this.logger.debug('Initializing repositories');
      this.repositories = RepositoryFactory.create();
      
      this.logger.debug('Initializing adapters');
      this.adapters = AdapterFactory.create(this.config);
      
      this.logger.debug('Initializing domain services');
      this.domainServices = ServiceFactory.create(this.repositories, this.adapters);
      
      this.logger.debug('Initializing application services');
      this.applicationServices = ApplicationServiceFactory.create(
        this.repositories, 
        this.adapters, 
        this.domainServices
      );
      
      this.logger.debug('Initializing policy engine');
      this.policyEngine = PolicyEngineFactory.create();
      
      this.logger.debug('Initializing CQRS components');
      this.cqrs = await CQRSFactory.create(this.applicationServices);
      
      this.logger.debug('Initializing controllers');
      this.controllers = ControllerFactory.create(
        this.applicationServices, 
        this.cqrs, 
        this.adapters
      );

      this.initialized = true;
      this.logger.info('IAM Container initialized successfully');

    } catch (error) {
      this.logger.error('Failed to initialize IAM Container', error as Error);
      throw error;
    }
  }

  /**
   * Ensures container is initialized before access
   */
  private ensureInitialized(): void {
    if (!this.initialized) {
      throw new Error('IAM Container not initialized. Call initialize() first.');
    }
  }

  // Repository Access
  getRepositories(): IAMRepositories {
    this.ensureInitialized();
    return this.repositories;
  }

  // Adapter Access
  getAdapters(): IAMAdapters {
    this.ensureInitialized();
    return this.adapters;
  }

  // Domain Service Access
  getDomainServices(): IAMDomainServices {
    this.ensureInitialized();
    return this.domainServices;
  }

  // Application Service Access
  getApplicationServices(): IAMApplicationServices {
    this.ensureInitialized();
    return this.applicationServices;
  }

  // Policy Engine Access
  getPolicyEngine(): IAMPolicyEngine {
    this.ensureInitialized();
    return this.policyEngine;
  }

  // CQRS Access
  getCQRS(): IAMCQRS {
    this.ensureInitialized();
    return this.cqrs;
  }

  // Controller Access
  getControllers(): IAMControllers {
    this.ensureInitialized();
    return this.controllers;
  }

  // Convenience getters for backward compatibility
  getIdentityController() {
    this.ensureInitialized();
    return this.controllers.identityController;
  }

  getSessionController() {
    this.ensureInitialized();
    return this.controllers.sessionController;
  }

  getAccessController() {
    this.ensureInitialized();
    return this.controllers.accessController;
  }

  getAuthenticationMiddleware() {
    this.ensureInitialized();
    return this.controllers.authenticationMiddleware;
  }

  getPolicyEngineService() {
    this.ensureInitialized();
    return this.policyEngine.policyEngineService;
  }

  getEventBus() {
    this.ensureInitialized();
    return this.cqrs.eventBus;
  }

  getCommandBus() {
    this.ensureInitialized();
    return this.cqrs.commandBus;
  }

  getQueryBus() {
    this.ensureInitialized();
    return this.cqrs.queryBus;
  }

  // Health Check
  async healthCheck(): Promise<{ status: string; details: Record<string, unknown> }> {
    try {
      if (!this.initialized) {
        return {
          status: 'unhealthy',
          details: {
            error: 'Container not initialized',
            timestamp: new Date().toISOString()
          }
        };
      }

      const details = {
        repositories: 'healthy',
        adapters: 'healthy',
        domainServices: 'healthy',
        applicationServices: 'healthy',
        policyEngine: 'healthy',
        commandBus: this.cqrs.commandBus ? 'healthy' : 'unhealthy',
        queryBus: this.cqrs.queryBus ? 'healthy' : 'unhealthy',
        eventBus: this.cqrs.eventBus ? 'healthy' : 'unhealthy',
        controllers: 'healthy',
        timestamp: new Date().toISOString()
      };

      const allHealthy = Object.values(details)
        .filter(v => typeof v === 'string' && v !== details.timestamp)
        .every(status => status === 'healthy');

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

  // Cleanup method for graceful shutdown
  async dispose(): Promise<void> {
    this.logger.info('Disposing IAM Container');
    this.initialized = false;
    // Add cleanup logic if needed
  }
}
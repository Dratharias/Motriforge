import { Database } from '~/database/connection';
import { EventBus } from '~/shared/event-bus/event-bus';
import { LoggingService } from './logging/logging-service';
import { LogSearchService } from './logging/log-search-service';

export interface ObservabilityServices {
  eventBus: EventBus;
  loggingService: LoggingService;
  logSearchService: LogSearchService;
}

export interface ObservabilityConfig {
  logging: {
    maxMessageLength: number;
    maxContextSize: number;
    enableFileLogging: boolean;
    logFilePath: string;
    batchSize: number;
    flushIntervalMs: number;
    enableSearch: boolean;
    retentionDays: number;
  };
  eventBus: {
    maxListeners: number;
    batchSize: number;
    flushIntervalMs: number;
    retryAttempts: number;
  };
}

export class ObservabilitySystem {
  private static instance: ObservabilitySystem;
  private readonly services: ObservabilityServices;
  private initialized = false;

  constructor(
    private readonly db: Database,
    private readonly config: ObservabilityConfig
  ) {
    this.services = this.initializeServices();
  }

  static getInstance(db: Database, config?: Partial<ObservabilityConfig>): ObservabilitySystem {
    if (!ObservabilitySystem.instance) {
      const defaultConfig: ObservabilityConfig = {
        logging: {
          maxMessageLength: 2000,
          maxContextSize: 10000,
          enableFileLogging: process.env.NODE_ENV === 'development',
          logFilePath: 'logs/application.log',
          batchSize: 100,
          flushIntervalMs: 5000,
          enableSearch: true,
          retentionDays: 90
        },
        eventBus: {
          maxListeners: 50,
          batchSize: 100,
          flushIntervalMs: 5000,
          retryAttempts: 3
        }
      };

      const mergedConfig = {
        logging: { ...defaultConfig.logging, ...config?.logging },
        eventBus: { ...defaultConfig.eventBus, ...config?.eventBus }
      };

      ObservabilitySystem.instance = new ObservabilitySystem(db, mergedConfig);
    }
    return ObservabilitySystem.instance;
  }

  private initializeServices(): ObservabilityServices {
    console.log('Initializing Observability System...');

    // Initialize EventBus
    const eventBus = new EventBus(this.config.eventBus);

    // Initialize services
    const logSearchService = new LogSearchService(this.db);
    const loggingService = new LoggingService(this.db, eventBus, this.config.logging);

    console.log('Observability System initialized successfully');

    return {
      eventBus,
      loggingService,
      logSearchService
    };
  }

  async initialize(): Promise<void> {
    if (this.initialized) return;

    console.log('Starting Observability System...');

    try {
      // Ensure database is ready
      await this.db.execute('SELECT 1');

      // Log system startup
      await this.services.loggingService.info(
        'system', 'start', 'observability', 'service',
        'Observability system started successfully',
        {
          config: {
            logging: this.config.logging,
            eventBus: this.config.eventBus
          },
          timestamp: new Date().toISOString()
        },
        'observability-system'
      );

      this.initialized = true;
      console.log('✅ Observability System ready');

    } catch (error) {
      console.error('❌ Failed to initialize Observability System:', error);
      throw error;
    }
  }

  async shutdown(): Promise<void> {
    if (!this.initialized) return;

    console.log('Shutting down Observability System...');

    try {
      // Log system shutdown
      await this.services.loggingService.info(
        'system', 'shutdown', 'observability', 'service',
        'Observability system shutting down',
        { timestamp: new Date().toISOString() },
        'observability-system'
      );

      // Shutdown services
      await this.services.loggingService.shutdown();
      await this.services.eventBus.shutdown();

      this.initialized = false;
      console.log('✅ Observability System shutdown complete');

    } catch (error) {
      console.error('❌ Error during Observability System shutdown:', error);
      throw error;
    }
  }

  getServices(): ObservabilityServices {
    if (!this.initialized) {
      throw new Error('Observability System not initialized. Call initialize() first.');
    }
    return this.services;
  }

  // Convenience methods for common operations
  async log(
    params: {
      actor: string;
      action: string;
      scope: string;
      target: string;
      severityType: 'debug' | 'info' | 'warn' | 'error';
      message: string;
      context?: Record<string, any>;
      sourceComponent?: string;
    }
  ) {
    const {
      actor,
      action,
      scope,
      target,
      severityType,
      message,
      context,
      sourceComponent = 'application'
    } = params;

    const logRequest: any = {
      actor,
      action,
      scope,
      target,
      severityType,
      message,
      sourceComponent
    };
    if (context !== undefined) {
      logRequest.context = context;
    }
    return this.services.loggingService.log(logRequest);
  }

  async searchLogs(query: any) {
    return this.services.loggingService.searchLogs(query);
  }

  async analyzePatterns(hoursBack: number = 24) {
    return this.services.loggingService.analyzePatterns(hoursBack);
  }

  getStats() {
    return {
      eventBus: this.services.eventBus.getStats(),
      initialized: this.initialized,
      config: this.config
    };
  }
}

// Export types for external use
export type { LogSearchQuery } from './logging/log-search-service';
export type { LogRequest, LogEntry } from './logging/logging-service';
export type { ObservabilityEvent } from '~/shared/event-bus/event-bus';

// Export services for direct access if needed
export { LoggingService } from './logging/logging-service';
export { LogSearchService } from './logging/log-search-service';
export { EventBus } from '~/shared/event-bus/event-bus';
export { EventFactory } from '~/shared/factories/event-factory';
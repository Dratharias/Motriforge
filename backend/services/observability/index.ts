import { Database } from '~/database/connection';
import { EventBus, EventBusConfig } from '~/shared/event-bus/event-bus';
import { LoggingService, LoggingConfig } from './logging/logging-service';
import { LogSearchService, LogSearchQuery } from './logging/log-search-service';
import { EventService } from './event-service';

export interface ObservabilityConfig {
  logging: LoggingConfig;
  eventBus: EventBusConfig;
}

export interface ObservabilityServices {
  loggingService: LoggingService;
  logSearchService: LogSearchService;
  eventService: EventService;
}

export interface ObservabilityStats {
  initialized: boolean;
  eventBus: {
    handlersCount: number;
    eventTypes: string[];
    queuedEvents: number;
  };
  config: ObservabilityConfig;
}

/**
 * Main observability system that manages all observability services
 */
export class ObservabilitySystem {
  private static instance: ObservabilitySystem | null = null;
  
  private readonly db: Database;
  private readonly eventBus: EventBus;
  private readonly services: ObservabilityServices;
  private readonly config: ObservabilityConfig;
  private initialized = false;

  private constructor(db: Database, config: ObservabilityConfig) {
    this.db = db;
    this.config = config;
    this.eventBus = new EventBus(config.eventBus);
    
    // Initialize services
    this.services = {
      loggingService: new LoggingService(db, this.eventBus, config.logging),
      logSearchService: new LogSearchService(db),
      eventService: new EventService(db)
    };
  }

  /**
   * Get singleton instance
   */
  static getInstance(db?: Database, config?: ObservabilityConfig): ObservabilitySystem {
    if (!ObservabilitySystem.instance) {
      if (!db || !config) {
        throw new Error('Database and config required for first getInstance call');
      }
      ObservabilitySystem.instance = new ObservabilitySystem(db, config);
    }
    return ObservabilitySystem.instance;
  }

  /**
   * Initialize the observability system
   */
  async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }

    try {
      // Create a startup log entry to test the system
      await this.services.loggingService.info(
        'system', 
        'start', 
        'system', 
        'service',
        'ObservabilitySystem initialized successfully',
        { 
          version: '1.0.0',
          environment: process.env.NODE_ENV ?? 'development',
          timestamp: new Date().toISOString()
        },
        'observability-system'
      );

      this.initialized = true;
      console.log('✅ ObservabilitySystem initialized successfully');
    } catch (error) {
      console.error('❌ ObservabilitySystem initialization failed:', error);
      throw error;
    }
  }

  /**
   * Get all services
   */
  getServices(): ObservabilityServices {
    return this.services;
  }

  /**
   * Get system statistics
   */
  getStats(): ObservabilityStats {
    return {
      initialized: this.initialized,
      eventBus: this.eventBus.getStats(),
      config: this.config
    };
  }

  /**
   * Search logs (convenience method)
   */
  async searchLogs(query: LogSearchQuery) {
    return this.services.logSearchService.searchLogs(query);
  }

  /**
   * Analyze log patterns (convenience method)
   */
  async analyzePatterns(hoursBack: number = 24) {
    return this.services.logSearchService.analyzePatterns(hoursBack);
  }

  /**
   * Shutdown the observability system
   */
  async shutdown(): Promise<void> {
    try {
      // Shutdown services in reverse order
      await this.services.loggingService.shutdown();
      await this.eventBus.shutdown();
      
      this.initialized = false;
      ObservabilitySystem.instance = null;
      
      console.log('✅ ObservabilitySystem shutdown complete');
    } catch (error) {
      console.error('❌ ObservabilitySystem shutdown failed:', error);
      throw error;
    }
  }

  /**
   * Reset singleton (for testing)
   */
  static reset(): void {
    ObservabilitySystem.instance = null;
  }
}

// Default configuration
export const defaultObservabilityConfig: ObservabilityConfig = {
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
    batchSize: 10,
    flushIntervalMs: 100,
    retryAttempts: 2
  }
};

// Export for convenience
export { LoggingService, LogSearchService, EventService };
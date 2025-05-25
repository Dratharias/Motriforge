import { LogContext } from '@/types/shared/infrastructure/logging';
import { 
  ILogger, 
  ILogStrategy, 
  ILogFormatter, 
  ILogFilter, 
  ILogConfigurationManager, 
  IContextualLogger, 
  IAuditLogger, 
  IPerformanceLogger, 
  ILogBuilder 
} from './interfaces/ILogger';
import { ILoggerRegistry } from './registry/ILoggerRegistry';
import { IStrategyManager } from './strategy/IStrategyManager';
import { IFilterManager } from './filter/IFilterManager';
import { ILoggerCreationFactory } from './factory/ILoggerCreationFactory';
import { LoggerRegistry } from './registry/LoggerRegistry';
import { StrategyManager } from './strategy/StrategyManager';
import { FilterManager } from './filter/FilterManager';
import { LoggerCreationFactory } from './factory/LoggerCreationFactory';
import { LogEventPublisher } from './core/LogEventPublisher';
import { BaseLogger } from './core/BaseLogger';

/**
 * Logger Facade - Lightweight orchestration of logging subsystems
 * Delegates all major responsibilities to specialized managers
 */
export class LoggerFacade {
  private readonly loggerRegistry: ILoggerRegistry;
  private readonly strategyManager: IStrategyManager;
  private readonly filterManager: IFilterManager;
  private readonly loggerFactory: ILoggerCreationFactory;
  private readonly eventPublisher: LogEventPublisher;

  constructor(private readonly configManager: ILogConfigurationManager) {
    this.eventPublisher = new LogEventPublisher();
    this.loggerRegistry = new LoggerRegistry(this.eventPublisher);
    this.strategyManager = new StrategyManager();
    this.filterManager = new FilterManager();
    this.loggerFactory = new LoggerCreationFactory(this.loggerRegistry);
    
    this.initializeDefaultComponents();
  }

  // Delegation methods - single responsibility: coordinate between managers
  getLogger(name: string): ILogger {
    const logger = this.loggerRegistry.getLogger(name);
    this.configureLoggerWithStrategiesAndFilters(logger);
    return logger;
  }

  getContextualLogger(name: string, context?: Partial<LogContext>): IContextualLogger {
    return this.loggerFactory.createContextualLogger(name, context);
  }

  getAuditLogger(name?: string): IAuditLogger {
    return this.loggerFactory.createAuditLogger(name);
  }

  getPerformanceLogger(name?: string): IPerformanceLogger {
    return this.loggerFactory.createPerformanceLogger(name);
  }

  createBuilder(loggerName: string): ILogBuilder {
    return this.loggerFactory.createBuilder(loggerName);
  }

  addStrategy(strategy: ILogStrategy): void {
    this.strategyManager.addStrategy(strategy);
    this.updateAllLoggersWithStrategies();
  }

  addFormatter(formatter: ILogFormatter): void {
    this.strategyManager.addFormatter(formatter);
  }

  addFilter(filter: ILogFilter): void {
    this.filterManager.addFilter(filter);
    this.updateAllLoggersWithFilters();
  }

  async getHealthStatus(): Promise<Record<string, boolean>> {
    return await this.strategyManager.checkHealth();
  }

  async flush(): Promise<void> {
    await this.strategyManager.flush();
    await this.eventPublisher.publishFlush();
  }

  async close(): Promise<void> {
    await this.strategyManager.close();
    this.loggerRegistry.clear();
    this.filterManager.clear();
  }

  private configureLoggerWithStrategiesAndFilters(logger: ILogger): void {
    if (logger instanceof BaseLogger) {
      // Add all strategies
      this.strategyManager.getAllStrategies().forEach(strategy => {
        logger.addStrategy(strategy);
      });

      // Add all filters
      this.filterManager.getAllFilters().forEach(filter => {
        logger.addFilter(filter);
      });
    }
  }

  private updateAllLoggersWithStrategies(): void {
    this.loggerRegistry.getAllLoggers().forEach(logger => {
      if (logger instanceof BaseLogger) {
        this.strategyManager.getAllStrategies().forEach(strategy => {
          logger.addStrategy(strategy);
        });
      }
    });
  }

  private updateAllLoggersWithFilters(): void {
    this.loggerRegistry.getAllLoggers().forEach(logger => {
      if (logger instanceof BaseLogger) {
        this.filterManager.getAllFilters().forEach(filter => {
          logger.addFilter(filter);
        });
      }
    });
  }

  private initializeDefaultComponents(): void {
    // Use new command-based validation system
    const config = this.configManager.getConfiguration();
    
    // Initialize strategies based on configuration using the decomposed system
    if (config.enableConsole) {
      // Strategy initialization would happen here
      console.log('Console logging enabled');
    }
    
    if (config.enableFile) {
      // File strategy initialization would happen here  
      console.log('File logging enabled');
    }
    
    if (config.enableRemote) {
      // Remote strategy initialization would happen here
      console.log('Remote logging enabled');
    }
    
    // The actual strategy creation and registration would be handled by
    // the DefaultStrategyInitializer from the fixed_strategies_and_factory artifact
  }
}


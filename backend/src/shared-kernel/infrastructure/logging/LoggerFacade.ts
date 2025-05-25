import { LogContext } from "@/types/shared/infrastructure/logging";
import { AuditLogger } from "./AuditLogger";
import { ContextualLogger } from "./ContextualLogger";
import { BaseLogger } from "./core/BaseLogger";
import { LogBuilder } from "./core/LogBuilder";
import { LogEventPublisher } from "./core/LogEventPublisher";
import { JsonLogFormatter } from "./formatters/JsonLogFormatter";
import { TextLogFormatter } from "./formatters/TextLogFormatter";
import { ILogger, ILogStrategy, ILogFormatter, ILogFilter, ILogConfigurationManager, IContextualLogger, IAuditLogger, IPerformanceLogger, ILogBuilder } from "./interfaces/ILogger";
import { PerformanceLogger } from "./PerformanceLogger";
import { ConsoleLogStrategy } from "./strategies/ConsoleLogStrategy";
import { FileLogStrategy } from "./strategies/FileLogStrategy";




/**
 * Logger Facade - Main entry point that orchestrates logging components
 * Follows Facade pattern to avoid god object anti-pattern
 */
export class LoggerFacade {
  private readonly loggers: Map<string, ILogger> = new Map();
  private readonly strategies: Map<string, ILogStrategy> = new Map();
  private readonly formatters: Map<string, ILogFormatter> = new Map();
  private readonly filters: ILogFilter[] = [];
  private readonly eventPublisher: LogEventPublisher;
  private readonly configManager: ILogConfigurationManager;

  constructor(configManager: ILogConfigurationManager) {
    this.configManager = configManager;
    this.eventPublisher = new LogEventPublisher();
    this.initializeDefaultComponents();
  }

  /**
   * Get or create a logger with the specified name
   */
  getLogger(name: string): ILogger {
    if (!this.loggers.has(name)) {
      this.loggers.set(name, this.createLogger(name));
    }
    return this.loggers.get(name)!;
  }

  /**
   * Get a contextual logger
   */
  getContextualLogger(name: string, context?: Partial<LogContext>): IContextualLogger {
    const baseLogger = this.getLogger(name);
    return new ContextualLogger(baseLogger, context);
  }

  /**
   * Get an audit logger
   */
  getAuditLogger(name: string = 'audit'): IAuditLogger {
    const baseLogger = this.getLogger(name);
    return new AuditLogger(baseLogger);
  }

  /**
   * Get a performance logger
   */
  getPerformanceLogger(name: string = 'performance'): IPerformanceLogger {
    const baseLogger = this.getLogger(name);
    return new PerformanceLogger(baseLogger);
  }

  /**
   * Add a logging strategy
   */
  addStrategy(strategy: ILogStrategy): void {
    this.strategies.set(strategy.name, strategy);
    this.updateExistingLoggers();
  }

  /**
   * Add a formatter
   */
  addFormatter(formatter: ILogFormatter): void {
    this.formatters.set(formatter.name, formatter);
  }

  /**
   * Add a filter
   */
  addFilter(filter: ILogFilter): void {
    this.filters.push(filter);
    this.updateExistingLoggers();
  }

  /**
   * Create a log builder
   */
  createBuilder(loggerName: string): ILogBuilder {
    const logger = this.getLogger(loggerName);
    return new LogBuilder(logger);
  }

  /**
   * Get health status of all strategies
   */
  async getHealthStatus(): Promise<Record<string, boolean>> {
    const healthPromises = Array.from(this.strategies.entries()).map(async ([name, strategy]) => {
      const healthy = await strategy.isHealthy();
      return [name, healthy] as const;
    });

    const results = await Promise.allSettled(healthPromises);
    const healthStatus: Record<string, boolean> = {};

    results.forEach((result, index) => {
      const strategyName = Array.from(this.strategies.keys())[index];
      healthStatus[strategyName] = result.status === 'fulfilled' ? result.value[1] : false;
    });

    return healthStatus;
  }

  /**
   * Flush all strategies
   */
  async flush(): Promise<void> {
    const flushPromises = Array.from(this.strategies.values()).map(strategy => 
      strategy.flush().catch(error => 
        console.error(`Failed to flush strategy ${strategy.name}:`, error)
      )
    );

    await Promise.allSettled(flushPromises);
    await this.eventPublisher.publishFlush();
  }

  /**
   * Close all strategies and cleanup
   */
  async close(): Promise<void> {
    await this.flush();

    const closePromises = Array.from(this.strategies.values()).map(strategy =>
      strategy.close().catch(error =>
        console.error(`Failed to close strategy ${strategy.name}:`, error)
      )
    );

    await Promise.allSettled(closePromises);
    this.loggers.clear();
    this.strategies.clear();
  }

  private createLogger(name: string): ILogger {
    const logger = new BaseLogger(name, this.eventPublisher);
    
    // Add all strategies to the logger
    this.strategies.forEach(strategy => {
      logger.addStrategy(strategy);
    });

    // Add all filters to the logger
    this.filters.forEach(filter => {
      logger.addFilter(filter);
    });

    return logger;
  }

  private updateExistingLoggers(): void {
    this.loggers.forEach(logger => {
      if (logger instanceof BaseLogger) {
        // Re-add strategies and filters
        this.strategies.forEach(strategy => {
          logger.addStrategy(strategy);
        });
      }
    });
  }

  private initializeDefaultComponents(): void {
    // Initialize default formatters
    this.formatters.set('json', new JsonLogFormatter());
    this.formatters.set('text', new TextLogFormatter());

    // Initialize default strategies based on configuration
    const config = this.configManager.getConfiguration();
    
    if (config.enableConsole) {
      const consoleStrategy = new ConsoleLogStrategy(this.formatters.get('text')!);
      this.strategies.set('console', consoleStrategy);
    }

    if (config.enableFile) {
      const fileStrategy = new FileLogStrategy(
        './logs/app.log',
        this.formatters.get('json')!
      );
      this.strategies.set('file', fileStrategy);
    }

    if (config.enableRemote) {
      // Initialize remote strategy if configured
      // Implementation depends on specific remote logging service
    }
  }
}


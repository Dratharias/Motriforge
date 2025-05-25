import { Types } from 'mongoose';
import { LogConfiguration, LogContext } from '@/types/shared/infrastructure/logging';
import { 
  ILogger, 
  IContextualLogger, 
  IAuditLogger, 
  IPerformanceLogger, 
  ILogBuilder,
  ILogConfigurationManager
} from '../interfaces/ILogger';
import { LoggerFacade } from '../LoggerFacade';
import { LogConfigurationManager } from '../configuration/LogConfigurationManager';
import { DefaultConfigFactory } from '../configuration/DefaultConfigFactory';
import { DefaultStrategyInitializer } from '../strategies/DefaultStrategyInitializer';

/**
 * Complete Logger Factory - Main entry point for logging system
 * Provides static interface while delegating to facade pattern internally
 * 
 * Usage:
 * ```typescript
 * // Initialize once in your application
 * LoggerFactory.initialize({
 *   level: LogLevel.INFO,
 *   enableConsole: true,
 *   enableFile: true
 * });
 * 
 * // Use anywhere in your application
 * const logger = LoggerFactory.getLogger('UserService');
 * const contextLogger = LoggerFactory.getContextualLogger('UserService');
 * const auditLogger = LoggerFactory.getAuditLogger();
 * ```
 */
export class LoggerFactory {
  private static instance: LoggerFactory | null = null;
  private static isInitialized = false;
  
  private readonly facade: LoggerFacade;
  private readonly configManager: ILogConfigurationManager;

  private constructor(config: LogConfiguration) {
    this.configManager = new LogConfigurationManager(config);
    this.facade = new LoggerFacade(this.configManager);
    
    // Initialize default strategies
    DefaultStrategyInitializer.initialize(
      (this.facade as any).strategyManager, // Access private for initialization
      config
    );
  }

  /**
   * Initialize the logging system with configuration
   * Must be called once before using any logging methods
   */
  static initialize(config?: Partial<LogConfiguration>): void {
    if (LoggerFactory.isInitialized) {
      console.warn('LoggerFactory is already initialized. Ignoring duplicate initialization.');
      return;
    }

    const fullConfig = config 
      ? { ...DefaultConfigFactory.create(), ...config }
      : DefaultConfigFactory.create();

    LoggerFactory.instance = new LoggerFactory(fullConfig);
    LoggerFactory.isInitialized = true;
  }

  /**
   * Get the singleton instance (auto-initializes with defaults if needed)
   */
  static getInstance(): LoggerFactory {
    if (!LoggerFactory.instance) {
      LoggerFactory.initialize(); // Auto-initialize with defaults
    }
    return LoggerFactory.instance!;
  }

  /**
   * Get a basic logger by name
   */
  static getLogger(name: string): ILogger {
    return LoggerFactory.getInstance().facade.getLogger(name);
  }

  /**
   * Get a contextual logger with optional initial context
   */
  static getContextualLogger(name: string, context?: Partial<LogContext>): IContextualLogger {
    return LoggerFactory.getInstance().facade.getContextualLogger(name, context);
  }

  /**
   * Get an audit logger for compliance logging
   */
  static getAuditLogger(name?: string): IAuditLogger {
    return LoggerFactory.getInstance().facade.getAuditLogger(name);
  }

  /**
   * Get a performance logger for timing and metrics
   */
  static getPerformanceLogger(name?: string): IPerformanceLogger {
    return LoggerFactory.getInstance().facade.getPerformanceLogger(name);
  }

  /**
   * Create a log builder for complex log entries
   */
  static createBuilder(loggerName: string): ILogBuilder {
    return LoggerFactory.getInstance().facade.createBuilder(loggerName);
  }

  /**
   * Update the logging configuration
   */
  static async updateConfiguration(config: Partial<LogConfiguration>): Promise<void> {
    const instance = LoggerFactory.getInstance();
    await instance.configManager.updateConfiguration(config);
  }

  /**
   * Get current configuration
   */
  static getConfiguration(): LogConfiguration {
    return LoggerFactory.getInstance().configManager.getConfiguration();
  }

  /**
   * Check health status of all logging strategies
   */
  static async getHealthStatus(): Promise<Record<string, boolean>> {
    return await LoggerFactory.getInstance().facade.getHealthStatus();
  }

  /**
   * Flush all pending log entries
   */
  static async flush(): Promise<void> {
    await LoggerFactory.getInstance().facade.flush();
  }

  /**
   * Close the logging system and cleanup resources
   */
  static async close(): Promise<void> {
    if (LoggerFactory.instance) {
      await LoggerFactory.instance.facade.close();
      LoggerFactory.instance = null;
      LoggerFactory.isInitialized = false;
    }
  }

  /**
   * Check if the logger factory is initialized
   */
  static isReady(): boolean {
    return LoggerFactory.isInitialized && LoggerFactory.instance !== null;
  }

  // Instance methods for advanced usage
  
  /**
   * Get the underlying facade (for advanced operations)
   */
  getFacade(): LoggerFacade {
    return this.facade;
  }

  /**
   * Get the configuration manager
   */
  getConfigurationManager(): ILogConfigurationManager {
    return this.configManager;
  }

  // Legacy/deprecated methods for backward compatibility
  
  /**
   * @deprecated Use getContextualLogger() instead
   */
  static createSecurePerformanceLogger(baseLogger: ILogger): ILogger {
    console.warn('createSecurePerformanceLogger() is deprecated. Use decorators directly.');
    // Import decorators here to avoid circular dependencies
    const { SecureLogDecorator } = require('../decorators/SecureLogDecorator');
    const { PerformanceLogDecorator } = require('../decorators/PerformanceLogDecorator');
    
    return new SecureLogDecorator(
      new PerformanceLogDecorator(baseLogger)
    );
  }

  /**
   * @deprecated Use createBuilder() instead
   */
  static createBuilderFor(logger: ILogger): ILogBuilder {
    console.warn('createBuilderFor() is deprecated. Use createBuilder() instead.');
    const { LogBuilder } = require('../core/LogBuilder');
    return new LogBuilder(logger);
  }

  /**
   * @deprecated Use the facade directly for formatters
   */
  static createFormatter(format: 'json' | 'text'): any {
    console.warn('createFormatter() is deprecated. Formatters are managed internally.');
    const { JsonLogFormatter } = require('../formatters/JsonLogFormatter');
    const { TextLogFormatter } = require('../formatters/TextLogFormatter');
    
    switch (format) {
      case 'json':
        return new JsonLogFormatter();
      case 'text':
        return new TextLogFormatter();
      default:
        throw new Error(`Unknown log format: ${format}`);
    }
  }
}
import { LogConfiguration, LogContext } from "@/types/shared/infrastructure/logging";
import { ILogger, IContextualLogger, IAuditLogger, IPerformanceLogger } from "./interfaces/ILogger";
import { LogConfigurationManager } from "./LogConfigurationManager";
import { LoggerFacade } from "./LoggerFacade";

/**
 * Logger Factory - Factory pattern for creating configured loggers
 */
export class LoggerFactory {
  private static instance: LoggerFacade;
  private static configManager: LogConfigurationManager;

  /**
   * Initialize the logger factory with configuration
   */
  static initialize(config?: Partial<LogConfiguration>): void {
    LoggerFactory.configManager = new LogConfigurationManager(config);
    LoggerFactory.instance = new LoggerFacade(LoggerFactory.configManager);
  }

  /**
   * Get a logger instance
   */
  static getLogger(name: string): ILogger {
    if (!LoggerFactory.instance) {
      throw new Error('LoggerFactory not initialized. Call LoggerFactory.initialize() first.');
    }
    return LoggerFactory.instance.getLogger(name);
  }

  /**
   * Get a contextual logger instance
   */
  static getContextualLogger(name: string, context?: Partial<LogContext>): IContextualLogger {
    if (!LoggerFactory.instance) {
      throw new Error('LoggerFactory not initialized. Call LoggerFactory.initialize() first.');
    }
    return LoggerFactory.instance.getContextualLogger(name, context);
  }

  /**
   * Get an audit logger instance
   */
  static getAuditLogger(name?: string): IAuditLogger {
    if (!LoggerFactory.instance) {
      throw new Error('LoggerFactory not initialized. Call LoggerFactory.initialize() first.');
    }
    return LoggerFactory.instance.getAuditLogger(name);
  }

  /**
   * Get a performance logger instance
   */
  static getPerformanceLogger(name?: string): IPerformanceLogger {
    if (!LoggerFactory.instance) {
      throw new Error('LoggerFactory not initialized. Call LoggerFactory.initialize() first.');
    }
    return LoggerFactory.instance.getPerformanceLogger(name);
  }

  /**
   * Get the logger facade instance
   */
  static getInstance(): LoggerFacade {
    if (!LoggerFactory.instance) {
      throw new Error('LoggerFactory not initialized. Call LoggerFactory.initialize() first.');
    }
    return LoggerFactory.instance;
  }

  /**
   * Shutdown all loggers
   */
  static async shutdown(): Promise<void> {
    if (LoggerFactory.instance) {
      await LoggerFactory.instance.close();
    }
  }
}
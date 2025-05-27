import { Logger, LogLevel } from '../base/Logger';
import { ConsoleFormatter, ConsoleLogger } from './ConsoleLogger';
import { FileLogger } from './FileLogger';

/**
 * Logger configuration options
 */
export interface LoggerConfig {
  readonly level: LogLevel;
  readonly context?: string;
  readonly type: 'console' | 'file';
  readonly filePath?: string;
  readonly maxFileSize?: number;
  readonly rotateCount?: number;
}

/**
 * Factory for creating logger instances
 */
export class LoggerFactory {
  private static readonly loggers = new Map<string, Logger>();

  /**
   * Create or get a logger instance
   */
  static getLogger(name: string, config?: LoggerConfig): Logger {
    const existing = LoggerFactory.loggers.get(name);
    if (existing && !config) {
      return existing;
    }

    const logger = LoggerFactory.createLogger(name, config);
    LoggerFactory.loggers.set(name, logger);
    return logger;
  }

  /**
   * Create a new logger instance
   */
  private static createLogger(name: string, config?: LoggerConfig): Logger {
    const finalConfig: LoggerConfig = {
      level: LogLevel.INFO,
      context: name,
      type: 'console',
      ...config
    };

    const consoleLogger = new ConsoleLogger(
      finalConfig.context!,
      new ConsoleFormatter()
    );
  
    switch (finalConfig.type) {
      case 'console':
        consoleLogger.setLevel(finalConfig.level);
        return consoleLogger;
      case 'file':
        if (!finalConfig.filePath) {
          throw new Error('File path is required for file logger');
        }
        return new FileLogger(
          finalConfig.context!,
          finalConfig.filePath,
          finalConfig.maxFileSize,
          finalConfig.rotateCount
        );
  
      default:
        throw new Error(`Unknown logger type: ${finalConfig.type}`);
    }
  }

  /**
   * Create a console logger
   */
  static console(context: string, level: LogLevel = LogLevel.INFO): Logger {
    const consoleLogger = new ConsoleLogger(context, new ConsoleFormatter())
    consoleLogger.setLevel(level)
    return consoleLogger;
  }

  /**
   * Create a file logger
   */
  static file(
    context: string,
    filePath: string,
    level: LogLevel = LogLevel.INFO,
    maxFileSize?: number,
    rotateCount?: number
  ): Logger {
    return new FileLogger(context, filePath, maxFileSize, rotateCount);
  }

  /**
   * Clear all cached loggers
   */
  static clearCache(): void {
    LoggerFactory.loggers.clear();
  }

  /**
   * Get all cached loggers
   */
  static getAllLoggers(): ReadonlyMap<string, Logger> {
    return new Map(LoggerFactory.loggers);
  }
}
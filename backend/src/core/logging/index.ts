import { LoggerService } from './LoggerService';
import { LoggerFacade } from './LoggerFacade';
import { LogContextManager } from './LogContextManager';
import { LogMetrics } from './LogMetrics';
import { ConsoleTransport } from './transports/ConsoleTransport';
import { LogMiddleware } from './LogMiddleware';
import { JsonFormatter } from './formatters/JsonFormatter';
import { SimpleFormatter } from './formatters/SimpleFormatter';
import { LogLevel } from '@/types/logging';

// Default configuration
const defaultConfig = {
  defaultLevel: LogLevel.INFO,
  enabledTransports: ['console'],
  transports: {
    console: {
      id: 'console',
      enabled: true,
      minLevel: LogLevel.INFO,
      colorized: true
    }
  }
};

// Create singleton instances
const contextManager = new LogContextManager({
  environment: process.env.NODE_ENV ?? 'development',
  version: process.env.APP_VERSION ?? '0.0.1'
});

const logMetrics = new LogMetrics();

const loggerService = new LoggerService(
  defaultConfig,
  contextManager,
  logMetrics
);

// Initialize the service
loggerService.initialize().catch(err => {
  console.error('Failed to initialize logger service:', err);
});

// Create the main logger facade
const logger = new LoggerFacade(loggerService);

// Create middleware factory
const createLogMiddleware = (options = {}) => {
  return new LogMiddleware(logger, options);
};

// Export everything
export {
  logger,
  loggerService,
  contextManager,
  logMetrics,
  createLogMiddleware,
  LoggerFacade,
  LoggerService,
  LogContextManager,
  LogMetrics,
  LogMiddleware,
  ConsoleTransport,
  JsonFormatter,
  SimpleFormatter
};
import { ErrorHandlingFacade } from '../ErrorHandlingFacade';
import { LoggerFacade } from '../../logging/LoggerFacade';
import { ErrorContext } from '../ErrorContext';
import { GlobalErrorOptions, ErrorReport } from '@/types/errors';


export class GlobalErrorHandler {
  private readonly errorHandlingFacade: ErrorHandlingFacade;
  private readonly logger: LoggerFacade;
  private readonly options: GlobalErrorOptions;
  private isInitialized: boolean = false;
  private readonly defaultRejectionHandler: any;
  private readonly defaultExceptionHandler: any;

  constructor(
    errorHandlingFacade: ErrorHandlingFacade,
    logger: LoggerFacade,
    options: GlobalErrorOptions = {}
  ) {
    this.errorHandlingFacade = errorHandlingFacade;
    this.logger = logger;
    this.options = {
      handleRejections: true,
      handleExceptions: true,
      exitOnUncaughtException: true,
      logErrors: true,
      ...options
    };
    
    // Store original handlers - adjust to use any type
    this.defaultRejectionHandler = process.listeners('unhandledRejection')[0] ?? null;
    this.defaultExceptionHandler = process.listeners('uncaughtException')[0] ?? null;
  }

  public initialize(): void {
    if (this.isInitialized) return;

    if (this.options.handleRejections) {
      process.on('unhandledRejection', this.handleUnhandledRejection.bind(this));
    }

    if (this.options.handleExceptions) {
      process.on('uncaughtException', this.handleUncaughtException.bind(this));
    }

    this.isInitialized = true;
    this.logger.info('Global error handler initialized', {
      component: 'GlobalErrorHandler',
      options: this.options
    });
  }

  public handleUnhandledRejection(reason: any, promise: Promise<any>): void {
    const error = reason instanceof Error ? reason : new Error(String(reason));
    
    if (this.options.logErrors) {
      this.logger.error('Unhandled Promise Rejection', error, {
        component: 'GlobalErrorHandler',
        source: 'promise',
        isPromiseRejection: true
      });
    }

    const errorReport = this.getErrorReport(error, true);
    
    // Create a proper ErrorContext instance
    const errorContext = new ErrorContext({
      source: 'promise',
      isClient: false,
      correlationId: crypto.randomUUID(),
      metadata: {
        isPromiseRejection: true,
        errorReport
      }
    });

    this.errorHandlingFacade.logError(error, errorContext);
  }

  public handleUncaughtException(error: Error): void {
    if (this.options.logErrors) {
      this.logger.error('Uncaught Exception', error, {
        component: 'GlobalErrorHandler',
        source: 'system',
        isUncaughtException: true
      });
    }

    const errorReport = this.getErrorReport(error, false);
    
    // Create a proper ErrorContext instance
    const errorContext = new ErrorContext({
      source: 'system',
      isClient: false,
      correlationId: crypto.randomUUID(),
      metadata: {
        isUncaughtException: true,
        errorReport
      }
    });

    this.errorHandlingFacade.logError(error, errorContext);

    if (this.options.exitOnUncaughtException && this.shouldTerminate(error)) {
      setTimeout(() => {
        process.exit(1);
      }, 1000);
    }
  }

  public restoreDefault(): void {
    if (!this.isInitialized) return;

    process.removeListener('unhandledRejection', this.handleUnhandledRejection);
    process.removeListener('uncaughtException', this.handleUncaughtException);
    
    if (this.defaultRejectionHandler) {
      process.on('unhandledRejection', this.defaultRejectionHandler);
    }
    
    if (this.defaultExceptionHandler) {
      process.on('uncaughtException', this.defaultExceptionHandler);
    }

    this.isInitialized = false;
    this.logger.info('Global error handler restored to default', {
      component: 'GlobalErrorHandler'
    });
  }

  private getErrorReport(error: Error, isPromiseRejection: boolean = false): ErrorReport {
    return {
      error,
      timestamp: new Date(),
      context: isPromiseRejection ? 'Promise Rejection' : 'Uncaught Exception',
      isPromiseRejection
    };
  }

  private shouldTerminate(error: Error): boolean {
    // Logic to determine if the application should terminate
    return true;
  }
}
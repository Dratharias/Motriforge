import { ErrorHandler } from '@/types/errors';
import { LoggerFacade } from '../../logging/LoggerFacade';

/**
 * Registry that manages error handlers and provides methods to retrieve
 * the appropriate handler for a given error.
 */
export class ErrorHandlerRegistry {
  /**
   * Handlers mapped by error type name
   */
  private readonly handlers: Map<string, ErrorHandler>;
  
  /**
   * Priority handlers that can handle specific errors but aren't mapped to a type
   */
  private readonly priorityHandlers: ErrorHandler[];
  
  /**
   * Default handler used when no specific handler is found
   */
  private defaultHandler: ErrorHandler;
  
  /**
   * Logger for registry operations
   */
  private readonly logger: LoggerFacade;
  
  constructor(logger: LoggerFacade, defaultHandler: ErrorHandler) {
    this.handlers = new Map<string, ErrorHandler>();
    this.priorityHandlers = [];
    this.defaultHandler = defaultHandler;
    this.logger = logger.withComponent('ErrorHandlerRegistry');
  }
  
  /**
   * Register a handler for a specific error type
   * 
   * @param errorType - Name of the error type (e.g., 'ValidationError')
   * @param handler - Handler for this error type
   */
  public registerHandler(errorType: string, handler: ErrorHandler): void {
    this.handlers.set(errorType, handler);
    this.logger.debug(`Registered handler for error type: ${errorType}`);
  }
  
  /**
   * Register a priority handler that can handle multiple error types
   * 
   * @param handler - Priority handler
   */
  public registerPriorityHandler(handler: ErrorHandler): void {
    this.priorityHandlers.push(handler);
    this.sortPriorityHandlers();
    this.logger.debug('Registered priority handler');
  }
  
  /**
   * Set the default handler to use when no specific handler is found
   * 
   * @param handler - Default error handler
   */
  public setDefaultHandler(handler: ErrorHandler): void {
    this.defaultHandler = handler;
    this.logger.debug('Set default error handler');
  }
  
  /**
   * Get the appropriate handler for a given error
   * 
   * @param error - Error to find handler for
   * @returns The most appropriate error handler
   */
  public getHandler(error: Error): ErrorHandler {
    // First check for a priority handler that can handle this error
    const priorityHandler = this.findMatchingHandler(error);
    if (priorityHandler) {
      return priorityHandler;
    }
    
    // Then check for a handler registered for this error type
    const errorType = error.constructor.name;
    const handler = this.handlers.get(errorType);
    
    if (handler) {
      this.logger.debug(`Found handler for error type: ${errorType}`);
      return handler;
    }
    
    this.logger.debug(`No specific handler found for error type: ${errorType}, using default`);
    return this.defaultHandler;
  }
  
  /**
   * Get all registered handlers
   * 
   * @returns All error handlers
   */
  public getAllHandlers(): ErrorHandler[] {
    return [
      ...this.priorityHandlers,
      ...Array.from(this.handlers.values()),
      this.defaultHandler
    ];
  }
  
  /**
   * Get handler for a specific error type
   * 
   * @param errorType - Name of the error type
   * @returns Handler for the specified error type, or null if not found
   */
  public getHandlerForType(errorType: string): ErrorHandler | null {
    return this.handlers.get(errorType) || null;
  }
  
  /**
   * Find a priority handler that can handle the given error
   * 
   * @param error - Error to find handler for
   * @returns Matching handler or null if none found
   */
  private findMatchingHandler(error: Error): ErrorHandler | null {
    for (const handler of this.priorityHandlers) {
      if (handler.canHandle(error)) {
        this.logger.debug(`Found priority handler for error: ${error.constructor.name}`);
        return handler;
      }
    }
    return null;
  }
  
  /**
   * Sort priority handlers by priority (highest first)
   */
  private sortPriorityHandlers(): void {
    this.priorityHandlers.sort((a, b) => b.getPriority() - a.getPriority());
  }
}
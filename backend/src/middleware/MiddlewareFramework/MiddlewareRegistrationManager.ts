import { ContextualLogger } from "@/shared-kernel/infrastructure/logging/ContextualLogger";
import { IConfigurableMiddleware } from "@/types/middleware/framework";
import { MiddlewareInfo } from ".";


/**
 * Manages middleware registration, dependencies, and lifecycle
 */
export class MiddlewareRegistrationManager {
  private readonly middlewareRegistry: Map<string, IConfigurableMiddleware>;
  private readonly logger: ContextualLogger;

  constructor(logger: ContextualLogger) {
    this.middlewareRegistry = new Map();
    this.logger = logger;
  }

  /**
   * Registers a middleware with dependency validation
   */
  register(middleware: IConfigurableMiddleware): void {
    if (this.middlewareRegistry.has(middleware.name)) {
      throw new Error(`Middleware ${middleware.name} is already registered`);
    }

    this.validateDependencies(middleware);
    this.middlewareRegistry.set(middleware.name, middleware);
    
    this.logger.info('Middleware registered', {
      middlewareName: middleware.name,
      priority: middleware.config.priority,
      enabled: middleware.config.enabled,
      dependencies: middleware.dependencies
    });
  }

  /**
   * Unregisters a middleware with dependent checking
   */
  unregister(name: string): void {
    if (!this.middlewareRegistry.has(name)) {
      throw new Error(`Middleware ${name} is not registered`);
    }

    const dependents = this.findDependents(name);
    if (dependents.length > 0) {
      throw new Error(
        `Cannot unregister middleware ${name}. Dependents: ${dependents.join(', ')}`
      );
    }

    this.middlewareRegistry.delete(name);
    this.logger.info('Middleware unregistered', { middlewareName: name });
  }

  /**
   * Sets enabled state for a middleware
   */
  setEnabled(name: string, enabled: boolean): void {
    const middleware = this.middlewareRegistry.get(name);
    if (!middleware) {
      throw new Error(`Middleware ${name} is not registered`);
    }

    const newConfig = { ...middleware.config, enabled };
    const updatedMiddleware = { ...middleware, config: newConfig };
    this.middlewareRegistry.set(name, updatedMiddleware);

    this.logger.info('Middleware status changed', {
      middlewareName: name,
      enabled
    });
  }

  /**
   * Gets the middleware registry map
   */
  getMiddlewareMap(): Map<string, IConfigurableMiddleware> {
    return new Map(this.middlewareRegistry);
  }

  /**
   * Gets middleware information
   */
  getMiddlewareInfo(): readonly MiddlewareInfo[] {
    return Array.from(this.middlewareRegistry.values()).map(middleware => ({
      name: middleware.name,
      priority: middleware.config.priority,
      enabled: middleware.config.enabled,
      dependencies: middleware.dependencies ?? [],
      hasConditions: (middleware.config.conditions?.length ?? 0) > 0
    }));
  }

  /**
   * Gets a specific middleware by name
   */
  getMiddleware(name: string): IConfigurableMiddleware | undefined {
    return this.middlewareRegistry.get(name);
  }

  /**
   * Checks if middleware exists
   */
  hasMiddleware(name: string): boolean {
    return this.middlewareRegistry.has(name);
  }

  /**
   * Gets all registered middleware names
   */
  getMiddlewareNames(): string[] {
    return Array.from(this.middlewareRegistry.keys());
  }

  /**
   * Validates middleware dependencies
   */
  private validateDependencies(middleware: IConfigurableMiddleware): void {
    if (!middleware.dependencies) {
      return;
    }

    for (const dependency of middleware.dependencies) {
      if (!this.middlewareRegistry.has(dependency)) {
        throw new Error(
          `Middleware ${middleware.name} depends on ${dependency}, but it is not registered`
        );
      }
    }
  }

  /**
   * Finds middleware that depend on the given middleware
   */
  private findDependents(middlewareName: string): string[] {
    const dependents: string[] = [];

    for (const [name, middleware] of this.middlewareRegistry) {
      if (middleware.dependencies?.includes(middlewareName)) {
        dependents.push(name);
      }
    }

    return dependents;
  }
}
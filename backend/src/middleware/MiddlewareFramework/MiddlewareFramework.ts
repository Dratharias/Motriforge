import { ContextualLogger } from "@/shared-kernel/infrastructure/logging/ContextualLogger";
import { IConfigurableMiddleware, RequestContext, MiddlewareResult } from "@/types/middleware/framework";
import { IPolicyEnforcementPoint } from "@/types/shared/base-types";
import { MiddlewareRegistrationManager, MiddlewareFrameworkConfig } from ".";
import { MiddlewareConfigurationManager } from "./MiddlewareConfigurationManager";
import { MiddlewareExecutionEngine } from "./MiddlewareExecutionEngine";
import { MiddlewarePolicyEnforcer } from "./MiddlewarePolicyEnforcer";

/**
 * Simplified middleware framework that orchestrates specialized components
 */
export class MiddlewareFramework {
  private readonly registrationManager: MiddlewareRegistrationManager;
  private readonly executionEngine: MiddlewareExecutionEngine;
  private readonly policyEnforcer: MiddlewarePolicyEnforcer;
  private readonly configurationManager: MiddlewareConfigurationManager;
  private readonly logger: ContextualLogger;

  constructor(
    policyEnforcementPoint: IPolicyEnforcementPoint,
    logger: ContextualLogger,
    config?: Partial<MiddlewareFrameworkConfig>
  ) {
    this.logger = logger;
    this.configurationManager = new MiddlewareConfigurationManager(config);
    this.registrationManager = new MiddlewareRegistrationManager(logger);
    this.executionEngine = new MiddlewareExecutionEngine(logger, this.configurationManager);
    this.policyEnforcer = new MiddlewarePolicyEnforcer(policyEnforcementPoint, logger);

    // Log framework initialization
    this.logger.info("MiddlewareFramework initialized", {
      operation: "initialize",
      config: this.configurationManager.getConfig(),
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Registers a middleware - delegates to registration manager
   */
  registerMiddleware(middleware: IConfigurableMiddleware): void {
    this.logger.info("Registering middleware", {
      operation: "registerMiddleware",
      middlewareName: middleware.name,
      priority: middleware.config.priority,
      enabled: middleware.config.enabled,
      timestamp: new Date().toISOString()
    });

    try {
      this.registrationManager.register(middleware);
      
      this.logger.info("Middleware registered successfully", {
        middlewareName: middleware.name,
        totalMiddleware: this.registrationManager.getMiddlewareInfo().length
      });
    } catch (error) {
      this.logger.error(`Failed to register middleware: ${middleware.name}`, error instanceof Error ? error : undefined, {
        operation: "registerMiddleware",
        middleware: middleware.name,
        priority: middleware.config.priority,
        enabled: middleware.config.enabled
      });
      throw error;
    }
  }

  /**
   * Unregisters a middleware - delegates to registration manager
   */
  unregisterMiddleware(name: string): void {
    this.logger.info("Unregistering middleware", {
      operation: "unregisterMiddleware",
      middlewareName: name,
      timestamp: new Date().toISOString()
    });

    try {
      this.registrationManager.unregister(name);
      
      this.logger.info("Middleware unregistered successfully", {
        middlewareName: name,
        totalMiddleware: this.registrationManager.getMiddlewareInfo().length
      });
    } catch (error) {
      this.logger.error(`Failed to unregister middleware: ${name}`, error instanceof Error ? error : undefined, {
        operation: "unregisterMiddleware",
        middleware: name
      });
      throw error;
    }
  }

  /**
   * Executes the middleware chain - delegates to execution engine
   */
  async executeChain(context: RequestContext): Promise<MiddlewareResult> {
    const startTime = Date.now();
    const middlewareMap = this.registrationManager.getMiddlewareMap();
    
    this.logger.debug("Starting middleware chain execution", {
      operation: "executeChain",
      middlewareCount: middlewareMap.size,
      requestId: context.requestId.toString(),
      path: context.path,
      method: context.method,
      timestamp: new Date().toISOString()
    });

    try {
      const result = await this.executionEngine.execute(middlewareMap, context);
      const executionTime = Date.now() - startTime;

      this.logger.info("Middleware chain execution completed", {
        requestId: context.requestId.toString(),
        success: result.success,
        executionTimeMs: executionTime,
        statusCode: result.statusCode,
        response: result.response ? {
          hasBody: !!result.response
        } : undefined
      });

      return result;
    } catch (error) {
      const executionTime = Date.now() - startTime;
      
      this.logger.error(`Middleware chain execution failed for request ${context.requestId}`, error instanceof Error ? error : undefined, {
        operation: "executeChain",
        requestId: context.requestId.toString(),
        executionTimeMs: executionTime,
        path: context.path,
        method: context.method
      });
      
      throw error;
    }
  }

  /**
   * Enforces policies - delegates to policy enforcer
   */
  async enforcePolicy(
    policyName: string,
    context: RequestContext,
    resource?: any
  ): Promise<boolean> {
    this.logger.debug("Enforcing policy", {
      operation: "enforcePolicy",
      policyName,
      requestId: context.requestId.toString(),
      resourceType: resource ? typeof resource : undefined,
      timestamp: new Date().toISOString()
    });

    try {
      const result = await this.policyEnforcer.enforce(policyName, context, resource);
      
      this.logger.info("Policy enforcement completed", {
        policyName,
        requestId: context.requestId.toString(),
        allowed: result,
        timestamp: new Date().toISOString()
      });

      return result;
    } catch (error) {
      this.logger.error(`Policy enforcement failed for ${policyName} on request ${context.requestId}`, error instanceof Error ? error : undefined, {
        operation: "enforcePolicy",
        policyName,
        requestId: context.requestId.toString()
      });
      
      throw error;
    }
  }

  /**
   * Gets middleware information - delegates to registration manager
   */
  getMiddlewareInfo() {
    const info = this.registrationManager.getMiddlewareInfo();
    
    this.logger.debug("Retrieved middleware information", {
      operation: "getMiddlewareInfo",
      middlewareCount: info.length,
      middlewareNames: info.map(m => m.name)
    });

    return info;
  }

  /**
   * Sets middleware enabled state - delegates to registration manager
   */
  setMiddlewareEnabled(name: string, enabled: boolean): void {
    this.logger.info("Changing middleware enabled state", {
      operation: "setMiddlewareEnabled",
      middlewareName: name,
      enabled,
      timestamp: new Date().toISOString()
    });

    try {
      this.registrationManager.setEnabled(name, enabled);
      
      this.logger.info("Middleware enabled state changed successfully", {
        middlewareName: name,
        enabled
      });
    } catch (error) {
      this.logger.error(`Failed to change middleware enabled state for ${name} to ${enabled}`, error instanceof Error ? error : undefined, {
        operation: "setMiddlewareEnabled",
        middleware: name,
        targetState: enabled
      });
      throw error;
    }
  }

  /**
   * Gets current configuration
   */
  getConfiguration(): MiddlewareFrameworkConfig {
    const config = this.configurationManager.getConfig();
    
    this.logger.debug("Retrieved framework configuration", {
      operation: "getConfiguration",
      config
    });

    return config;
  }
}
import { ObjectId } from 'mongodb';
import { IPolicy, IPolicyEnforcementPoint, ISecurityContext } from '@/types/shared/base-types';
import { ContextualLogger } from '../logging/ContextualLogger';
import { ApplicationContext } from '@/types/shared/enums/common';

/**
 * Policy evaluation result
 */
export interface PolicyEvaluationResult {
  readonly allowed: boolean;
  readonly policyName: string;
  readonly reason?: string;
  readonly additionalContext?: Record<string, any>;
  readonly evaluationTime: number;
  readonly timestamp: Date;
}

/**
 * Policy enforcement context
 */
export interface PolicyEnforcementContext {
  readonly requestId: ObjectId;
  readonly policyNames: readonly string[];
  readonly resource?: any;
  readonly securityContext: ISecurityContext;
  readonly applicationContext?: ApplicationContext;
  readonly metadata?: Record<string, any>;
}

/**
 * Policy registry for managing policies
 */
interface IPolicyRegistry {
  register(policy: IPolicy): void;
  unregister(policyName: string): void;
  get(policyName: string): IPolicy | undefined;
  getAll(): readonly IPolicy[];
  has(policyName: string): boolean;
  clear(): void;
}

/**
 * Policy registry implementation
 */
class PolicyRegistry implements IPolicyRegistry {
  private readonly policies: Map<string, IPolicy>;
  private readonly logger: ContextualLogger;

  constructor(logger: ContextualLogger) {
    this.policies = new Map();
    this.logger = logger;
  }

  register(policy: IPolicy): void {
    if (this.policies.has(policy.name)) {
      this.logger.warn(`Policy ${policy.name} is being overwritten`);
    }

    this.policies.set(policy.name, policy);
    this.logger.info(`Policy registered: ${policy.name}`, {
      policyName: policy.name,
      totalPolicies: this.policies.size
    });
  }

  unregister(policyName: string): void {
    if (this.policies.delete(policyName)) {
      this.logger.info(`Policy unregistered: ${policyName}`, {
        policyName,
        totalPolicies: this.policies.size
      });
    } else {
      this.logger.warn(`Attempted to unregister non-existent policy: ${policyName}`);
    }
  }

  get(policyName: string): IPolicy | undefined {
    return this.policies.get(policyName);
  }

  getAll(): readonly IPolicy[] {
    return Array.from(this.policies.values());
  }

  has(policyName: string): boolean {
    return this.policies.has(policyName);
  }

  clear(): void {
    const count = this.policies.size;
    this.policies.clear();
    this.logger.info(`All policies cleared`, { clearedCount: count });
  }
}

/**
 * Policy enforcement point implementation
 */
export class PolicyEnforcementPoint implements IPolicyEnforcementPoint {
  private readonly registry: IPolicyRegistry;
  private readonly logger: ContextualLogger;
  private readonly defaultDenyAll: boolean;
  private readonly enableAuditLogging: boolean;

  constructor(
    logger: ContextualLogger,
    options: {
      defaultDenyAll?: boolean;
      enableAuditLogging?: boolean;
    } = {}
  ) {
    this.logger = logger;
    this.registry = new PolicyRegistry(logger);
    this.defaultDenyAll = options.defaultDenyAll ?? true;
    this.enableAuditLogging = options.enableAuditLogging ?? true;
  }

  /**
   * Registers a policy
   */
  registerPolicy(policy: IPolicy): void {
    this.registry.register(policy);
  }

  /**
   * Unregisters a policy
   */
  unregisterPolicy(policyName: string): void {
    this.registry.unregister(policyName);
  }

  /**
   * Enforces a single policy
   */
  async enforce(
    policyName: string,
    context: ISecurityContext,
    resource?: any
  ): Promise<boolean> {
    const startTime = Date.now();
    const requestId = new ObjectId();
    
    this.logger.startOperation('policy-enforcement', {
      requestId: requestId.toHexString(),
      policyName,
      userId: context.userId?.toHexString(),
      organizationId: context.organizationId?.toHexString()
    });

    try {
      const result = await this.evaluatePolicy(policyName, context, resource);
      const duration = Date.now() - startTime;

      this.logger.completeOperation('policy-enforcement', duration, {
        requestId: requestId.toHexString(),
        policyName,
        allowed: result.allowed,
        reason: result.reason
      });

      if (this.enableAuditLogging) {
        this.auditPolicyDecision(requestId, result, context, resource);
      }

      return result.allowed;
    } catch (error) {
      const duration = Date.now() - startTime;
      this.logger.failOperation('policy-enforcement', error as Error, duration, {
        requestId: requestId.toHexString(),
        policyName
      });

      // Default to deny on error
      return false;
    }
  }

  /**
   * Enforces all specified policies (AND logic)
   */
  async enforceAll(
    policyNames: readonly string[],
    context: ISecurityContext,
    resource?: any
  ): Promise<boolean> {
    const requestId = new ObjectId();
    const startTime = Date.now();

    this.logger.startOperation('policy-enforcement-all', {
      requestId: requestId.toHexString(),
      policyCount: policyNames.length,
      policies: policyNames,
      userId: context.userId?.toHexString()
    });

    try {
      const results = await this.evaluateMultiplePolicies(policyNames, context, resource);
      const allAllowed = results.every(result => result.allowed);
      const duration = Date.now() - startTime;

      this.logger.completeOperation('policy-enforcement-all', duration, {
        requestId: requestId.toHexString(),
        allAllowed,
        individualResults: results.map(r => ({
          policy: r.policyName,
          allowed: r.allowed,
          reason: r.reason
        }))
      });

      if (this.enableAuditLogging) {
        for (const result of results) {
          this.auditPolicyDecision(requestId, result, context, resource);
        }
      }

      return allAllowed;
    } catch (error) {
      const duration = Date.now() - startTime;
      this.logger.failOperation('policy-enforcement-all', error as Error, duration, {
        requestId: requestId.toHexString(),
        policyNames
      });

      return false;
    }
  }

  /**
   * Enforces any of the specified policies (OR logic)
   */
  async enforceAny(
    policyNames: readonly string[],
    context: ISecurityContext,
    resource?: any
  ): Promise<boolean> {
    const requestId = new ObjectId();
    const startTime = Date.now();

    this.logger.startOperation('policy-enforcement-any', {
      requestId: requestId.toHexString(),
      policyCount: policyNames.length,
      policies: policyNames,
      userId: context.userId?.toHexString()
    });

    try {
      const results = await this.evaluateMultiplePolicies(policyNames, context, resource);
      const anyAllowed = results.some(result => result.allowed);
      const duration = Date.now() - startTime;

      this.logger.completeOperation('policy-enforcement-any', duration, {
        requestId: requestId.toHexString(),
        anyAllowed,
        allowedPolicies: results.filter(r => r.allowed).map(r => r.policyName)
      });

      if (this.enableAuditLogging) {
        for (const result of results) {
          this.auditPolicyDecision(requestId, result, context, resource);
        }
      }

      return anyAllowed;
    } catch (error) {
      const duration = Date.now() - startTime;
      this.logger.failOperation('policy-enforcement-any', error as Error, duration, {
        requestId: requestId.toHexString(),
        policyNames
      });

      return false;
    }
  }

  /**
   * Gets detailed evaluation results for multiple policies
   */
  async evaluateWithDetails(
    policyNames: readonly string[],
    context: ISecurityContext,
    resource?: any
  ): Promise<readonly PolicyEvaluationResult[]> {
    return this.evaluateMultiplePolicies(policyNames, context, resource);
  }

  /**
   * Gets all registered policy names
   */
  getRegisteredPolicies(): readonly string[] {
    return this.registry.getAll().map(policy => policy.name);
  }

  /**
   * Checks if a policy is registered
   */
  hasPolicyRegistered(policyName: string): boolean {
    return this.registry.has(policyName);
  }

  /**
   * Clears all registered policies
   */
  clearPolicies(): void {
    this.registry.clear();
  }

  /**
   * Evaluates a single policy
   */
  private async evaluatePolicy(
    policyName: string,
    context: ISecurityContext,
    resource?: any
  ): Promise<PolicyEvaluationResult> {
    const startTime = Date.now();
    const policy = this.registry.get(policyName);

    if (!policy) {
      const evaluationTime = Date.now() - startTime;
      const result: PolicyEvaluationResult = {
        allowed: !this.defaultDenyAll,
        policyName,
        reason: `Policy '${policyName}' not found`,
        evaluationTime,
        timestamp: new Date()
      };

      this.logger.warn(`Policy not found: ${policyName}`, {
        policyName,
        defaultDenyAll: this.defaultDenyAll,
        result: result.allowed
      });

      return result;
    }

    try {
      const allowed = await policy.evaluate(context, resource);
      const evaluationTime = Date.now() - startTime;

      return {
        allowed,
        policyName,
        reason: allowed ? 'Policy evaluation passed' : 'Policy evaluation failed',
        evaluationTime,
        timestamp: new Date()
      };
    } catch (error) {
      const evaluationTime = Date.now() - startTime;
      const err = error as Error;

      this.logger.error(`Policy evaluation error: ${policyName}`, err, {
        policyName,
        userId: context.userId?.toHexString()
      });

      return {
        allowed: false,
        policyName,
        reason: `Policy evaluation error: ${err.message}`,
        evaluationTime,
        timestamp: new Date()
      };
    }
  }

  /**
   * Evaluates multiple policies concurrently
   */
  private async evaluateMultiplePolicies(
    policyNames: readonly string[],
    context: ISecurityContext,
    resource?: any
  ): Promise<readonly PolicyEvaluationResult[]> {
    if (policyNames.length === 0) {
      return [];
    }

    // Evaluate policies concurrently for better performance
    const evaluationPromises = policyNames.map(policyName =>
      this.evaluatePolicy(policyName, context, resource)
    );

    return Promise.all(evaluationPromises);
  }

  /**
   * Audits policy decision for compliance tracking
   */
  private auditPolicyDecision(
    requestId: ObjectId,
    result: PolicyEvaluationResult,
    context: ISecurityContext,
    resource?: any
  ): void {
    this.logger.info('Policy decision audit', {
      requestId: requestId.toHexString(),
      policyName: result.policyName,
      allowed: result.allowed,
      reason: result.reason,
      evaluationTime: result.evaluationTime,
      userId: context.userId?.toHexString(),
      organizationId: context.organizationId?.toHexString(),
      sessionId: context.sessionId,
      ipAddress: context.ipAddress,
      resourceType: resource ? typeof resource : undefined,
      timestamp: result.timestamp.toISOString()
    });
  }
}

/**
 * Base policy implementation for common functionality
 */
export abstract class BasePolicy implements IPolicy {
  public readonly name: string;
  protected readonly logger: ContextualLogger;

  constructor(name: string, logger: ContextualLogger) {
    this.name = name;
    this.logger = logger;
  }

  /**
   * Abstract method for policy evaluation
   */
  public abstract evaluate(context: ISecurityContext, resource?: any): Promise<boolean>;

  /**
   * Helper method to check if user has required role
   */
  protected hasRequiredRole(context: ISecurityContext, requiredRoles: readonly string[]): boolean {
    return requiredRoles.some(role => context.hasRole(role as any));
  }

  /**
   * Helper method to check if user has required permission
   */
  protected hasRequiredPermission(context: ISecurityContext, requiredPermissions: readonly string[]): boolean {
    return requiredPermissions.some(permission => context.hasPermission(permission as any));
  }

  /**
   * Helper method to check resource ownership
   */
  protected isResourceOwner(context: ISecurityContext, resource: any): boolean {
    if (!resource || !context.userId) {
      return false;
    }

    // Check common ownership patterns
    const ownerId = resource.userId || resource.ownerId || resource.createdBy || resource.id;
    
    if (ownerId && typeof ownerId === 'object' && 'equals' in ownerId) {
      return ownerId.equals(context.userId);
    }

    if (typeof ownerId === 'string') {
      return ownerId === context.userId.toHexString();
    }

    return false;
  }

  /**
   * Helper method to check organization membership
   */
  protected isSameOrganization(context: ISecurityContext, resource: any): boolean {
    if (!resource || !context.organizationId) {
      return false;
    }

    const resourceOrgId = resource.organizationId;
    
    if (resourceOrgId && typeof resourceOrgId === 'object' && 'equals' in resourceOrgId) {
      return resourceOrgId.equals(context.organizationId);
    }

    if (typeof resourceOrgId === 'string') {
      return resourceOrgId === context.organizationId.toHexString();
    }

    return false;
  }
}
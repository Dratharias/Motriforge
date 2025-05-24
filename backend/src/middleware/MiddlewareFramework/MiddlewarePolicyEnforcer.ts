import { IPolicyEnforcementPoint } from '@/types/shared/base-types';
import { ContextualLogger } from '@/shared-kernel/infrastructure/logging/ContextualLogger';
import { RequestContext } from '@/types/middleware/framework/framework-types';

/**
 * Handles policy enforcement for middleware framework
 */
export class MiddlewarePolicyEnforcer {
  private readonly policyEnforcementPoint: IPolicyEnforcementPoint;
  private readonly logger: ContextualLogger;

  constructor(
    policyEnforcementPoint: IPolicyEnforcementPoint,
    logger: ContextualLogger
  ) {
    this.policyEnforcementPoint = policyEnforcementPoint;
    this.logger = logger;
  }

  /**
   * Enforces a policy for the given context
   */
  async enforce(
    policyName: string,
    context: RequestContext,
    resource?: any
  ): Promise<boolean> {
    if (!context.securityContext) {
      this.logger.warn('Policy enforcement attempted without security context', {
        policyName,
        requestId: context.requestId.toHexString()
      });
      return false;
    }

    try {
      const result = await this.policyEnforcementPoint.enforce(
        policyName,
        context.securityContext,
        resource
      );

      this.logger.info('Policy enforcement result', {
        policyName,
        result,
        userId: context.securityContext.userId?.toHexString(),
        requestId: context.requestId.toHexString()
      });

      return result;
    } catch (error) {
      const err = error as Error;
      this.logger.error('Policy enforcement failed', err, {
        policyName,
        requestId: context.requestId.toHexString()
      });
      return false;
    }
  }

  /**
   * Enforces multiple policies (all must pass)
   */
  async enforceAll(
    policyNames: string[],
    context: RequestContext,
    resource?: any
  ): Promise<boolean> {
    for (const policyName of policyNames) {
      const result = await this.enforce(policyName, context, resource);
      if (!result) {
        return false;
      }
    }
    return true;
  }

  /**
   * Enforces multiple policies (any can pass)
   */
  async enforceAny(
    policyNames: string[],
    context: RequestContext,
    resource?: any
  ): Promise<boolean> {
    for (const policyName of policyNames) {
      const result = await this.enforce(policyName, context, resource);
      if (result) {
        return true;
      }
    }
    return false;
  }
}
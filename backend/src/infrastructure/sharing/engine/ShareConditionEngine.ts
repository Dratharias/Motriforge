import { Types } from 'mongoose';
import { IUser } from '../../../types/core/interfaces';
import { IShareCondition } from '../entities/interfaces';
import { Severity } from '../../../types/core/enums';

export interface IConditionEvaluationContext {
  readonly user: IUser;
  readonly resourceId: Types.ObjectId;
  readonly timestamp: Date;
  readonly metadata?: Record<string, unknown>;
}

export interface IConditionEvaluationResult {
  readonly passed: boolean;
  readonly reason?: string;
  readonly severity: Severity;
}

export class ShareConditionEngine {
  private readonly evaluators = new Map<string, (condition: IShareCondition, context: IConditionEvaluationContext) => IConditionEvaluationResult>();

  constructor() {
    this.registerDefaultEvaluators();
  }

  evaluate(condition: IShareCondition, context: IConditionEvaluationContext): IConditionEvaluationResult {
    const evaluator = this.evaluators.get(condition.type);
    if (!evaluator) {
      return {
        passed: false,
        reason: `Unknown condition type: ${condition.type}`,
        severity: Severity.ERROR
      };
    }

    try {
      return evaluator(condition, context);
    } catch (error) {
      return {
        passed: false,
        reason: `Condition evaluation error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        severity: Severity.ERROR
      };
    }
  }

  evaluateAll(conditions: readonly IShareCondition[], context: IConditionEvaluationContext): {
    allPassed: boolean;
    results: readonly IConditionEvaluationResult[];
    failedConditions: readonly IShareCondition[];
  } {
    const results = conditions.map(condition => this.evaluate(condition, context));
    const failedConditions = conditions.filter((_, index) => !results[index].passed);

    return {
      allPassed: results.every(result => result.passed),
      results,
      failedConditions
    };
  }

  registerEvaluator(type: string, evaluator: (condition: IShareCondition, context: IConditionEvaluationContext) => IConditionEvaluationResult): void {
    this.evaluators.set(type, evaluator);
  }

  private registerDefaultEvaluators(): void {
    this.evaluators.set('TIME_RANGE', this.evaluateTimeRange.bind(this));
    this.evaluators.set('USER_ROLE', this.evaluateUserRole.bind(this));
    this.evaluators.set('ORGANIZATION', this.evaluateOrganization.bind(this));
    this.evaluators.set('MAX_USES', this.evaluateMaxUses.bind(this));
    this.evaluators.set('IP_RANGE', this.evaluateIpRange.bind(this));
    this.evaluators.set('DEVICE_TYPE', this.evaluateDeviceType.bind(this));
  }

  private evaluateTimeRange(condition: IShareCondition, context: IConditionEvaluationContext): IConditionEvaluationResult {
    const { startTime, endTime } = condition.value as { startTime: string; endTime: string };
    const currentTime = context.timestamp.toTimeString().slice(0, 5);

    const isInRange = currentTime >= startTime && currentTime <= endTime;
    return {
      passed: condition.operator === 'IN' ? isInRange : !isInRange,
      reason: isInRange ? undefined : `Access restricted to ${startTime}-${endTime}`,
      severity: Severity.WARN
    };
  }

  private evaluateUserRole(condition: IShareCondition, context: IConditionEvaluationContext): IConditionEvaluationResult {
    const allowedRoles = condition.value as string[];
    const userRole = context.user.role;

    const hasRole = allowedRoles.includes(userRole);
    return {
      passed: condition.operator === 'IN' ? hasRole : !hasRole,
      reason: hasRole ? undefined : `Role ${userRole} not permitted`,
      severity: Severity.ERROR
    };
  }

  private evaluateOrganization(condition: IShareCondition, context: IConditionEvaluationContext): IConditionEvaluationResult {
    const allowedOrgs = condition.value as string[];
    const userOrg = context.user.organization.toString();

    const inOrg = allowedOrgs.includes(userOrg);
    return {
      passed: condition.operator === 'IN' ? inOrg : !inOrg,
      reason: inOrg ? undefined : 'Organization not permitted',
      severity: Severity.ERROR
    };
  }

  private evaluateMaxUses(condition: IShareCondition, context: IConditionEvaluationContext): IConditionEvaluationResult {
    const maxUses = condition.value as number;
    const currentUses = (context.metadata?.currentUses as number) ?? 0;

    const underLimit = currentUses < maxUses;
    return {
      passed: underLimit,
      reason: underLimit ? undefined : `Maximum uses (${maxUses}) exceeded`,
      severity: Severity.WARN
    };
  }

  private evaluateIpRange(condition: IShareCondition, context: IConditionEvaluationContext): IConditionEvaluationResult {
    const allowedRanges = condition.value as string[];
    const clientIp = context.metadata?.ipAddress as string;

    if (!clientIp) {
      return {
        passed: false,
        reason: 'Client IP address required',
        severity: Severity.ERROR
      };
    }

    // Simplified IP range check - in production, use proper CIDR matching
    const inRange = allowedRanges.some(range => clientIp.startsWith(range));
    return {
      passed: condition.operator === 'IN' ? inRange : !inRange,
      reason: inRange ? undefined : 'IP address not in allowed range',
      severity: Severity.ERROR
    };
  }

  private evaluateDeviceType(condition: IShareCondition, context: IConditionEvaluationContext): IConditionEvaluationResult {
    const allowedDevices = condition.value as string[];
    const deviceType = context.metadata?.deviceType as string;

    if (!deviceType) {
      return {
        passed: true, // Default to allow if device type unknown
        reason: undefined,
        severity: Severity.INFO
      };
    }

    const isAllowed = allowedDevices.includes(deviceType);
    return {
      passed: condition.operator === 'IN' ? isAllowed : !isAllowed,
      reason: isAllowed ? undefined : `Device type ${deviceType} not permitted`,
      severity: Severity.WARN
    };
  }
}


import { ResourceType, Action } from '../../../types/core/enums';
import { BaseShareRule } from './IShareRule';
import { IShareRuleContext, IShareRuleResult } from './interfaces';

export class ResourceTypeShareRule extends BaseShareRule {
  public readonly name = 'ResourceTypeShareRule';
  public readonly priority = 70;
  public readonly description = 'Enforces resource-type specific sharing rules';

  private readonly resourceRules = new Map<ResourceType, {
    maxShares?: number;
    allowedActions: readonly Action[];
    requiresApproval?: boolean;
    defaultDuration?: number;
    specialConditions?: readonly string[];
  }>();

  constructor() {
    super();
    this.initializeResourceRules();
  }

  appliesTo(context: IShareRuleContext): boolean {
    return this.resourceRules.has(context.resourceType);
  }

  async evaluate(context: IShareRuleContext): Promise<IShareRuleResult> {
    const resourceRule = this.resourceRules.get(context.resourceType);
    if (!resourceRule) {
      return this.createResult(false, `No sharing rules defined for ${context.resourceType}`);
    }

    const warnings: string[] = [];

    // Check allowed actions
    const invalidActions = context.requestedActions.filter(action =>
      !resourceRule.allowedActions.includes(action)
    );

    if (invalidActions.length > 0) {
      const validActions = context.requestedActions.filter(action =>
        resourceRule.allowedActions.includes(action)
      );

      if (validActions.length === 0) {
        return this.createResult(
          false,
          `No valid actions for ${context.resourceType}. Allowed actions: ${resourceRule.allowedActions.join(', ')}`
        );
      }

      return this.createResult(
        true,
        undefined,
        {
          suggestedActions: validActions,
          warnings: [`Actions ${invalidActions.join(', ')} not allowed for ${context.resourceType}`]
        }
      );
    }

    // Check special conditions
    if (resourceRule.specialConditions) {
      for (const condition of resourceRule.specialConditions) {
        const conditionMet = await this.checkSpecialCondition(condition, context);
        if (!conditionMet.allowed) {
          return this.createResult(false, conditionMet.reason);
        }
        if (conditionMet.warning) {
          warnings.push(conditionMet.warning);
        }
      }
    }

    // Check if approval required
    if (resourceRule.requiresApproval) {
      warnings.push(`Sharing ${context.resourceType} requires approval`);
    }

    return this.createResult(
      true,
      undefined,
      {
        warnings,
        maxDuration: resourceRule.defaultDuration
      }
    );
  }

  private async checkSpecialCondition(
    condition: string,
    context: IShareRuleContext
  ): Promise<{ allowed: boolean; reason?: string; warning?: string }> {
    switch (condition) {
      case 'PROFILE_OWNER_ONLY':
        // For profiles, only the profile owner can share
        if (context.resourceType === ResourceType.PROFILE) {
          // In real implementation, check if sharer owns the profile
          return { allowed: true };
        }
        return { allowed: true };

      case 'ACTIVE_PROGRAM_CHECK':
        // For programs, check if it's currently active
        if (context.resourceType === ResourceType.PROGRAM) {
          return {
            allowed: true,
            warning: 'Sharing active program - changes may affect shared users'
          };
        }
        return { allowed: true };

      case 'SENSITIVE_DATA_WARNING':
        return {
          allowed: true,
          warning: 'This resource may contain sensitive data - ensure recipient authorization'
        };

      default:
        return { allowed: true };
    }
  }

  private initializeResourceRules(): void {
    this.resourceRules.set(ResourceType.EXERCISE, {
      allowedActions: [Action.READ, Action.UPDATE, Action.SHARE],
      defaultDuration: 90,
      maxShares: 50
    });

    this.resourceRules.set(ResourceType.WORKOUT, {
      allowedActions: [Action.READ, Action.UPDATE, Action.SHARE, Action.ASSIGN],
      defaultDuration: 60,
      maxShares: 20,
      specialConditions: ['ACTIVE_PROGRAM_CHECK']
    });

    this.resourceRules.set(ResourceType.PROGRAM, {
      allowedActions: [Action.READ, Action.SHARE, Action.ASSIGN],
      defaultDuration: 120,
      maxShares: 10,
      requiresApproval: true,
      specialConditions: ['ACTIVE_PROGRAM_CHECK']
    });

    this.resourceRules.set(ResourceType.PROFILE, {
      allowedActions: [Action.READ],
      defaultDuration: 30,
      maxShares: 5,
      requiresApproval: true,
      specialConditions: ['PROFILE_OWNER_ONLY', 'SENSITIVE_DATA_WARNING']
    });

    this.resourceRules.set(ResourceType.PROGRESS, {
      allowedActions: [Action.READ],
      defaultDuration: 60,
      maxShares: 10,
      specialConditions: ['SENSITIVE_DATA_WARNING']
    });

    this.resourceRules.set(ResourceType.NUTRITION, {
      allowedActions: [Action.READ, Action.UPDATE],
      defaultDuration: 45,
      maxShares: 15
    });

    this.resourceRules.set(ResourceType.SCHEDULE, {
      allowedActions: [Action.READ, Action.UPDATE],
      defaultDuration: 30,
      maxShares: 25
    });
  }
}


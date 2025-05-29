import {
  IAccessValidationRule,
  IValidationResult,
  IAccessValidator,
  BaseValidationRule
} from './interfaces';
import { Action } from '../../../types/core/enums';
import { IPermissionContext } from '../permissions/core/interfaces';

export class AccessValidationService implements IAccessValidator {
  private readonly rules: IAccessValidationRule[] = [];

  constructor() {
    this.initializeDefaultRules();
  }

  async validate(context: IPermissionContext): Promise<IValidationResult> {
    const applicableRules = this.rules.filter(rule => rule.appliesTo(context));

    if (applicableRules.length === 0) {
      return {
        valid: true,
        failedRules: [],
        warnings: ['No validation rules apply to this context'],
        context,
        timestamp: new Date()
      };
    }

    const results = await Promise.all(
      applicableRules.map(async rule => {
        try {
          const result = await rule.validate(context);
          return { rule, result };
        } catch (error) {
          return {
            rule,
            result: {
              valid: false,
              reason: `Rule validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`
            }
          };
        }
      })
    );

    const failedRules: string[] = [];
    const warnings: string[] = [];

    for (const { rule, result } of results) {
      if (!result.valid) {
        failedRules.push(rule.name);
        if (result.reason) {
          if (rule.isRequired) {
            warnings.push(`Required rule failed - ${rule.name}: ${result.reason}`);
          } else {
            warnings.push(`Optional rule failed - ${rule.name}: ${result.reason}`);
          }
        }
      }
    }

    const requiredRulesFailed = results
      .filter(({ rule, result }) => !result.valid && rule.isRequired)
      .length > 0;

    return {
      valid: !requiredRulesFailed,
      failedRules,
      warnings,
      context,
      timestamp: new Date()
    };
  }

  addRule(rule: IAccessValidationRule): void {
    if (this.rules.some(r => r.name === rule.name)) {
      throw new Error(`Validation rule '${rule.name}' already exists`);
    }
    this.rules.push(rule);
  }

  removeRule(ruleName: string): boolean {
    const index = this.rules.findIndex(r => r.name === ruleName);
    if (index === -1) return false;
    
    this.rules.splice(index, 1);
    return true;
  }

  getRules(): readonly IAccessValidationRule[] {
    return [...this.rules];
  }

  getApplicableRules(context: IPermissionContext): readonly IAccessValidationRule[] {
    return this.rules.filter(rule => rule.appliesTo(context));
  }

  private initializeDefaultRules(): void {
    this.addRule(new UserActiveRule());
    this.addRule(new OrganizationActiveRule());
    this.addRule(new SuspendedUserRule());
  }
}

export class UserActiveRule extends BaseValidationRule {
  readonly name = 'UserActive';
  readonly description = 'User must have active status';
  readonly isRequired = true;

  appliesTo(context: IPermissionContext): boolean {
    return true;
  }

  async validate(context: IPermissionContext): Promise<{
    valid: boolean;
    reason?: string;
    metadata?: Record<string, unknown>;
  }> {
    const isActive = this.isUserActive(context.user);
    return this.createResult(
      isActive,
      isActive ? undefined : `User status is ${this.getUserStatus(context.user)}`,
      { userStatus: this.getUserStatus(context.user) }
    );
  }
}

export class OrganizationActiveRule extends BaseValidationRule {
  readonly name = 'OrganizationActive';
  readonly description = 'User organization must be active';
  readonly isRequired = true;

  appliesTo(context: IPermissionContext): boolean {
    return !!context.organizationId || !!context.metadata?.organizationStatus;
  }

  async validate(context: IPermissionContext): Promise<{
    valid: boolean;
    reason?: string;
    metadata?: Record<string, unknown>;
  }> {
    const orgStatus = context.metadata?.organizationStatus as string;
    if (!orgStatus) {
      return this.createResult(true);
    }

    const isActive = orgStatus === 'ACTIVE';
    return this.createResult(
      isActive,
      isActive ? undefined : `Organization status is ${orgStatus}`,
      { organizationStatus: orgStatus }
    );
  }
}

export class SuspendedUserRule extends BaseValidationRule {
  readonly name = 'SuspendedUser';
  readonly description = 'Suspended users cannot perform actions';
  readonly isRequired = true;

  appliesTo(context: IPermissionContext): boolean {
    return true;
  }

  async validate(context: IPermissionContext): Promise<{
    valid: boolean;
    reason?: string;
    metadata?: Record<string, unknown>;
  }> {
    const userStatus = this.getUserStatus(context.user);
    const isSuspended = userStatus === 'SUSPENDED';
    
    return this.createResult(
      !isSuspended,
      isSuspended ? 'User account is suspended' : undefined,
      { userStatus }
    );
  }
}

export class ResourceOwnershipRule extends BaseValidationRule {
  readonly name = 'ResourceOwnership';
  readonly description = 'User must own resource for certain actions';
  readonly isRequired = false;

  appliesTo(context: IPermissionContext): boolean {
    return (context.action === Action.UPDATE || context.action === Action.DELETE)
           && !!context.resourceId;
  }

  async validate(context: IPermissionContext): Promise<{
    valid: boolean;
    reason?: string;
    metadata?: Record<string, unknown>;
  }> {
    const resourceOwnerId = context.metadata?.createdBy as string;
    if (!resourceOwnerId) {
      return this.createResult(true);
    }

    const isOwner = resourceOwnerId === context.user.id.toString();
    return this.createResult(
      isOwner,
      isOwner ? undefined : 'User does not own this resource',
      {
        resourceOwnerId,
        userId: context.user.id.toString(),
        isOwner
      }
    );
  }
}

export class OrganizationMembershipRule extends BaseValidationRule {
  readonly name = 'OrganizationMembership';
  readonly description = 'User must be member of resource organization';
  readonly isRequired = true;

  appliesTo(context: IPermissionContext): boolean {
    return !!context.organizationId;
  }

  async validate(context: IPermissionContext): Promise<{
    valid: boolean;
    reason?: string;
    metadata?: Record<string, unknown>;
  }> {
    if (!context.organizationId) {
      return this.createResult(true);
    }

    const isMember = this.isSameOrganization(context.user, context.organizationId);
    return this.createResult(
      isMember,
      isMember ? undefined : 'User is not a member of the resource organization',
      {
        userOrganization: context.user.organization.toString(),
        resourceOrganization: context.organizationId.toString()
      }
    );
  }
}
import { Role, ResourceType, Action } from '../../../types/core/enums';
import { BaseShareRule } from './IShareRule';
import { IShareRuleContext, IShareRuleResult } from './interfaces';

export class RoleBasedShareRule extends BaseShareRule {
  public readonly name = 'RoleBasedShareRule';
  public readonly priority = 90;
  public readonly description = 'Enforces role-based sharing restrictions';

  private readonly rolePermissions = new Map<Role, {
    canShare: readonly ResourceType[];
    canShareWith: readonly Role[];
    maxDuration?: number;
    restrictedActions?: readonly Action[];
  }>();

  constructor() {
    super();
    this.initializeRolePermissions();
  }

  appliesTo(context: IShareRuleContext): boolean {
    return this.rolePermissions.has(context.sharer.role);
  }

  async evaluate(context: IShareRuleContext): Promise<IShareRuleResult> {
    const sharerPermissions = this.rolePermissions.get(context.sharer.role);
    
    if (!sharerPermissions) {
      return this.createResult(false, `Role ${context.sharer.role} not configured for sharing`);
    }

    // Check if can share this resource type
    if (!sharerPermissions.canShare.includes(context.resourceType)) {
      return this.createResult(
        false,
        `Role ${context.sharer.role} cannot share ${context.resourceType} resources`
      );
    }

    // Check if can share with target role
    if (!sharerPermissions.canShareWith.includes(context.targetUser.role)) {
      return this.createResult(
        false,
        `Role ${context.sharer.role} cannot share with ${context.targetUser.role}`
      );
    }

    // Check for restricted actions
    if (sharerPermissions.restrictedActions) {
      const restrictedRequested = context.requestedActions.filter(action =>
        sharerPermissions.restrictedActions!.includes(action)
      );

      if (restrictedRequested.length > 0) {
        const allowedActions = context.requestedActions.filter(action =>
          !sharerPermissions.restrictedActions!.includes(action)
        );

        return this.createResult(
          allowedActions.length > 0,
          restrictedRequested.length > 0
            ? `Actions ${restrictedRequested.join(', ')} not allowed for role ${context.sharer.role}`
            : undefined,
          {
            suggestedActions: allowedActions,
            warnings: ['Some requested actions were restricted']
          }
        );
      }
    }

    return this.createResult(
      true,
      undefined,
      {
        maxDuration: sharerPermissions.maxDuration
      }
    );
  }

  private initializeRolePermissions(): void {
    // Admin can share everything with everyone
    this.rolePermissions.set(Role.ADMIN, {
      canShare: [
        ResourceType.EXERCISE,
        ResourceType.WORKOUT,
        ResourceType.PROGRAM,
        ResourceType.PROFILE,
        ResourceType.DASHBOARD,
        ResourceType.PROGRESS,
        ResourceType.ACTIVITY,
        ResourceType.NUTRITION,
        ResourceType.SCHEDULE
      ],
      canShareWith: [Role.ADMIN, Role.MANAGER, Role.TRAINER, Role.CLIENT, Role.GUEST],
      maxDuration: 365
    });

    // Manager permissions
    this.rolePermissions.set(Role.MANAGER, {
      canShare: [
        ResourceType.EXERCISE,
        ResourceType.WORKOUT,
        ResourceType.PROGRAM,
        ResourceType.PROGRESS,
        ResourceType.SCHEDULE
      ],
      canShareWith: [Role.MANAGER, Role.TRAINER, Role.CLIENT],
      maxDuration: 180,
      restrictedActions: [Action.DELETE]
    });

    // Trainer permissions
    this.rolePermissions.set(Role.TRAINER, {
      canShare: [
        ResourceType.EXERCISE,
        ResourceType.WORKOUT,
        ResourceType.PROGRAM,
        ResourceType.NUTRITION
      ],
      canShareWith: [Role.TRAINER, Role.CLIENT],
      maxDuration: 90,
      restrictedActions: [Action.DELETE, Action.ASSIGN]
    });

    // Client permissions (very limited)
    this.rolePermissions.set(Role.CLIENT, {
      canShare: [
        ResourceType.PROGRESS,
        ResourceType.ACTIVITY
      ],
      canShareWith: [Role.TRAINER, Role.CLIENT],
      maxDuration: 30,
      restrictedActions: [Action.DELETE, Action.UPDATE, Action.ASSIGN]
    });

    // Guest has no sharing permissions
    this.rolePermissions.set(Role.GUEST, {
      canShare: [],
      canShareWith: [],
      maxDuration: 0
    });
  }
}
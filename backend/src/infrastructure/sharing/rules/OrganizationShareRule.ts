import { Role } from '../../../types/core/enums';
import { BaseShareRule } from './IShareRule';
import { IShareRuleContext, IShareRuleResult } from './interfaces';

export class OrganizationShareRule extends BaseShareRule {
  public readonly name = 'OrganizationShareRule';
  public readonly priority = 100;
  public readonly description = 'Ensures sharing only occurs within the same organization';

  appliesTo(context: IShareRuleContext): boolean {
    return true; // This rule applies to all sharing scenarios
  }

  async evaluate(context: IShareRuleContext): Promise<IShareRuleResult> {
    const sharerOrgId = context.sharer.organization.toString();
    const targetOrgId = context.targetUser.organization.toString();

    // Same organization - allow
    if (sharerOrgId === targetOrgId) {
      return this.createResult(true);
    }

    // Cross-organization sharing - check if admin
    if (context.sharer.role === Role.ADMIN) {
      return this.createResult(
        true,
        undefined,
        {
          warnings: ['Cross-organization sharing detected'],
          maxDuration: 30 // Limit cross-org shares to 30 days
        }
      );
    }

    return this.createResult(
      false,
      'Cannot share resources outside of your organization'
    );
  }
}


import { Types } from 'mongoose';
import { IUser } from '../../../types/core/interfaces';
import { IPermissionContext, IValidationResult, IAccessValidationRule } from '../permissions/core/interfaces';

export interface IAccessValidator {
  validate(context: IPermissionContext): Promise<IValidationResult>;
  addRule(rule: IAccessValidationRule): void;
  removeRule(ruleName: string): boolean;
  getRules(): readonly IAccessValidationRule[];
  getApplicableRules(context: IPermissionContext): readonly IAccessValidationRule[];
}

export abstract class BaseValidationRule implements IAccessValidationRule {
  abstract readonly name: string;
  abstract readonly description: string;
  abstract readonly isRequired: boolean;

  abstract appliesTo(context: IPermissionContext): boolean;
  abstract validate(context: IPermissionContext): Promise<{
    valid: boolean;
    reason?: string;
    metadata?: Record<string, unknown>;
  }>;

  protected createResult(
    valid: boolean,
    reason?: string,
    metadata?: Record<string, unknown>
  ): { valid: boolean; reason?: string; metadata?: Record<string, unknown> } {
    return { valid, reason, metadata };
  }

  protected isUserActive(user: IUser): boolean {
    return user.status === 'ACTIVE';
  }

  protected getUserStatus(user: IUser): string {
    return user.status;
  }

  protected isSameOrganization(user: IUser, organizationId: Types.ObjectId): boolean {
    return user.organization.toString() === organizationId.toString();
  }
}

export { IValidationResult, IAccessValidationRule, IPermissionContext };
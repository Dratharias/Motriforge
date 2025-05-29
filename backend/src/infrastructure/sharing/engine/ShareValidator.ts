import { IUser } from '../../../types/core/interfaces';
import { ResourceType, Action } from '../../../types/core/enums';
import { SharedResource } from '../entities/SharedResource';
import { IShareRequest } from '../entities/interfaces';
import { ShareConditionEngine, IConditionEvaluationContext } from './ShareConditionEngine';
import { ValidationError, ValidationResult } from '../../../types/core/behaviors';
import { Types } from 'mongoose';

export interface IShareValidationContext {
  readonly sharer: IUser;
  readonly resource: {
    readonly id: Types.ObjectId;
    readonly type: ResourceType;
    readonly ownerId: Types.ObjectId;
  };
  readonly targetUsers: readonly IUser[];
  readonly request: IShareRequest;
  readonly metadata?: Record<string, unknown>;
}

export class ShareValidator {
  constructor(
    private readonly conditionEngine: ShareConditionEngine
  ) {}

  validateShareRequest(context: IShareValidationContext): ValidationResult {
    const errors: ValidationError[] = [];

    errors.push(...this.validateBasicRequirements(context));
    errors.push(...this.validateSharePermissions(context));
    errors.push(...this.validateTargetUsers(context));
    // Remove action validation - let rule engine handle action restrictions
    errors.push(...this.validateDates(context));

    return {
      isValid: errors.length === 0,
      errors,
      warnings: [],
      isDraftValid: true,
      requiredForPublication: [],
      canSaveDraft: () => true,
      canPublish: () => errors.length === 0
    };
  }

  validateAccess(sharedResource: SharedResource, user: IUser, action: Action, metadata?: Record<string, unknown>): ValidationResult {
    const errors: ValidationError[] = [];

    if (!sharedResource.isValid()) {
      errors.push({
        field: 'sharedResource',
        message: 'Shared resource is invalid or expired',
        code: 'INVALID_SHARE',
        severity: 'ERROR' as any
      });
    }

    if (!sharedResource.canUserAccess(user, action)) {
      errors.push({
        field: 'access',
        message: 'User does not have permission for this action',
        code: 'ACCESS_DENIED',
        severity: 'ERROR' as any
      });
    }

    if (sharedResource.conditions.length > 0) {
      const conditionContext: IConditionEvaluationContext = {
        user,
        resourceId: sharedResource.resourceId,
        timestamp: new Date(),
        metadata
      };

      const conditionResults = this.conditionEngine.evaluateAll(sharedResource.conditions, conditionContext);
      if (!conditionResults.allPassed) {
        conditionResults.results.forEach((result, index) => {
          if (!result.passed) {
            errors.push({
              field: `condition_${index}`,
              message: result.reason ?? 'Condition not met',
              code: 'CONDITION_FAILED',
              severity: result.severity as any
            });
          }
        });
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings: [],
      isDraftValid: true,
      requiredForPublication: [],
      canSaveDraft: () => true,
      canPublish: () => errors.length === 0
    };
  }

  private validateBasicRequirements(context: IShareValidationContext): ValidationError[] {
    const errors: ValidationError[] = [];

    if (!context.request.resourceId) {
      errors.push({
        field: 'resourceId',
        message: 'Resource ID is required',
        code: 'MISSING_RESOURCE_ID',
        severity: 'ERROR' as any
      });
    }

    if (context.request.targetUsers.length === 0) {
      errors.push({
        field: 'targetUsers',
        message: 'At least one target user is required',
        code: 'NO_TARGET_USERS',
        severity: 'ERROR' as any
      });
    }

    if (context.request.allowedActions.length === 0) {
      errors.push({
        field: 'allowedActions',
        message: 'At least one action must be allowed',
        code: 'NO_ACTIONS',
        severity: 'ERROR' as any
      });
    }

    return errors;
  }

  private validateSharePermissions(context: IShareValidationContext): ValidationError[] {
    const errors: ValidationError[] = [];

    const isOwner = context.resource.ownerId.equals(context.sharer.id);
    if (!isOwner) {
      errors.push({
        field: 'permissions',
        message: 'User does not have permission to share this resource',
        code: 'NO_SHARE_PERMISSION',
        severity: 'ERROR' as any
      });
    }

    return errors;
  }

  private validateTargetUsers(context: IShareValidationContext): ValidationError[] {
    const errors: ValidationError[] = [];

    context.request.targetUsers.forEach((userId, index) => {
      if (userId.equals(context.sharer.id)) {
        errors.push({
          field: `targetUsers[${index}]`,
          message: 'Cannot share resource with yourself',
          code: 'SELF_SHARE',
          severity: 'ERROR' as any
        });
      }

      const targetUser = context.targetUsers.find(u => u.id.equals(userId));
      if (!targetUser) {
        errors.push({
          field: `targetUsers[${index}]`,
          message: 'Target user not found',
          code: 'USER_NOT_FOUND',
          severity: 'ERROR' as any
        });
      } else if (targetUser.status !== 'ACTIVE') {
        errors.push({
          field: `targetUsers[${index}]`,
          message: 'Cannot share with inactive user',
          code: 'INACTIVE_USER',
          severity: 'ERROR' as any
        });
      }
    });

    return errors;
  }

  private validateDates(context: IShareValidationContext): ValidationError[] {
    const errors: ValidationError[] = [];

    if (context.request.endDate) {
      const now = new Date();
      if (context.request.endDate <= now) {
        errors.push({
          field: 'endDate',
          message: 'End date must be in the future',
          code: 'INVALID_END_DATE',
          severity: 'ERROR' as any
        });
      }
    }

    return errors;
  }
}
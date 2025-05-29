import { Types } from 'mongoose';
import { IUser } from '../../../types/core/interfaces';
import { Action } from '../../../types/core/enums';
import { ValidationResult } from '../../../types/core/behaviors';
import { SharedResource } from '../entities/SharedResource';
import { IShareRequest } from '../entities/interfaces';
import { ISharingServiceDependencies, IEnhancedValidationResult } from './interfaces';
import { IShareRuleContext } from '../rules/interfaces';

export interface IShareAccessContext {
  readonly ipAddress?: string;
  readonly userAgent?: string;
  readonly deviceType?: string;
  readonly sessionId?: string;
}

export interface IShareResult {
  readonly success: boolean;
  readonly shareId?: Types.ObjectId;
  readonly errors: readonly string[];
  readonly warnings: readonly string[];
}

export interface IShareAccessResult {
  readonly allowed: boolean;
  readonly reason?: string;
  readonly sharedResource?: SharedResource;
}

export class SharingService {
  constructor(
    private readonly dependencies: ISharingServiceDependencies
  ) {}

  async shareResource(request: IShareRequest, sharer: IUser, targetUsers: readonly IUser[]): Promise<IShareResult> {
    try {
      // Enhanced validation that includes rule engine
      const validation = this.dependencies.ruleEngine 
        ? await this.performEnhancedValidation(request, sharer, targetUsers)
        : await this.performBasicValidation(request, sharer, targetUsers);
      
      if (!validation.isValid) {
        return {
          success: false,
          errors: validation.errors,
          warnings: validation.warnings
        };
      }

      const sharedResource = new SharedResource({
        resourceId: request.resourceId,
        resourceType: request.resourceType,
        owner: sharer.id,
        sharedWith: request.targetUsers,
        allowedActions: validation.suggestedActions ?? request.allowedActions,
        startDate: new Date(),
        endDate: this.calculateEndDate(request.endDate, validation.maxDuration),
        conditions: request.conditions ?? [],
        scope: request.scope,
        notes: request.notes ?? '',
        createdBy: sharer.id
      });

      const savedShare = await this.dependencies.shareRepository.create(sharedResource);

      if (savedShare.endDate) {
        this.dependencies.expirationService.scheduleExpiration(savedShare);
      }

      await this.dependencies.notificationService.notifyResourceShared(
        savedShare,
        targetUsers,
        sharer
      );

      await this.dependencies.auditService.logShareCreated(
        savedShare,
        sharer,
        targetUsers
      );

      return {
        success: true,
        shareId: savedShare.id,
        errors: [],
        warnings: validation.warnings
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      await this.dependencies.auditService.logShareError(
        request.resourceId,
        sharer,
        'SHARE_CREATION',
        errorMessage
      );
      return {
        success: false,
        errors: [errorMessage],
        warnings: []
      };
    }
  }

  async revokeShare(shareId: Types.ObjectId, revoker: IUser): Promise<IShareResult> {
    try {
      const sharedResource = await this.dependencies.shareRepository.findById(shareId);
      if (!sharedResource) {
        return {
          success: false,
          errors: ['Shared resource not found'],
          warnings: []
        };
      }

      if (!sharedResource.owner.equals(revoker.id) && revoker.role !== 'ADMIN') {
        await this.dependencies.auditService.logShareError(
          sharedResource.resourceId,
          revoker,
          'REVOKE_UNAUTHORIZED',
          'User not authorized to revoke share'
        );
        return {
          success: false,
          errors: ['Not authorized to revoke this share'],
          warnings: []
        };
      }

      const revoked = await this.dependencies.shareRepository.archive(shareId);
      if (!revoked) {
        return {
          success: false,
          errors: ['Failed to revoke share'],
          warnings: []
        };
      }

      this.dependencies.expirationService.cancelExpiration(shareId);

      const affectedUsers = await this.getSharedUsers(sharedResource);
      await this.dependencies.notificationService.notifyResourceRevoked(
        sharedResource,
        affectedUsers,
        revoker
      );

      await this.dependencies.auditService.logShareRevoked(
        sharedResource,
        revoker,
        affectedUsers
      );

      return {
        success: true,
        shareId: shareId,
        errors: [],
        warnings: []
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      return {
        success: false,
        errors: [errorMessage],
        warnings: []
      };
    }
  }

  async checkAccess(
    resourceId: Types.ObjectId,
    user: IUser,
    action: Action,
    context?: IShareAccessContext
  ): Promise<IShareAccessResult> {
    try {
      const sharedResource = await this.dependencies.shareRepository.findByUserAndResource(
        user.id,
        resourceId
      );

      if (!sharedResource) {
        return {
          allowed: false,
          reason: 'Resource not shared with user'
        };
      }

      // Convert IShareAccessContext to Record<string, unknown> for validator
      const validatorMetadata: Record<string, unknown> | undefined = context ? {
        ipAddress: context.ipAddress,
        userAgent: context.userAgent,
        deviceType: context.deviceType,
        sessionId: context.sessionId
      } : undefined;

      const validation = this.dependencies.shareValidator.validateAccess(
        sharedResource,
        user,
        action,
        validatorMetadata
      );

      if (!validation.isValid) {
        await this.dependencies.auditService.logAccessAttempt(
          sharedResource,
          user,
          action,
          false,
          validation.errors[0]?.message ?? 'Access denied'
        );
        return {
          allowed: false,
          reason: validation.errors[0]?.message ?? 'Access denied',
          sharedResource
        };
      }

      await this.dependencies.auditService.logAccessAttempt(
        sharedResource,
        user,
        action,
        true
      );

      return {
        allowed: true,
        sharedResource
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Access check failed';
      return {
        allowed: false,
        reason: errorMessage
      };
    }
  }

  async extendShare(
    shareId: Types.ObjectId,
    newEndDate: Date,
    extender: IUser
  ): Promise<IShareResult> {
    try {
      const sharedResource = await this.dependencies.shareRepository.findById(shareId);
      if (!sharedResource) {
        return {
          success: false,
          errors: ['Shared resource not found'],
          warnings: []
        };
      }

      if (!sharedResource.owner.equals(extender.id) && extender.role !== 'ADMIN') {
        return {
          success: false,
          errors: ['Not authorized to extend this share'],
          warnings: []
        };
      }

      if (newEndDate <= new Date()) {
        return {
          success: false,
          errors: ['End date must be in the future'],
          warnings: []
        };
      }

      const extended = sharedResource.extend(newEndDate);
      const updated = await this.dependencies.shareRepository.update(shareId, extended);
      if (!updated) {
        return {
          success: false,
          errors: ['Failed to update share'],
          warnings: []
        };
      }

      this.dependencies.expirationService.updateExpiration(updated);

      await this.dependencies.auditService.logShareUpdated(
        updated,
        extender,
        { previousEndDate: sharedResource.endDate, newEndDate }
      );

      return {
        success: true,
        shareId: shareId,
        errors: [],
        warnings: []
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      return {
        success: false,
        errors: [errorMessage],
        warnings: []
      };
    }
  }

  async getUserShares(userId: Types.ObjectId): Promise<{
    owned: readonly SharedResource[];
    sharedWithUser: readonly SharedResource[];
  }> {
    const [owned, sharedWithUser] = await Promise.all([
      this.dependencies.shareRepository.findByOwnerId(userId),
      this.dependencies.shareRepository.findBySharedUserId(userId)
    ]);

    return {
      owned: owned.filter(share => share.isValid()),
      sharedWithUser: sharedWithUser.filter(share => share.isValid())
    };
  }

  async getResourceShares(resourceId: Types.ObjectId): Promise<readonly SharedResource[]> {
    const shares = await this.dependencies.shareRepository.findByResourceId(resourceId);
    return shares.filter(share => share.isValid());
  }

  async processExpiredShares(): Promise<number> {
    return this.dependencies.shareRepository.bulkArchiveExpired();
  }

  private async performEnhancedValidation(
    request: IShareRequest,
    sharer: IUser,
    targetUsers: readonly IUser[]
  ): Promise<IEnhancedValidationResult> {
    // First, run basic validation
    const basicValidation = await this.validateShareRequest(request, sharer, targetUsers);
    
    if (!basicValidation.isValid) {
      return {
        isValid: false,
        errors: basicValidation.errors.map(e => e.message),
        warnings: basicValidation.warnings.map(w => w.message),
        appliedRules: [],
        failedRules: []
      };
    }

    // Then, run rule engine validation for each target user
    const ruleResults = await Promise.all(
      targetUsers.map(async (targetUser) => {
        const ruleContext: IShareRuleContext = {
          sharer,
          targetUser,
          resourceId: request.resourceId,
          resourceType: request.resourceType,
          requestedActions: request.allowedActions,
          shareRequest: request
        };

        return this.dependencies.ruleEngine!.evaluateRules(ruleContext);
      })
    );

    // Combine results - all must pass for overall success
    const overallAllowed = ruleResults.every(result => result.allowed);
    const allWarnings = ruleResults.flatMap(result => result.warnings);
    const allAppliedRules = [...new Set(ruleResults.flatMap(result => result.appliedRules))];
    const allFailedRules = [...new Set(ruleResults.flatMap(result => result.failedRules))];
    const allSuggestedActions = [...new Set(ruleResults.flatMap(result => result.suggestedActions))];
    const durations = ruleResults
      .map(result => result.maxDuration)
      .filter((duration): duration is number => duration !== undefined);

    const minMaxDuration = durations.length > 0
      ? durations.reduce((min, current) => Math.min(min, current), Number.POSITIVE_INFINITY)
      : undefined;


    const errors: string[] = [];
    if (!overallAllowed) {
      errors.push(...allFailedRules.map(rule => `Rule ${rule} failed`));
    }

    return {
      isValid: overallAllowed,
      errors,
      warnings: [
        ...basicValidation.warnings.map(w => w.message),
        ...allWarnings
      ],
      suggestedActions: allSuggestedActions.length > 0 ? allSuggestedActions : undefined,
      maxDuration: minMaxDuration,
      appliedRules: allAppliedRules,
      failedRules: allFailedRules
    };
  }

  private async performBasicValidation(
    request: IShareRequest,
    sharer: IUser,
    targetUsers: readonly IUser[]
  ): Promise<IEnhancedValidationResult> {
    const basicValidation = await this.validateShareRequest(request, sharer, targetUsers);
    
    return {
      isValid: basicValidation.isValid,
      errors: basicValidation.errors.map(e => e.message),
      warnings: basicValidation.warnings.map(w => w.message),
      appliedRules: [],
      failedRules: []
    };
  }

  private calculateEndDate(requestedEndDate?: Date, maxDuration?: number): Date | undefined {
    if (!requestedEndDate && !maxDuration) return undefined;
    
    const now = new Date();
    const maxEndDate = maxDuration 
      ? new Date(now.getTime() + maxDuration * 24 * 60 * 60 * 1000)
      : undefined;

    if (!requestedEndDate) return maxEndDate;
    if (!maxEndDate) return requestedEndDate;

    return requestedEndDate <= maxEndDate ? requestedEndDate : maxEndDate;
  }

  private async validateShareRequest(
    request: IShareRequest,
    sharer: IUser,
    targetUsers: readonly IUser[]
  ): Promise<ValidationResult> {
    const context = {
      sharer,
      resource: {
        id: request.resourceId,
        type: request.resourceType,
        ownerId: sharer.id
      },
      targetUsers,
      request
    };

    return this.dependencies.shareValidator.validateShareRequest(context);
  }

  private async getSharedUsers(sharedResource: SharedResource): Promise<readonly IUser[]> {
    // This would need to be implemented to fetch user details
    // For now, return empty array
    return [];
  }
}
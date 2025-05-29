import { Types } from 'mongoose';
import { Role, ResourceType, Action, Severity } from '../../../types/core/enums';
import { IResourcePermission, IUser } from '../../../types/core/interfaces';
import { PermissionSet } from '../permissions/core/PermissionSet';
import {
  IPermissionRepository,
  IIAMService,
  IAccessContext,
  IAccessDecision,
  IPermissionSet
} from '../permissions/core/interfaces';
import { IAMLogger } from '../logging/IAMLogger';

export class IAMService implements IIAMService {
  private readonly logger: IAMLogger;

  constructor(
    private readonly permissionRepository: IPermissionRepository
  ) {
    this.logger = new IAMLogger('IAMService');
  }

  async canAccess(
    user: IUser,
    resource: ResourceType,
    action: Action,
    context?: IAccessContext
  ): Promise<boolean> {
    try {
      const result = await this.performAccessValidation(user, resource, action, context);
      
      this.logger.logDecision(
        user.id.toString(),
        resource,
        action,
        result,
        result ? 'Access granted' : 'Access denied'
      );
      
      return result;
    } catch (error) {
      this.logger.logDecision(
        user.id.toString(),
        resource,
        action,
        false,
        `Error: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
      return false;
    }
  }

  async validateAccess(
    user: IUser,
    resource: ResourceType,
    action: Action,
    context?: IAccessContext
  ): Promise<IAccessDecision> {
    try {
      const result = await this.performAccessValidation(user, resource, action, context);
      
      const decision: IAccessDecision = {
        granted: result,
        reason: result ? 'Access granted' : 'Access denied',
        context: {
          user,
          resource,
          action,
          resourceId: context?.resourceId,
          organizationId: context?.organizationId ?? user.organization,
          targetUserId: context?.targetUserId,
          metadata: context?.metadata,
          timestamp: new Date()
        },
        timestamp: new Date(),
        strategy: 'RoleBased'
      };

      return decision;
    } catch (error) {
      this.logger.log(`validateAccess error: ${error instanceof Error ? error.message : 'Unknown error'}`, Severity.ERROR);
      return {
        granted: false,
        reason: 'Validation failed',
        context: {
          user,
          resource,
          action,
          resourceId: context?.resourceId,
          organizationId: context?.organizationId ?? user.organization,
          targetUserId: context?.targetUserId,
          metadata: context?.metadata,
          timestamp: new Date()
        },
        timestamp: new Date(),
        strategy: 'RoleBased'
      };
    }
  }

  async canShare(user: IUser, target: IUser, resource: ResourceType): Promise<boolean> {
    try {
      // Check if user has share permission for the resource
      const hasSharePermission = await this.canAccess(user, resource, Action.SHARE);
      if (!hasSharePermission) {
        return false;
      }

      // Check if both users are in the same organization
      const sameOrganization = user.organization.toString() === target.organization.toString();
      
      this.logger.logSharing(
        user.id.toString(),
        target.id.toString(),
        resource,
        Action.SHARE
      );

      return sameOrganization;
    } catch (error) {
      this.logger.log(`canShare error: ${error instanceof Error ? error.message : 'Unknown error'}`, Severity.ERROR);
      return false;
    }
  }

  async hasPermission(user: IUser, permission: IResourcePermission): Promise<boolean> {
    try {
      const userPermissions = await this.getUserPermissions(user);
      return userPermissions.some(p =>
        p.resource === permission.resource &&
        permission.actions.every((action: any) => p.actions.includes(action))
      );
    } catch (error) {
      this.logger.log(`hasPermission error: ${error instanceof Error ? error.message : 'Unknown error'}`, Severity.ERROR);
      return false;
    }
  }

  async getUserPermissions(user: IUser): Promise<readonly IResourcePermission[]> {
    try {
      const permissionSet = await this.permissionRepository.findByRole(user.role);
      return permissionSet?.getPermissions() ?? [];
    } catch (error) {
      this.logger.log(`getUserPermissions error: ${error instanceof Error ? error.message : 'Unknown error'}`, Severity.ERROR);
      return [];
    }
  }

  async createPermissionSet(
    role: Role,
    permissions: readonly IResourcePermission[],
    description: string,
    createdBy: Types.ObjectId
  ): Promise<IPermissionSet> {
    try {
      const existingPermissions = await this.permissionRepository.findByRole(role);
      if (existingPermissions) {
        throw new Error(`Permissions for role ${role} already exist`);
      }

      const permissionSet = new PermissionSet({
        role,
        permissions,
        description,
        createdBy
      });

      return this.permissionRepository.create(permissionSet);
    } catch (error) {
      this.logger.log(`createPermissionSet error: ${error instanceof Error ? error.message : 'Unknown error'}`, Severity.ERROR);
      throw error;
    }
  }

  async updateRolePermissions(
    role: Role,
    permissions: readonly IResourcePermission[]
  ): Promise<IPermissionSet | null> {
    try {
      const existing = await this.permissionRepository.findByRole(role);
      if (!existing) {
        throw new Error(`Permissions for role ${role} not found`);
      }

      return this.permissionRepository.update(existing.id, { permissions });
    } catch (error) {
      this.logger.log(`updateRolePermissions error: ${error instanceof Error ? error.message : 'Unknown error'}`, Severity.ERROR);
      throw error;
    }
  }

  async getRolePermissions(role: Role): Promise<IPermissionSet | null> {
    try {
      return await this.permissionRepository.findByRole(role);
    } catch (error) {
      this.logger.log(`getRolePermissions error: ${error instanceof Error ? error.message : 'Unknown error'}`, Severity.ERROR);
      return null;
    }
  }

  private async performAccessValidation(
    user: IUser,
    resource: ResourceType,
    action: Action,
    context?: IAccessContext
  ): Promise<boolean> {
    try {
      // Check if user is active
      if (user.status !== 'ACTIVE') {
        return false;
      }

      // Get permission set for user's role
      const permissionSet = await this.permissionRepository.findByRole(user.role);
      if (!permissionSet?.isActive) {
        return false;
      }

      // Check if the permission set allows the resource/action
      if (!permissionSet.allows(resource, action)) {
        return false;
      }

      // Validate organization context if provided
      if (context?.organizationId) {
        const userOrgId = user.organization.toString();
        const resourceOrgId = context.organizationId.toString();
        if (userOrgId !== resourceOrgId) {
          return false;
        }
      }

      return true;
    } catch (error) {
      this.logger.log(`performAccessValidation error: ${error instanceof Error ? error.message : 'Unknown error'}`, Severity.ERROR);
      return false;
    }
  }
}
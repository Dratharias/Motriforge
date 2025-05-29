import { Role, ResourceType, Action } from '../../../types/core/enums';
import { IResourcePermission, IUser } from '../../../types/core/interfaces';
import { IPermissionRepository, IIAMService, IAccessContext } from './interfaces';

export class IAMService implements IIAMService {
  constructor(private readonly permissionRepository: IPermissionRepository) {}

  async canAccess(
    user: IUser,
    resource: ResourceType,
    action: Action,
    context?: IAccessContext
  ): Promise<boolean> {
    try {
      // Basic user validation
      if (user.status !== 'ACTIVE') {
        return false;
      }

      // Get user's role permissions
      const permissionSet = await this.permissionRepository.findByRole(user.role);
      if (!permissionSet?.isActive) {
        return false;
      }

      // Check if user has the required permission
      if (!permissionSet.allows(resource, action)) {
        return false;
      }

      // Organization context validation
      if (context?.organizationId) {
        if (!user.organization.equals(context.organizationId)) {
          return false;
        }
      }

      return true;
    } catch (error) {
      console.error('IAM access check error:', error);
      return false;
    }
  }

  async canShare(user: IUser, target: IUser, resource: ResourceType): Promise<boolean> {
    try {
      // Check if user has share permission
      const hasSharePermission = await this.canAccess(user, resource, Action.SHARE);
      if (!hasSharePermission) {
        return false;
      }

      // Check same organization
      return user.organization.toString() === target.organization.toString();
    } catch (error) {
      console.error('IAM share check error:', error);
      return false;
    }
  }

  async getUserPermissions(user: IUser): Promise<readonly IResourcePermission[]> {
    try {
      const permissionSet = await this.permissionRepository.findByRole(user.role);
      return permissionSet?.getPermissions() ?? [];
    } catch (error) {
      console.error('IAM get permissions error:', error);
      return [];
    }
  }

  async createPermissionSet(
    role: Role,
    permissions: readonly IResourcePermission[],
    description: string
  ): Promise<void> {
    const existing = await this.permissionRepository.findByRole(role);
    if (existing) {
      throw new Error(`Permissions for role ${role} already exist`);
    }

    const permissionSet = new (await import('./PermissionSet')).PermissionSet({
      role,
      permissions,
      description
    });

    await this.permissionRepository.create(permissionSet);
  }
}


import { Types } from 'mongoose';
import { Role, ResourceType, Action } from '../../../types/core/enums';
import { IResourcePermission } from '../../../types/core/interfaces';
import { IPermissionSet } from './interfaces';

interface PermissionSetData {
  readonly role: Role;
  readonly permissions: readonly IResourcePermission[];
  readonly description: string;
  readonly id?: Types.ObjectId;
  readonly isActive?: boolean;
  readonly createdBy?: Types.ObjectId;
}

export class PermissionSet implements IPermissionSet {
  readonly id: Types.ObjectId;
  readonly role: Role;
  readonly permissions: readonly IResourcePermission[];
  readonly description: string;
  readonly isActive: boolean;
  readonly createdAt: Date;
  readonly createdBy?: Types.ObjectId;

  constructor(data: PermissionSetData) {
    this.validateInput(data);
    
    this.id = data.id ?? new Types.ObjectId();
    this.role = data.role;
    this.permissions = data.permissions;
    this.description = data.description;
    this.isActive = data.isActive ?? true;
    this.createdAt = new Date();
    this.createdBy = data.createdBy;
  }

  allows(resource: ResourceType, action: Action): boolean {
    return this.permissions.some(permission =>
      permission.resource === resource &&
      permission.actions.includes(action)
    );
  }

  getPermissions(): readonly IResourcePermission[] {
    return this.permissions;
  }

  private validateInput(data: PermissionSetData): void {
    if (!data.role) {
      throw new Error('Role is required for PermissionSet');
    }
    if (!data.description?.trim()) {
      throw new Error('Description is required for PermissionSet');
    }
    
    // Check for duplicate resources
    const resources = new Set<ResourceType>();
    for (const permission of data.permissions) {
      if (resources.has(permission.resource)) {
        throw new Error(`Duplicate permission found for resource: ${permission.resource}`);
      }
      resources.add(permission.resource);
    }
  }
}


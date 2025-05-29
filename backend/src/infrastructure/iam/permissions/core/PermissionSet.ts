import { Types } from 'mongoose';
import { Role, ResourceType, Action } from '../../../../types/core/enums';
import { IEntity, IResourcePermission } from '../../../../types/core/interfaces';
import { IPermissionSetData, IPermissionSet } from './interfaces';

export class PermissionSet implements IPermissionSet {
  readonly id: Types.ObjectId;
  readonly role: Role;
  readonly permissions: readonly IResourcePermission[];
  readonly description: string;
  readonly isActive: boolean;
  readonly isDraft: boolean;
  readonly version: number;
  readonly metadata?: Record<string, unknown>;
  readonly createdAt: Date;
  readonly updatedAt: Date;
  readonly createdBy: Types.ObjectId;

  constructor(data: IPermissionSetData & Partial<IEntity>) {
    this.id = data.id ?? new Types.ObjectId();
    this.role = data.role;
    this.permissions = data.permissions ?? [];
    this.description = data.description;
    this.isActive = data.isActive ?? true;
    this.isDraft = data.isDraft ?? false;
    this.version = data.version ?? 1;
    this.metadata = data.metadata;
    this.createdAt = data.createdAt ?? new Date();
    this.updatedAt = data.updatedAt ?? new Date();
    this.createdBy = data.createdBy ?? new Types.ObjectId();

    this.validatePermissionSet();
  }

  allows(resource: ResourceType, action: Action): boolean {
    return this.permissions.some(permission => 
      permission.resource === resource && 
      permission.actions.includes(action)
    );
  }

  getPermission(resource: ResourceType): IResourcePermission | null {
    return this.permissions.find(permission => permission.resource === resource) ?? null;
  }

  getPermissions(): readonly IResourcePermission[] {
    return this.permissions;
  }

  hasPermission(resource: ResourceType, action: Action): boolean {
    return this.allows(resource, action);
  }

  update(updates: Partial<IPermissionSetData>): PermissionSet {
    return new PermissionSet({
      ...this,
      ...updates,
      updatedAt: new Date(),
      version: this.version + 1
    });
  }

  canBeUsed(): boolean {
    return this.isActive && !this.isExpired();
  }

  isExpired(): boolean {
    // Could check expiration date from metadata if needed
    const expiresAt = this.metadata?.expiresAt as Date;
    return expiresAt ? expiresAt <= new Date() : false;
  }

  private validatePermissionSet(): void {
    if (!this.role) {
      throw new Error('Role is required for PermissionSet');
    }
    
    if (!this.description?.trim()) {
      throw new Error('Description is required for PermissionSet');
    }

    // Check for duplicate resource permissions
    const resources = new Set<ResourceType>();
    for (const permission of this.permissions) {
      if (resources.has(permission.resource)) {
        throw new Error(`Duplicate permission found for resource: ${permission.resource}`);
      }
      resources.add(permission.resource);
    }
  }
}
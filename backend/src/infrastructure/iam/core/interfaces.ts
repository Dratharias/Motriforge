import { Types } from 'mongoose';
import { Role, ResourceType, Action } from '../../../types/core/enums';
import { IUser, IResourcePermission } from '../../../types/core/interfaces';

export interface IAccessContext {
  readonly resourceId?: Types.ObjectId;
  readonly organizationId?: Types.ObjectId;
  readonly metadata?: Record<string, unknown>;
}

export interface IPermissionSet {
  readonly id: Types.ObjectId;
  readonly role: Role;
  readonly permissions: readonly IResourcePermission[];
  readonly description: string;
  readonly isActive: boolean;
  allows(resource: ResourceType, action: Action): boolean;
  getPermissions(): readonly IResourcePermission[];
}

export interface IPermissionRepository {
  findByRole(role: Role): Promise<IPermissionSet | null>;
  create(permissionSet: IPermissionSet): Promise<IPermissionSet>;
  update(id: Types.ObjectId, updates: Partial<IPermissionSet>): Promise<IPermissionSet | null>;
}

export interface IIAMService {
  canAccess(user: IUser, resource: ResourceType, action: Action, context?: IAccessContext): Promise<boolean>;
  canShare(user: IUser, target: IUser, resource: ResourceType): Promise<boolean>;
  getUserPermissions(user: IUser): Promise<readonly IResourcePermission[]>;
}


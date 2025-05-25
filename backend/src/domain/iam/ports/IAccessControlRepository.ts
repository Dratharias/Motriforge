import { Types } from 'mongoose';
import { AccessControl } from '../entities/AccessControl';

export interface IAccessControlRepository {
  findById(id: Types.ObjectId): Promise<AccessControl | null>;
  findByIdentityId(identityId: Types.ObjectId): Promise<AccessControl | null>;
  save(accessControl: AccessControl): Promise<void>;
  delete(id: Types.ObjectId): Promise<void>;
  findActiveByIdentityId(identityId: Types.ObjectId): Promise<AccessControl | null>;
  findByRoleId(roleId: Types.ObjectId): Promise<AccessControl[]>;
  findByPermissionId(permissionId: Types.ObjectId): Promise<AccessControl[]>;
}


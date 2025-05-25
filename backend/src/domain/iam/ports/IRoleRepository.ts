import { Types } from 'mongoose';
import { Role } from '@/types/iam/interfaces';

export interface IRoleRepository {
  findById(id: Types.ObjectId): Promise<Role | null>;
  findByName(name: string): Promise<Role | null>;
  findByIds(ids: Types.ObjectId[]): Promise<Role[]>;
  save(role: Role): Promise<void>;
  delete(id: Types.ObjectId): Promise<void>;
  findAll(): Promise<Role[]>;
  findSystemRoles(): Promise<Role[]>;
  findByParentRole(parentRoleId: Types.ObjectId): Promise<Role[]>;
  findRoleHierarchy(roleId: Types.ObjectId): Promise<Role[]>;
}


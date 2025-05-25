import { Types } from 'mongoose';
import { Permission } from '@/types/iam/interfaces';

export interface IPermissionRepository {
  findById(id: Types.ObjectId): Promise<Permission | null>;
  findByName(name: string): Promise<Permission | null>;
  findByIds(ids: Types.ObjectId[]): Promise<Permission[]>;
  findByResource(resource: string): Promise<Permission[]>;
  findByResourceAndAction(resource: string, action: string): Promise<Permission | null>;
  save(permission: Permission): Promise<void>;
  delete(id: Types.ObjectId): Promise<void>;
  findAll(): Promise<Permission[]>;
  findSystemPermissions(): Promise<Permission[]>;
}


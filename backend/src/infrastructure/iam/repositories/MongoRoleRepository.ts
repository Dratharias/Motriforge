
import { Types } from 'mongoose';
import { IRoleRepository } from '@/domain/iam/ports/IRoleRepository';
import { Role } from '@/types/iam/interfaces';
import { RoleName } from '@/domain/iam/value-objects/RoleName';
import { RoleDocument } from './types/DocumentInterfaces';
import { IRoleModel } from './types/ModelInterfaces';

export class MongoRoleRepository implements IRoleRepository {
  constructor(private readonly model: IRoleModel) {}

  async findById(id: Types.ObjectId): Promise<Role | null> {
    const doc = await this.model.findById(id).lean();
    return doc ? this.toDomain(doc) : null;
  }

  async findByName(name: string): Promise<Role | null> {
    const doc = await this.model.findOne({ 'name.value': name }).lean();
    return doc ? this.toDomain(doc) : null;
  }

  async findByIds(ids: Types.ObjectId[]): Promise<Role[]> {
    const docs = await this.model.find({ _id: { $in: ids } }).lean();
    return docs.map(doc => this.toDomain(doc));
  }

  async save(role: Role): Promise<void> {
    const doc = this.toDocument(role);
    await this.model.findByIdAndUpdate(
      role.id,
      doc,
      { upsert: true, new: true }
    );
  }

  async delete(id: Types.ObjectId): Promise<void> {
    await this.model.findByIdAndDelete(id);
  }

  async findAll(): Promise<Role[]> {
    const docs = await this.model.find().lean();
    return docs.map(doc => this.toDomain(doc));
  }

  async findSystemRoles(): Promise<Role[]> {
    const docs = await this.model.find({ isSystemRole: true }).lean();
    return docs.map(doc => this.toDomain(doc));
  }

  async findByParentRole(parentRoleId: Types.ObjectId): Promise<Role[]> {
    const docs = await this.model.find({ parentRoles: parentRoleId }).lean();
    return docs.map(doc => this.toDomain(doc));
  }

  async findRoleHierarchy(roleId: Types.ObjectId): Promise<Role[]> {
    // Simple implementation - could be enhanced with recursive queries
    const docs = await this.model.find({
      $or: [
        { _id: roleId },
        { parentRoles: roleId },
        { childRoles: roleId }
      ]
    }).lean();
    return docs.map(doc => this.toDomain(doc));
  }

  private toDomain(doc: RoleDocument): Role {
    return {
      id: doc._id,
      name: new RoleName(doc.name.value, doc.name.scope) as any,
      description: doc.description,
      permissions: doc.permissions,
      parentRoles: doc.parentRoles,
      childRoles: doc.childRoles,
      isSystemRole: doc.isSystemRole,
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt
    };
  }

  private toDocument(role: Role): Partial<RoleDocument> {
    return {
      _id: role.id,
      name: {
        value: role.name.value,
        scope: role.name.scope
      },
      description: role.description,
      permissions: Array.from(role.permissions),
      parentRoles: Array.from(role.parentRoles),
      childRoles: Array.from(role.childRoles),
      isSystemRole: role.isSystemRole,
      createdAt: role.createdAt,
      updatedAt: role.updatedAt
    };
  }
}
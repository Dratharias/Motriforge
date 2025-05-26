
import { Types } from 'mongoose';
import { IPermissionRepository } from '@/domain/iam/ports/IPermissionRepository';
import { Permission } from '@/types/iam/interfaces';
import { PermissionName } from '@/domain/iam/value-objects/PermissionName';
import { PermissionDocument } from './types/DocumentInterfaces';
import { PermissionModel } from './types/ModelInterfaces';

export class MongoPermissionRepository implements IPermissionRepository {
  constructor(private readonly model: PermissionModel) {}

  async findById(id: Types.ObjectId): Promise<Permission | null> {
    const doc = await this.model.findById(id).lean();
    return doc ? this.toDomain(doc) : null;
  }

  async findByName(name: string): Promise<Permission | null> {
    const doc = await this.model.findOne({ 'name.value': name }).lean();
    return doc ? this.toDomain(doc) : null;
  }

  async findByIds(ids: Types.ObjectId[]): Promise<Permission[]> {
    const docs = await this.model.find({ _id: { $in: ids } }).lean();
    return docs.map(doc => this.toDomain(doc));
  }

  async findByResource(resource: string): Promise<Permission[]> {
    const docs = await this.model.find({ resource }).lean();
    return docs.map(doc => this.toDomain(doc));
  }

  async findByResourceAndAction(resource: string, action: string): Promise<Permission | null> {
    const doc = await this.model.findOne({ resource, action }).lean();
    return doc ? this.toDomain(doc) : null;
  }

  async save(permission: Permission): Promise<void> {
    const doc = this.toDocument(permission);
    await this.model.findByIdAndUpdate(
      permission.id,
      doc,
      { upsert: true, new: true }
    );
  }

  async delete(id: Types.ObjectId): Promise<void> {
    await this.model.findByIdAndDelete(id);
  }

  async findAll(): Promise<Permission[]> {
    const docs = await this.model.find().lean();
    return docs.map(doc => this.toDomain(doc));
  }

  async findSystemPermissions(): Promise<Permission[]> {
    const docs = await this.model.find({ isSystemPermission: true }).lean();
    return docs.map(doc => this.toDomain(doc));
  }

  private toDomain(doc: PermissionDocument): Permission {
    return {
      id: doc._id,
      name: new PermissionName(doc.name.value, doc.name.resource, doc.name.action) as any,
      description: doc.description,
      resource: doc.resource,
      action: doc.action,
      conditions: doc.conditions,
      isSystemPermission: doc.isSystemPermission,
      createdAt: doc.createdAt
    };
  }

  private toDocument(permission: Permission): Partial<PermissionDocument> {
    return {
      _id: permission.id,
      name: {
        value: permission.name.value,
        resource: permission.name.resource,
        action: permission.name.action
      },
      description: permission.description,
      resource: permission.resource,
      action: permission.action,
      conditions: permission.conditions,
      isSystemPermission: permission.isSystemPermission,
      createdAt: permission.createdAt
    };
  }
}
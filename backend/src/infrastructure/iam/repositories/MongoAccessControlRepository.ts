import { Types, Model } from 'mongoose';
import { AccessControl } from '@/domain/iam/entities/AccessControl';
import { IAccessControlRepository } from '@/domain/iam/ports/IAccessControlRepository';
import { AccessLevel } from '@/types/iam/interfaces';

interface AccessControlDocument {
  _id: Types.ObjectId;
  identityId: Types.ObjectId;
  roles: Types.ObjectId[];
  permissions: Types.ObjectId[];
  accessLevel: AccessLevel;
  effectiveFrom: Date;
  effectiveUntil?: Date;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export class MongoAccessControlRepository implements IAccessControlRepository {
  constructor(private readonly model: Model<AccessControlDocument>) {}

  async findById(id: Types.ObjectId): Promise<AccessControl | null> {
    const doc = await this.model.findById(id).lean();
    return doc ? this.toDomain(doc) : null;
  }

  async findByIdentityId(identityId: Types.ObjectId): Promise<AccessControl | null> {
    const doc = await this.model.findOne({ identityId }).lean();
    return doc ? this.toDomain(doc) : null;
  }

  async save(accessControl: AccessControl): Promise<void> {
    const doc = this.toDocument(accessControl);
    await this.model.findByIdAndUpdate(
      accessControl.id,
      doc,
      { upsert: true, new: true }
    );
  }

  async delete(id: Types.ObjectId): Promise<void> {
    await this.model.findByIdAndDelete(id);
  }

  async findActiveByIdentityId(identityId: Types.ObjectId): Promise<AccessControl | null> {
    const now = new Date();
    const doc = await this.model.findOne({
      identityId,
      isActive: true,
      effectiveFrom: { $lte: now },
      $or: [
        { effectiveUntil: { $exists: false } },
        { effectiveUntil: null },
        { effectiveUntil: { $gte: now } }
      ]
    }).lean();
    return doc ? this.toDomain(doc) : null;
  }

  async findByRoleId(roleId: Types.ObjectId): Promise<AccessControl[]> {
    const docs = await this.model.find({
      roles: roleId,
      isActive: true
    }).lean();
    return docs.map(doc => this.toDomain(doc));
  }

  async findByPermissionId(permissionId: Types.ObjectId): Promise<AccessControl[]> {
    const docs = await this.model.find({
      permissions: permissionId,
      isActive: true
    }).lean();
    return docs.map(doc => this.toDomain(doc));
  }

  private toDomain(doc: AccessControlDocument): AccessControl {
    return new AccessControl(
      doc._id,
      doc.identityId,
      doc.roles,
      doc.permissions,
      doc.accessLevel,
      doc.effectiveFrom,
      doc.effectiveUntil,
      doc.isActive,
      doc.createdAt,
      doc.updatedAt
    );
  }

  private toDocument(accessControl: AccessControl): Partial<AccessControlDocument> {
    return {
      _id: accessControl.id,
      identityId: accessControl.identityId,
      roles: Array.from(accessControl.roles),
      permissions: Array.from(accessControl.permissions),
      accessLevel: accessControl.accessLevel,
      effectiveFrom: accessControl.effectiveFrom,
      effectiveUntil: accessControl.effectiveUntil,
      isActive: accessControl.isActive,
      createdAt: accessControl.createdAt,
      updatedAt: accessControl.updatedAt
    };
  }
}


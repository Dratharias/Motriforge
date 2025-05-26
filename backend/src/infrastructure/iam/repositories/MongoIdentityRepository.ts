
import { Types } from 'mongoose';
import { Identity } from '@/domain/iam/entities/Identity';
import { IdentityAggregate } from '@/domain/iam/aggregates/IdentityAggregate';
import { IIdentityRepository } from '@/domain/iam/ports/IIdentityRepository';
import { Username } from '@/domain/iam/value-objects/Username';
import { IdentityStatus } from '@/types/iam/interfaces';
import { IdentityDocument } from './types/DocumentInterfaces';
import { IIdentityModel } from './types/ModelInterfaces';

export class MongoIdentityRepository implements IIdentityRepository {
  constructor(private readonly model: IIdentityModel) {}

  async findById(id: Types.ObjectId): Promise<Identity | null> {
    const doc = await this.model.findById(id).lean();
    return doc ? this.toDomain(doc) : null;
  }

  async findByUsername(username: string): Promise<Identity | null> {
    const doc = await this.model.findOne({ username }).lean();
    return doc ? this.toDomain(doc) : null;
  }

  async findByEmail(email: string): Promise<Identity | null> {
    const doc = await this.model.findOne({ email }).lean();
    return doc ? this.toDomain(doc) : null;
  }

  async findByUsernameOrEmail(usernameOrEmail: string): Promise<Identity | null> {
    const doc = await this.model.findOne({
      $or: [
        { username: usernameOrEmail },
        { email: usernameOrEmail }
      ]
    }).lean();
    return doc ? this.toDomain(doc) : null;
  }

  async save(identity: Identity): Promise<void> {
    const doc = this.toDocument(identity);
    await this.model.findByIdAndUpdate(
      identity.id,
      doc,
      { upsert: true, new: true }
    );
  }

  async saveAggregate(aggregate: IdentityAggregate): Promise<void> {
    const identity = aggregate.getIdentity();
    await this.save(identity);
    // Note: In a full implementation, we would also save the access control
    // and handle domain events here
  }

  async delete(id: Types.ObjectId): Promise<void> {
    await this.model.findByIdAndDelete(id);
  }

  async exists(id: Types.ObjectId): Promise<boolean> {
    const count = await this.model.countDocuments({ _id: id });
    return count > 0;
  }

  async findAll(skip: number = 0, limit: number = 100): Promise<Identity[]> {
    const docs = await this.model
      .find()
      .skip(skip)
      .limit(limit)
      .lean();
    return docs.map(doc => this.toDomain(doc));
  }

  async countAll(): Promise<number> {
    return await this.model.countDocuments();
  }

  async findByStatus(status: IdentityStatus): Promise<Identity[]> {
    const docs = await this.model.find({ status }).lean();
    return docs.map(doc => this.toDomain(doc));
  }

  private toDomain(doc: IdentityDocument): Identity {
    return new Identity(
      doc._id,
      new Username(doc.username, doc.usernameDomain),
      doc.email,
      doc.status,
      doc.createdAt,
      doc.updatedAt,
      doc.lastLoginAt,
      doc.failedLoginAttempts,
      doc.lockedUntil,
      doc.emailVerified,
      doc.phoneVerified,
      doc.mfaEnabled,
      doc.attributes
    );
  }

  private toDocument(identity: Identity): Partial<IdentityDocument> {
    return {
      _id: identity.id,
      username: identity.username.value,
      usernameDomain: identity.username.domain,
      email: identity.email,
      status: identity.status,
      createdAt: identity.createdAt,
      updatedAt: identity.updatedAt,
      lastLoginAt: identity.lastLoginAt,
      failedLoginAttempts: identity.failedLoginAttempts,
      lockedUntil: identity.lockedUntil,
      emailVerified: identity.emailVerified,
      phoneVerified: identity.phoneVerified,
      mfaEnabled: identity.mfaEnabled,
      attributes: identity.attributes
    };
  }
}
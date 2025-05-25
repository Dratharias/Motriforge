import { Types, Model } from 'mongoose';
import { Session } from '@/domain/iam/entities/Session';
import { ISessionRepository } from '@/domain/iam/ports/ISessionRepository';
import { SessionId } from '@/domain/iam/value-objects/SessionId';
import { IPAddress } from '@/domain/iam/value-objects/IPAddress';
import { SessionStatus, AuthenticationMethod } from '@/types/iam/interfaces';

interface SessionDocument {
  _id: Types.ObjectId;
  sessionId: string;
  identityId: Types.ObjectId;
  deviceId: Types.ObjectId;
  status: SessionStatus;
  createdAt: Date;
  expiresAt: Date;
  lastAccessedAt: Date;
  ipAddress: string;
  userAgent: string;
  authenticationMethod: AuthenticationMethod;
  riskScore: number;
  metadata: Record<string, unknown>;
}

export class MongoSessionRepository implements ISessionRepository {
  constructor(private readonly model: Model<SessionDocument>) {}

  async findById(id: Types.ObjectId): Promise<Session | null> {
    const doc = await this.model.findById(id).lean();
    return doc ? this.toDomain(doc) : null;
  }

  async findBySessionId(sessionId: string): Promise<Session | null> {
    const doc = await this.model.findOne({ sessionId }).lean();
    return doc ? this.toDomain(doc) : null;
  }

  async findByIdentityId(identityId: Types.ObjectId): Promise<Session[]> {
    const docs = await this.model.find({ identityId }).lean();
    return docs.map(doc => this.toDomain(doc));
  }

  async findActiveByIdentityId(identityId: Types.ObjectId): Promise<Session[]> {
    const docs = await this.model.find({
      identityId,
      status: SessionStatus.ACTIVE,
      expiresAt: { $gt: new Date() }
    }).lean();
    return docs.map(doc => this.toDomain(doc));
  }

  async save(session: Session): Promise<void> {
    const doc = this.toDocument(session);
    await this.model.findByIdAndUpdate(
      session.id,
      doc,
      { upsert: true, new: true }
    );
  }

  async delete(id: Types.ObjectId): Promise<void> {
    await this.model.findByIdAndDelete(id);
  }

  async deleteBySessionId(sessionId: string): Promise<void> {
    await this.model.findOneAndDelete({ sessionId });
  }

  async findByStatus(status: SessionStatus): Promise<Session[]> {
    const docs = await this.model.find({ status }).lean();
    return docs.map(doc => this.toDomain(doc));
  }

  async findExpiredSessions(): Promise<Session[]> {
    const docs = await this.model.find({
      $or: [
        { expiresAt: { $lte: new Date() } },
        { status: SessionStatus.EXPIRED }
      ]
    }).lean();
    return docs.map(doc => this.toDomain(doc));
  }

  async cleanupExpiredSessions(): Promise<number> {
    const result = await this.model.deleteMany({
      $or: [
        { expiresAt: { $lte: new Date() } },
        { status: SessionStatus.EXPIRED },
        { status: SessionStatus.TERMINATED }
      ]
    });
    return result.deletedCount || 0;
  }

  private toDomain(doc: SessionDocument): Session {
    return new Session(
      doc._id,
      new SessionId(doc.sessionId),
      doc.identityId,
      doc.deviceId,
      doc.status,
      doc.createdAt,
      doc.expiresAt,
      doc.lastAccessedAt,
      new IPAddress(doc.ipAddress),
      doc.userAgent,
      doc.authenticationMethod,
      doc.riskScore,
      doc.metadata
    );
  }

  private toDocument(session: Session): Partial<SessionDocument> {
    return {
      _id: session.id,
      sessionId: session.sessionId.value,
      identityId: session.identityId,
      deviceId: session.deviceId,
      status: session.status,
      createdAt: session.createdAt,
      expiresAt: session.expiresAt,
      lastAccessedAt: session.lastAccessedAt,
      ipAddress: session.ipAddress.value,
      userAgent: session.userAgent,
      authenticationMethod: session.authenticationMethod,
      riskScore: session.riskScore,
      metadata: session.metadata
    };
  }
}


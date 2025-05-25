import { Types } from 'mongoose';
import { Session as ISession, SessionStatus, AuthenticationMethod } from '@/types/iam/interfaces';
import { SessionId } from '../value-objects/SessionId';
import { IPAddress } from '../value-objects/IPAddress';

export class Session implements ISession {
  constructor(
    public readonly id: Types.ObjectId,
    public readonly sessionId: SessionId,
    public readonly identityId: Types.ObjectId,
    public readonly deviceId: Types.ObjectId,
    public readonly status: SessionStatus,
    public readonly createdAt: Date,
    public readonly expiresAt: Date,
    public readonly lastAccessedAt: Date,
    public readonly ipAddress: IPAddress,
    public readonly userAgent: string,
    public readonly authenticationMethod: AuthenticationMethod,
    public readonly riskScore: number,
    public readonly metadata: Record<string, unknown>
  ) {}

  static create(
    identityId: Types.ObjectId,
    deviceId: Types.ObjectId,
    ipAddress: string,
    userAgent: string,
    authenticationMethod: AuthenticationMethod,
    expirationMinutes: number = 480 // 8 hours default
  ): Session {
    const now = new Date();
    const expiresAt = new Date(now.getTime() + expirationMinutes * 60 * 1000);

    return new Session(
      new Types.ObjectId(),
      SessionId.generate(),
      identityId,
      deviceId,
      SessionStatus.ACTIVE,
      now,
      expiresAt,
      now,
      new IPAddress(ipAddress),
      userAgent,
      authenticationMethod,
      0, // Initial risk score
      {}
    );
  }

  isActive(): boolean {
    return this.status === SessionStatus.ACTIVE && !this.isExpired();
  }

  isExpired(): boolean {
    return new Date() > this.expiresAt;
  }

  updateLastAccess(): Session {
    return new Session(
      this.id,
      this.sessionId,
      this.identityId,
      this.deviceId,
      this.status,
      this.createdAt,
      this.expiresAt,
      new Date(),
      this.ipAddress,
      this.userAgent,
      this.authenticationMethod,
      this.riskScore,
      this.metadata
    );
  }

  terminate(reason: string): Session {
    return new Session(
      this.id,
      this.sessionId,
      this.identityId,
      this.deviceId,
      SessionStatus.TERMINATED,
      this.createdAt,
      this.expiresAt,
      this.lastAccessedAt,
      this.ipAddress,
      this.userAgent,
      this.authenticationMethod,
      this.riskScore,
      { ...this.metadata, terminationReason: reason }
    );
  }

  updateRiskScore(newScore: number): Session {
    return new Session(
      this.id,
      this.sessionId,
      this.identityId,
      this.deviceId,
      this.status,
      this.createdAt,
      this.expiresAt,
      this.lastAccessedAt,
      this.ipAddress,
      this.userAgent,
      this.authenticationMethod,
      Math.max(0, Math.min(100, newScore)), // Clamp between 0-100
      this.metadata
    );
  }

  extend(additionalMinutes: number): Session {
    const newExpiresAt = new Date(this.expiresAt.getTime() + additionalMinutes * 60 * 1000);
    
    return new Session(
      this.id,
      this.sessionId,
      this.identityId,
      this.deviceId,
      this.status,
      this.createdAt,
      newExpiresAt,
      this.lastAccessedAt,
      this.ipAddress,
      this.userAgent,
      this.authenticationMethod,
      this.riskScore,
      this.metadata
    );
  }
}


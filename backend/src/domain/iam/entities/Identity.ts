import { Types } from 'mongoose';
import { Identity as IIdentity, IdentityStatus } from '@/types/iam/interfaces';
import { Username } from '../value-objects/Username';

export class Identity implements IIdentity {
  constructor(
    public readonly id: Types.ObjectId,
    public readonly username: Username,
    public readonly email: string,
    public readonly status: IdentityStatus,
    public readonly createdAt: Date,
    public readonly updatedAt: Date,
    public readonly lastLoginAt: Date | undefined,
    public readonly failedLoginAttempts: number,
    public readonly lockedUntil: Date | undefined,
    public readonly emailVerified: boolean,
    public readonly phoneVerified: boolean,
    public readonly mfaEnabled: boolean,
    public readonly attributes: Record<string, unknown>
  ) {}

  static create(
    username: string,
    email: string,
    attributes: Record<string, unknown> = {}
  ): Identity {
    return new Identity(
      new Types.ObjectId(),
      new Username(username),
      email,
      IdentityStatus.PENDING_VERIFICATION,
      new Date(),
      new Date(),
      undefined,
      0,
      undefined,
      false,
      false,
      false,
      attributes
    );
  }

  isActive(): boolean {
    return this.status === IdentityStatus.ACTIVE;
  }

  isLocked(): boolean {
    return Boolean(this.status === IdentityStatus.LOCKED || 
           (this.lockedUntil && this.lockedUntil > new Date()));
  }

  canAuthenticate(): boolean {
    return this.isActive() && !this.isLocked();
  }

  incrementFailedAttempts(): Identity {
    const newAttempts = this.failedLoginAttempts + 1;
    const shouldLock = newAttempts >= 5;
    
    return new Identity(
      this.id,
      this.username,
      this.email,
      shouldLock ? IdentityStatus.LOCKED : this.status,
      this.createdAt,
      new Date(),
      this.lastLoginAt,
      newAttempts,
      shouldLock ? new Date(Date.now() + 30 * 60 * 1000) : this.lockedUntil, // 30 min lock
      this.emailVerified,
      this.phoneVerified,
      this.mfaEnabled,
      this.attributes
    );
  }

  recordSuccessfulLogin(): Identity {
    return new Identity(
      this.id,
      this.username,
      this.email,
      this.status,
      this.createdAt,
      new Date(),
      new Date(),
      0, // Reset failed attempts
      undefined, // Clear lock
      this.emailVerified,
      this.phoneVerified,
      this.mfaEnabled,
      this.attributes
    );
  }

  updateStatus(status: IdentityStatus): Identity {
    return new Identity(
      this.id,
      this.username,
      this.email,
      status,
      this.createdAt,
      new Date(),
      this.lastLoginAt,
      this.failedLoginAttempts,
      this.lockedUntil,
      this.emailVerified,
      this.phoneVerified,
      this.mfaEnabled,
      this.attributes
    );
  }
}


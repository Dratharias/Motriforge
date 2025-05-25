import { Types } from 'mongoose';
import { Identity } from '../entities/Identity';
import { IIdentityRepository } from '../ports/IIdentityRepository';
import { IPasswordHasher } from '../ports/IPasswordHasher';
import { IAuditLogger } from '../ports/IAuditLogger';
import { IdentityStatus, EventType, RiskLevel } from '@/types/iam/interfaces';

export class IdentityManagementService {
  constructor(
    private readonly identityRepository: IIdentityRepository,
    private readonly passwordHasher: IPasswordHasher,
    private readonly auditLogger: IAuditLogger
  ) {}

  async createIdentity(
    username: string,
    email: string,
    password?: string,
    attributes: Record<string, unknown> = {}
  ): Promise<Identity> {
    // Check for existing identity
    const existingIdentity = await this.identityRepository.findByUsernameOrEmail(username);
    if (existingIdentity) {
      throw new Error('Identity with this username or email already exists');
    }

    // Create new identity
    const identity = Identity.create(username, email, attributes);

    // Save to repository
    await this.identityRepository.save(identity);

    // Log creation
    await this.auditLogger.logSecurityEvent(
      EventType.IDENTITY_CREATED,
      identity.id,
      { username, email },
      RiskLevel.LOW
    );

    return identity;
  }

  async updateIdentityStatus(
    identityId: Types.ObjectId,
    status: IdentityStatus,
    reason: string
  ): Promise<Identity> {
    const identity = await this.identityRepository.findById(identityId);
    if (!identity) {
      throw new Error('Identity not found');
    }

    const updatedIdentity = identity.updateStatus(status);
    await this.identityRepository.save(updatedIdentity);

    await this.auditLogger.logSecurityEvent(
      EventType.IDENTITY_UPDATED,
      identityId,
      { oldStatus: identity.status, newStatus: status, reason },
      status === IdentityStatus.SUSPENDED ? RiskLevel.MEDIUM : RiskLevel.LOW
    );

    return updatedIdentity;
  }

  async verifyEmail(identityId: Types.ObjectId): Promise<Identity> {
    const identity = await this.identityRepository.findById(identityId);
    if (!identity) {
      throw new Error('Identity not found');
    }

    // Create new identity with email verified
    const verifiedIdentity = new Identity(
      identity.id,
      identity.username,
      identity.email,
      IdentityStatus.ACTIVE, // Activate after email verification
      identity.createdAt,
      new Date(),
      identity.lastLoginAt,
      identity.failedLoginAttempts,
      identity.lockedUntil,
      true, // emailVerified
      identity.phoneVerified,
      identity.mfaEnabled,
      identity.attributes
    );

    await this.identityRepository.save(verifiedIdentity);

    await this.auditLogger.logSecurityEvent(
      EventType.IDENTITY_UPDATED,
      identityId,
      { action: 'email_verified' },
      RiskLevel.LOW
    );

    return verifiedIdentity;
  }

  async enableMFA(identityId: Types.ObjectId): Promise<Identity> {
    const identity = await this.identityRepository.findById(identityId);
    if (!identity) {
      throw new Error('Identity not found');
    }

    const mfaEnabledIdentity = new Identity(
      identity.id,
      identity.username,
      identity.email,
      identity.status,
      identity.createdAt,
      new Date(),
      identity.lastLoginAt,
      identity.failedLoginAttempts,
      identity.lockedUntil,
      identity.emailVerified,
      identity.phoneVerified,
      true, // mfaEnabled
      identity.attributes
    );

    await this.identityRepository.save(mfaEnabledIdentity);

    await this.auditLogger.logSecurityEvent(
      EventType.IDENTITY_UPDATED,
      identityId,
      { action: 'mfa_enabled' },
      RiskLevel.LOW
    );

    return mfaEnabledIdentity;
  }
}


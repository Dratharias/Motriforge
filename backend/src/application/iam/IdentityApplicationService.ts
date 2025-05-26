import { Types } from 'mongoose';
import { IIdentityRepository } from '@/domain/iam/ports/IIdentityRepository';
import { IPasswordHasher } from '@/domain/iam/ports/IPasswordHasher';
import { IdentityManagementService } from '@/domain/iam/services/IdentityManagementService';
import { IAuditLogger } from '@/domain/iam/ports/IAuditLogger';
import { LoggerFactory } from '@/shared-kernel/infrastructure/logging/factory/LoggerFactory';
import {
  CreateIdentityCommand,
  UpdateIdentityCommand,
  GetIdentityQuery,
  IdentityProfileReadModel
} from '@/types/iam/interfaces';
import { Identity } from '@/domain/iam/entities/Identity';

export class IdentityApplicationService {
  private readonly logger = LoggerFactory.getContextualLogger('IdentityApplicationService');
  private readonly auditLogger = LoggerFactory.getAuditLogger();

  constructor(
    private readonly identityRepository: IIdentityRepository,
    private readonly passwordHasher: IPasswordHasher,
    private readonly identityManagementService: IdentityManagementService,
    private readonly domainAuditLogger: IAuditLogger
  ) {}

  async createIdentity(command: CreateIdentityCommand): Promise<Identity> {
    const contextLogger = this.logger.withCorrelationId(command.correlationId);
    
    try {
      contextLogger.info('Creating identity', { 
        username: command.username, 
        email: command.email 
      });

      // Hash password if provided
      let hashedPassword: string | undefined;
      if (command.password) {
        hashedPassword = await this.passwordHasher.hash(command.password);
      }

      // Create identity through domain service
      const identity = await this.identityManagementService.createIdentity(
        command.username,
        command.email,
        hashedPassword,
        command.attributes
      );

      // Audit successful creation
      await this.auditLogger.auditSuccess('identity_created', identity.id);
      
      contextLogger.info('Identity created successfully', { 
        identityId: identity.id.toString() 
      });

      return identity;

    } catch (error) {
      await this.auditLogger.auditFailure('identity_created', error as Error);
      contextLogger.error('Failed to create identity', error as Error, {
        username: command.username,
        email: command.email
      });
      throw error;
    }
  }

  async updateIdentity(command: UpdateIdentityCommand): Promise<Identity> {
    const contextLogger = this.logger
      .withCorrelationId(command.correlationId)
      .withData({ identityId: command.identityId.toString() });

    try {
      contextLogger.info('Updating identity');

      const existingIdentity = await this.identityRepository.findById(command.identityId);
      if (!existingIdentity) {
        throw new Error('Identity not found');
      }

      // Create updated identity
      let updatedIdentity = existingIdentity;

      if (command.status && command.status !== existingIdentity.status) {
        updatedIdentity = await this.identityManagementService.updateIdentityStatus(
          command.identityId,
          command.status,
          'Updated via application service'
        );
      }

      if (command.email && command.email !== existingIdentity.email) {
        // Create new identity with updated email
        updatedIdentity = new Identity(
          existingIdentity.id,
          existingIdentity.username,
          command.email,
          updatedIdentity.status,
          existingIdentity.createdAt,
          new Date(),
          existingIdentity.lastLoginAt,
          existingIdentity.failedLoginAttempts,
          existingIdentity.lockedUntil,
          false, // Email needs reverification
          existingIdentity.phoneVerified,
          existingIdentity.mfaEnabled,
          { ...existingIdentity.attributes, ...command.attributes }
        );

        await this.identityRepository.save(updatedIdentity);
      }

      await this.auditLogger.auditDataChange(
        'identity',
        command.identityId,
        {
          oldEmail: existingIdentity.email,
          newEmail: command.email,
          oldStatus: existingIdentity.status,
          newStatus: command.status
        }
      );

      contextLogger.info('Identity updated successfully');
      return updatedIdentity;

    } catch (error) {
      await this.auditLogger.auditFailure('identity_updated', error as Error);
      contextLogger.error('Failed to update identity', error as Error);
      throw error;
    }
  }

  async getIdentity(query: GetIdentityQuery): Promise<IdentityProfileReadModel | null> {
    const contextLogger = this.logger.withData({ 
      identityId: query.identityId.toString() 
    });

    try {
      contextLogger.debug('Retrieving identity profile');

      const identity = await this.identityRepository.findById(query.identityId);
      if (!identity) {
        return null;
      }

      // Convert to read model
      const readModel: IdentityProfileReadModel = {
        id: identity.id,
        username: identity.username.value,
        email: identity.email,
        status: identity.status,
        lastLoginAt: identity.lastLoginAt,
        emailVerified: identity.emailVerified,
        mfaEnabled: identity.mfaEnabled,
        roles: [], // Will be populated by access service
        permissions: [], // Will be populated by access service
        activeSessions: 0 // Will be populated by session service
      };

      contextLogger.debug('Identity profile retrieved successfully');
      return readModel;

    } catch (error) {
      contextLogger.error('Failed to retrieve identity profile', error as Error);
      throw error;
    }
  }

  async verifyEmail(identityId: Types.ObjectId): Promise<void> {
    const contextLogger = this.logger.withData({ 
      identityId: identityId.toString() 
    });

    try {
      contextLogger.info('Verifying email');

      await this.identityManagementService.verifyEmail(identityId);

      await this.auditLogger.auditSuccess('email_verified', identityId);
      contextLogger.info('Email verified successfully');

    } catch (error) {
      await this.auditLogger.auditFailure('email_verified', error as Error);
      contextLogger.error('Failed to verify email', error as Error);
      throw error;
    }
  }

  async enableMFA(identityId: Types.ObjectId): Promise<void> {
    const contextLogger = this.logger.withData({ 
      identityId: identityId.toString() 
    });

    try {
      contextLogger.info('Enabling MFA');

      await this.identityManagementService.enableMFA(identityId);

      await this.auditLogger.auditSuccess('mfa_enabled', identityId);
      contextLogger.info('MFA enabled successfully');

    } catch (error) {
      await this.auditLogger.auditFailure('mfa_enabled', error as Error);
      contextLogger.error('Failed to enable MFA', error as Error);
      throw error;
    }
  }
}


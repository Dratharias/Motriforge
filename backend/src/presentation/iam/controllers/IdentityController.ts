import { Context } from 'hono';
import { Types } from 'mongoose';
import { IdentityApplicationService } from '@/application/iam/IdentityApplicationService';
import { IAMCommandBus } from '@/infrastructure/iam/bus/IAMCommandBus';
import { IAMQueryBus } from '@/infrastructure/iam/bus/IAMQueryBus';
import { CreateIdentityCommand, UpdateIdentityCommand, GetIdentityQuery } from '@/types/iam/interfaces';
import { LoggerFactory } from '@/shared-kernel/infrastructure/logging/LoggerFactory';
import { randomUUID } from 'crypto';

export class IdentityController {
  private readonly logger = LoggerFactory.getContextualLogger('IdentityController');

  constructor(
    private readonly identityApplicationService: IdentityApplicationService,
    private readonly commandBus: IAMCommandBus,
    private readonly queryBus: IAMQueryBus
  ) {}

  async createIdentity(c: Context) {
    const correlationId = c.req.header('x-correlation-id') ?? randomUUID();
    const requestLogger = this.logger
      .withCorrelationId(correlationId)
      .withRequestId(c.req.header('x-request-id'))
      .withIpAddress(c.req.header('x-forwarded-for') || 'unknown');

    try {
      requestLogger.info('Identity creation request received');

      // Validate request body
      const body = await c.req.json();
      const { username, email, password, attributes } = body;

      if (!username || !email) {
        requestLogger.warn('Invalid request - missing required fields');
        return c.json({ 
          error: 'Username and email are required',
          code: 'VALIDATION_ERROR'
        }, 400);
      }

      // Create command
      const command: CreateIdentityCommand = {
        correlationId,
        username,
        email,
        password,
        attributes: attributes || {}
      };

      // Execute via command bus
      const identity = await this.commandBus.createIdentity(command);

      requestLogger.info('Identity created successfully', { 
        identityId: identity.id.toString() 
      });

      return c.json({
        success: true,
        data: {
          id: identity.id.toString(),
          username: identity.username.value,
          email: identity.email,
          status: identity.status,
          createdAt: identity.createdAt,
          emailVerified: identity.emailVerified,
          mfaEnabled: identity.mfaEnabled
        }
      }, 201);

    } catch (error) {
      requestLogger.error('Failed to create identity', error as Error);
      
      if ((error as Error).message.includes('already exists')) {
        return c.json({
          error: 'Identity with this username or email already exists',
          code: 'IDENTITY_EXISTS'
        }, 409);
      }

      return c.json({
        error: 'Failed to create identity',
        code: 'INTERNAL_ERROR'
      }, 500);
    }
  }

  async getIdentity(c: Context) {
    const identityId = c.req.param('id');
    const requestLogger = this.logger.withData({ identityId });

    try {
      requestLogger.debug('Get identity request received');

      if (!Types.ObjectId.isValid(identityId)) {
        return c.json({
          error: 'Invalid identity ID format',
          code: 'VALIDATION_ERROR'
        }, 400);
      }

      const query: GetIdentityQuery = {
        identityId: new Types.ObjectId(identityId)
      };

      const identity = await this.queryBus.getIdentity(query);

      if (!identity) {
        requestLogger.debug('Identity not found');
        return c.json({
          error: 'Identity not found',
          code: 'NOT_FOUND'
        }, 404);
      }

      requestLogger.debug('Identity retrieved successfully');

      return c.json({
        success: true,
        data: identity
      });

    } catch (error) {
      requestLogger.error('Failed to get identity', error as Error);
      return c.json({
        error: 'Failed to retrieve identity',
        code: 'INTERNAL_ERROR'
      }, 500);
    }
  }

  async updateIdentity(c: Context) {
    const identityId = c.req.param('id');
    const correlationId = c.req.header('x-correlation-id') ?? randomUUID();
    const requestLogger = this.logger
      .withCorrelationId(correlationId)
      .withData({ identityId });

    try {
      requestLogger.info('Update identity request received');

      if (!Types.ObjectId.isValid(identityId)) {
        return c.json({
          error: 'Invalid identity ID format',
          code: 'VALIDATION_ERROR'
        }, 400);
      }

      const body = await c.req.json();
      const { email, status, attributes } = body;

      const command: UpdateIdentityCommand = {
        correlationId,
        identityId: new Types.ObjectId(identityId),
        email,
        status,
        attributes
      };

      const updatedIdentity = await this.identityApplicationService.updateIdentity(command);

      requestLogger.info('Identity updated successfully');

      return c.json({
        success: true,
        data: {
          id: updatedIdentity.id.toString(),
          username: updatedIdentity.username.value,
          email: updatedIdentity.email,
          status: updatedIdentity.status,
          updatedAt: updatedIdentity.updatedAt,
          emailVerified: updatedIdentity.emailVerified,
          mfaEnabled: updatedIdentity.mfaEnabled
        }
      });

    } catch (error) {
      requestLogger.error('Failed to update identity', error as Error);
      
      if ((error as Error).message.includes('not found')) {
        return c.json({
          error: 'Identity not found',
          code: 'NOT_FOUND'
        }, 404);
      }

      return c.json({
        error: 'Failed to update identity',
        code: 'INTERNAL_ERROR'
      }, 500);
    }
  }

  async verifyEmail(c: Context) {
    const identityId = c.req.param('id');
    const requestLogger = this.logger.withData({ identityId });

    try {
      requestLogger.info('Email verification request received');

      if (!Types.ObjectId.isValid(identityId)) {
        return c.json({
          error: 'Invalid identity ID format',
          code: 'VALIDATION_ERROR'
        }, 400);
      }

      await this.identityApplicationService.verifyEmail(new Types.ObjectId(identityId));

      requestLogger.info('Email verified successfully');

      return c.json({
        success: true,
        message: 'Email verified successfully'
      });

    } catch (error) {
      requestLogger.error('Failed to verify email', error as Error);
      return c.json({
        error: 'Failed to verify email',
        code: 'INTERNAL_ERROR'
      }, 500);
    }
  }

  async enableMFA(c: Context) {
    const identityId = c.req.param('id');
    const requestLogger = this.logger.withData({ identityId });

    try {
      requestLogger.info('MFA enable request received');

      if (!Types.ObjectId.isValid(identityId)) {
        return c.json({
          error: 'Invalid identity ID format',
          code: 'VALIDATION_ERROR'
        }, 400);
      }

      await this.identityApplicationService.enableMFA(new Types.ObjectId(identityId));

      requestLogger.info('MFA enabled successfully');

      return c.json({
        success: true,
        message: 'MFA enabled successfully'
      });

    } catch (error) {
      requestLogger.error('Failed to enable MFA', error as Error);
      return c.json({
        error: 'Failed to enable MFA',
        code: 'INTERNAL_ERROR'
      }, 500);
    }
  }
}


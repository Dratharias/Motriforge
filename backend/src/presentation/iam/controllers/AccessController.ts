import { Context } from 'hono';
import { Types } from 'mongoose';
import { AccessApplicationService } from '@/application/iam/AccessApplicationService';
import { IAMCommandBus } from '@/infrastructure/iam/bus/IAMCommandBus';
import { IAMQueryBus } from '@/infrastructure/iam/bus/IAMQueryBus';
import { 
  AssignRoleCommand, 
  GrantPermissionCommand, 
  ValidateAccessCommand,
  CheckAccessQuery,
  GetPermissionsQuery,
  GetRolesQuery 
} from '@/types/iam/interfaces';
import { LoggerFactory } from '@/shared-kernel/infrastructure/logging/LoggerFactory';
import { randomUUID } from 'crypto';

export class AccessController {
  private readonly logger = LoggerFactory.getContextualLogger('AccessController');

  constructor(
    private readonly accessApplicationService: AccessApplicationService,
    private readonly commandBus: IAMCommandBus,
    private readonly queryBus: IAMQueryBus
  ) {}

  async assignRole(c: Context) {
    const correlationId = c.req.header('x-correlation-id') ?? randomUUID();
    const requestLogger = this.logger.withCorrelationId(correlationId);

    try {
      requestLogger.info('Role assignment request received');

      const body = await c.req.json();
      const { identityId, roleId, effectiveFrom, effectiveUntil } = body;

      if (!identityId || !roleId) {
        return c.json({
          error: 'Identity ID and Role ID are required',
          code: 'VALIDATION_ERROR'
        }, 400);
      }

      if (!Types.ObjectId.isValid(identityId) || !Types.ObjectId.isValid(roleId)) {
        return c.json({
          error: 'Invalid ID format',
          code: 'VALIDATION_ERROR'
        }, 400);
      }

      const command: AssignRoleCommand = {
        correlationId,
        identityId: new Types.ObjectId(identityId),
        roleId: new Types.ObjectId(roleId),
        effectiveFrom: effectiveFrom ? new Date(effectiveFrom) : new Date(),
        effectiveUntil: effectiveUntil ? new Date(effectiveUntil) : undefined
      };

      await this.commandBus.assignRole(command);

      requestLogger.info('Role assigned successfully');

      return c.json({
        success: true,
        message: 'Role assigned successfully'
      });

    } catch (error) {
      requestLogger.error('Failed to assign role', error as Error);
      
      if ((error as Error).message.includes('not found')) {
        return c.json({
          error: 'Identity or role not found',
          code: 'NOT_FOUND'
        }, 404);
      }

      return c.json({
        error: 'Failed to assign role',
        code: 'INTERNAL_ERROR'
      }, 500);
    }
  }

  async grantPermission(c: Context) {
    const correlationId = c.req.header('x-correlation-id') ?? randomUUID();
    const requestLogger = this.logger.withCorrelationId(correlationId);

    try {
      requestLogger.info('Permission grant request received');

      const body = await c.req.json();
      const { identityId, permissionId, conditions } = body;

      if (!identityId || !permissionId) {
        return c.json({
          error: 'Identity ID and Permission ID are required',
          code: 'VALIDATION_ERROR'
        }, 400);
      }

      if (!Types.ObjectId.isValid(identityId) || !Types.ObjectId.isValid(permissionId)) {
        return c.json({
          error: 'Invalid ID format',
          code: 'VALIDATION_ERROR'
        }, 400);
      }

      const command: GrantPermissionCommand = {
        correlationId,
        identityId: new Types.ObjectId(identityId),
        permissionId: new Types.ObjectId(permissionId),
        conditions
      };

      await this.accessApplicationService.grantPermission(command);

      requestLogger.info('Permission granted successfully');

      return c.json({
        success: true,
        message: 'Permission granted successfully'
      });

    } catch (error) {
      requestLogger.error('Failed to grant permission', error as Error);
      
      if ((error as Error).message.includes('not found')) {
        return c.json({
          error: 'Identity or permission not found',
          code: 'NOT_FOUND'
        }, 404);
      }

      return c.json({
        error: 'Failed to grant permission',
        code: 'INTERNAL_ERROR'
      }, 500);
    }
  }

  async checkAccess(c: Context) {
    const requestLogger = this.logger;

    try {
      requestLogger.debug('Access check request received');

      const { subject, resource, action, environment } = c.req.query();

      if (!subject || !resource || !action) {
        return c.json({
          error: 'Subject, resource, and action are required',
          code: 'VALIDATION_ERROR'
        }, 400);
      }

      if (!Types.ObjectId.isValid(subject)) {
        return c.json({
          error: 'Invalid subject ID format',
          code: 'VALIDATION_ERROR'
        }, 400);
      }

      const query: CheckAccessQuery = {
        subject: new Types.ObjectId(subject),
        resource,
        action,
        environment: environment ? JSON.parse(environment) : undefined
      };

      const hasAccess = await this.queryBus.checkAccess(query);

      requestLogger.debug('Access check completed', { hasAccess });

      return c.json({
        success: true,
        data: {
          hasAccess,
          subject,
          resource,
          action
        }
      });

    } catch (error) {
      requestLogger.error('Failed to check access', error as Error);
      return c.json({
        error: 'Failed to check access',
        code: 'INTERNAL_ERROR'
      }, 500);
    }
  }

  async getPermissions(c: Context) {
    const identityId = c.req.param('identityId');
    const resource = c.req.query('resource');
    const requestLogger = this.logger.withData({ identityId });

    try {
      requestLogger.debug('Get permissions request received');

      if (!Types.ObjectId.isValid(identityId)) {
        return c.json({
          error: 'Invalid identity ID format',
          code: 'VALIDATION_ERROR'
        }, 400);
      }

      const query: GetPermissionsQuery = {
        identityId: new Types.ObjectId(identityId),
        resource
      };

      const permissions = await this.accessApplicationService.getPermissions(query);

      requestLogger.debug('Permissions retrieved successfully', { 
        permissionCount: permissions.length 
      });

      return c.json({
        success: true,
        data: permissions.map(permission => ({
          id: permission.id.toString(),
          name: permission.name.value,
          resource: permission.resource,
          action: permission.action,
          description: permission.description
        }))
      });

    } catch (error) {
      requestLogger.error('Failed to get permissions', error as Error);
      return c.json({
        error: 'Failed to retrieve permissions',
        code: 'INTERNAL_ERROR'
      }, 500);
    }
  }

  async getRoles(c: Context) {
    const identityId = c.req.param('identityId');
    const requestLogger = this.logger.withData({ identityId });

    try {
      requestLogger.debug('Get roles request received');

      if (!Types.ObjectId.isValid(identityId)) {
        return c.json({
          error: 'Invalid identity ID format',
          code: 'VALIDATION_ERROR'
        }, 400);
      }

      const query: GetRolesQuery = {
        identityId: new Types.ObjectId(identityId)
      };

      const roles = await this.accessApplicationService.getRoles(query);

      requestLogger.debug('Roles retrieved successfully', { 
        roleCount: roles.length 
      });

      return c.json({
        success: true,
        data: roles.map(role => ({
          id: role.id.toString(),
          name: role.name.value,
          description: role.description,
          isSystemRole: role.isSystemRole
        }))
      });

    } catch (error) {
      requestLogger.error('Failed to get roles', error as Error);
      return c.json({
        error: 'Failed to retrieve roles',
        code: 'INTERNAL_ERROR'
      }, 500);
    }
  }

  async getAccessControlDashboard(c: Context) {
    const identityId = c.req.param('identityId');
    const requestLogger = this.logger.withData({ identityId });

    try {
      requestLogger.debug('Get access control dashboard request received');

      if (!Types.ObjectId.isValid(identityId)) {
        return c.json({
          error: 'Invalid identity ID format',
          code: 'VALIDATION_ERROR'
        }, 400);
      }

      const dashboard = await this.accessApplicationService.getAccessControlDashboard(
        new Types.ObjectId(identityId)
      );

      if (!dashboard) {
        return c.json({
          error: 'Access control not found',
          code: 'NOT_FOUND'
        }, 404);
      }

      requestLogger.debug('Access control dashboard retrieved successfully');

      return c.json({
        success: true,
        data: dashboard
      });

    } catch (error) {
      requestLogger.error('Failed to get access control dashboard', error as Error);
      return c.json({
        error: 'Failed to retrieve access control dashboard',
        code: 'INTERNAL_ERROR'
      }, 500);
    }
  }
}


import { Types } from 'mongoose';
import { IAccessControlRepository } from '@/domain/iam/ports/IAccessControlRepository';
import { IRoleRepository } from '@/domain/iam/ports/IRoleRepository';
import { IPermissionRepository } from '@/domain/iam/ports/IPermissionRepository';
import { AccessControlService } from '@/domain/iam/services/AccessControlService';
import { IAuditLogger } from '@/domain/iam/ports/IAuditLogger';
import { LoggerFactory } from '@/shared-kernel/infrastructure/logging/LoggerFactory';
import {
  AssignRoleCommand,
  GrantPermissionCommand,
  ValidateAccessCommand,
  GetPermissionsQuery,
  GetRolesQuery,
  CheckAccessQuery,
  Permission,
  Role,
  AccessControlDashboardReadModel,
  PermissionItem,
  RoleHierarchyItem
} from '@/types/iam/interfaces';

export class AccessApplicationService {
  private readonly logger = LoggerFactory.getContextualLogger('AccessApplicationService');
  private readonly auditLogger = LoggerFactory.getAuditLogger();

  constructor(
    private readonly accessControlRepository: IAccessControlRepository,
    private readonly roleRepository: IRoleRepository,
    private readonly permissionRepository: IPermissionRepository,
    private readonly accessControlService: AccessControlService,
    private readonly domainAuditLogger: IAuditLogger
  ) {}

  async assignRole(command: AssignRoleCommand): Promise<void> {
    const contextLogger = this.logger
      .withCorrelationId(command.correlationId)
      .withData({ 
        identityId: command.identityId.toString(),
        roleId: command.roleId.toString()
      });

    try {
      contextLogger.info('Assigning role to identity');

      await this.accessControlService.assignRole(
        command.identityId,
        command.roleId,
        new Types.ObjectId() // Should come from current user context
      );

      await this.auditLogger.auditSuccess('role_assigned', command.identityId.toString());
      contextLogger.info('Role assigned successfully');

    } catch (error) {
      await this.auditLogger.auditFailure('role_assigned', error as Error);
      contextLogger.error('Failed to assign role', error as Error);
      throw error;
    }
  }

  async grantPermission(command: GrantPermissionCommand): Promise<void> {
    const contextLogger = this.logger
      .withCorrelationId(command.correlationId)
      .withData({ 
        identityId: command.identityId.toString(),
        permissionId: command.permissionId.toString()
      });

    try {
      contextLogger.info('Granting permission to identity');

      await this.accessControlService.grantPermission(
        command.identityId,
        command.permissionId,
        new Types.ObjectId() // Should come from current user context
      );

      await this.auditLogger.auditSuccess('permission_granted', command.identityId.toString());
      contextLogger.info('Permission granted successfully');

    } catch (error) {
      await this.auditLogger.auditFailure('permission_granted', error as Error);
      contextLogger.error('Failed to grant permission', error as Error);
      throw error;
    }
  }

  async validateAccess(command: ValidateAccessCommand): Promise<boolean> {
    const contextLogger = this.logger
      .withCorrelationId(command.correlationId)
      .withData({ 
        subject: command.subject.toString(),
        resource: command.resource,
        action: command.action
      });

    try {
      contextLogger.debug('Validating access');

      const hasAccess = await this.accessControlService.hasPermission(
        command.subject,
        command.resource,
        command.action
      );

      await this.auditLogger.auditSecurityEvent(
        hasAccess ? 'access_granted' : 'access_denied',
        command.subject,
        {
          resource: command.resource,
          action: command.action,
          environment: command.environment
        }
      );

      contextLogger.debug('Access validation completed', { hasAccess });
      return hasAccess;

    } catch (error) {
      contextLogger.error('Failed to validate access', error as Error);
      throw error;
    }
  }

  async getPermissions(query: GetPermissionsQuery): Promise<Permission[]> {
    const contextLogger = this.logger.withData({ 
      identityId: query.identityId.toString() 
    });

    try {
      contextLogger.debug('Retrieving permissions');

      const permissions = await this.accessControlService.getEffectivePermissions(
        query.identityId
      );

      let filteredPermissions = permissions;
      if (query.resource) {
        filteredPermissions = permissions.filter(p => p.resource === query.resource);
      }

      contextLogger.debug('Permissions retrieved successfully', { 
        count: filteredPermissions.length 
      });

      return filteredPermissions;

    } catch (error) {
      contextLogger.error('Failed to retrieve permissions', error as Error);
      throw error;
    }
  }

  async getRoles(query: GetRolesQuery): Promise<Role[]> {
    const contextLogger = this.logger.withData({ 
      identityId: query.identityId.toString() 
    });

    try {
      contextLogger.debug('Retrieving roles');

      const accessControl = await this.accessControlRepository.findActiveByIdentityId(
        query.identityId
      );

      if (!accessControl) {
        return [];
      }

      const roles = await this.roleRepository.findByIds(
        Array.from(accessControl.roles)
      );

      contextLogger.debug('Roles retrieved successfully', { count: roles.length });
      return roles;

    } catch (error) {
      contextLogger.error('Failed to retrieve roles', error as Error);
      throw error;
    }
  }

  async checkAccess(query: CheckAccessQuery): Promise<boolean> {
    const contextLogger = this.logger.withData({ 
      subject: query.subject.toString(),
      resource: query.resource,
      action: query.action
    });

    try {
      contextLogger.debug('Checking access');

      const hasAccess = await this.accessControlService.hasPermission(
        query.subject,
        query.resource,
        query.action
      );

      contextLogger.debug('Access check completed', { hasAccess });
      return hasAccess;

    } catch (error) {
      contextLogger.error('Failed to check access', error as Error);
      throw error;
    }
  }

  async getAccessControlDashboard(identityId: Types.ObjectId): Promise<AccessControlDashboardReadModel | null> {
    const contextLogger = this.logger.withData({ 
      identityId: identityId.toString() 
    });

    try {
      contextLogger.debug('Retrieving access control dashboard');

      const accessControl = await this.accessControlRepository.findActiveByIdentityId(identityId);
      if (!accessControl) {
        return null;
      }

      // Get roles with hierarchy information
      const roles = await this.roleRepository.findByIds(Array.from(accessControl.roles));
      const roleHierarchy: RoleHierarchyItem[] = roles.map(role => ({
        id: role.id,
        name: role.name.value,
        level: 0, // Could be enhanced with actual hierarchy calculation
        isInherited: false
      }));

      // Get effective permissions
      const permissions = await this.accessControlService.getEffectivePermissions(identityId);
      const permissionItems: PermissionItem[] = permissions.map(permission => ({
        id: permission.id,
        name: permission.name.value,
        resource: permission.resource,
        action: permission.action,
        source: accessControl.permissions.some(p => p.equals(permission.id)) ? 'direct' : 'role'
      }));

      const dashboard: AccessControlDashboardReadModel = {
        identityId,
        accessLevel: accessControl.accessLevel,
        roles: roleHierarchy,
        permissions: permissionItems,
        restrictions: [], // Could be enhanced with actual restrictions
        lastAccess: accessControl.updatedAt
      };

      contextLogger.debug('Access control dashboard retrieved successfully');
      return dashboard;

    } catch (error) {
      contextLogger.error('Failed to retrieve access control dashboard', error as Error);
      throw error;
    }
  }
}


import { Types } from 'mongoose';
import { AccessControl } from '../entities/AccessControl';
import { IAccessControlRepository } from '../ports/IAccessControlRepository';
import { IRoleRepository } from '../ports/IRoleRepository';
import { IPermissionRepository } from '../ports/IPermissionRepository';
import { IAuditLogger } from '../ports/IAuditLogger';
import { Permission, Role, AccessLevel, EventType, RiskLevel } from '@/types/iam/interfaces';

export class AccessControlService {
  constructor(
    private readonly accessControlRepository: IAccessControlRepository,
    private readonly roleRepository: IRoleRepository,
    private readonly permissionRepository: IPermissionRepository,
    private readonly auditLogger: IAuditLogger
  ) {}

  async assignRole(
    identityId: Types.ObjectId,
    roleId: Types.ObjectId,
    assignedBy: Types.ObjectId
  ): Promise<void> {
    // Verify role exists
    const role = await this.roleRepository.findById(roleId);
    if (!role) {
      throw new Error('Role not found');
    }

    // Get or create access control
    let accessControl = await this.accessControlRepository.findByIdentityId(identityId);
    if (!accessControl) {
      accessControl = AccessControl.create(identityId);
    }

    // Assign role
    const updatedAccessControl = accessControl.assignRole(roleId);
    await this.accessControlRepository.save(updatedAccessControl);

    // Log assignment
    await this.auditLogger.logSecurityEvent(
      EventType.ROLE_ASSIGNED,
      identityId,
      { roleId: roleId.toString(), roleName: role.name.value, assignedBy: assignedBy.toString() },
      RiskLevel.LOW
    );
  }

  async revokeRole(
    identityId: Types.ObjectId,
    roleId: Types.ObjectId,
    revokedBy: Types.ObjectId
  ): Promise<void> {
    const accessControl = await this.accessControlRepository.findByIdentityId(identityId);
    if (!accessControl) {
      throw new Error('Access control not found');
    }

    const role = await this.roleRepository.findById(roleId);
    if (!role) {
      throw new Error('Role not found');
    }

    const updatedAccessControl = accessControl.revokeRole(roleId);
    await this.accessControlRepository.save(updatedAccessControl);

    await this.auditLogger.logSecurityEvent(
      EventType.ROLE_ASSIGNED, // Could add ROLE_REVOKED event type
      identityId,
      { roleId: roleId.toString(), roleName: role.name.value, revokedBy: revokedBy.toString(), action: 'revoked' },
      RiskLevel.LOW
    );
  }

  async grantPermission(
    identityId: Types.ObjectId,
    permissionId: Types.ObjectId,
    grantedBy: Types.ObjectId
  ): Promise<void> {
    const permission = await this.permissionRepository.findById(permissionId);
    if (!permission) {
      throw new Error('Permission not found');
    }

    let accessControl = await this.accessControlRepository.findByIdentityId(identityId);
    if (!accessControl) {
      accessControl = AccessControl.create(identityId);
    }

    const updatedAccessControl = accessControl.grantPermission(permissionId);
    await this.accessControlRepository.save(updatedAccessControl);

    await this.auditLogger.logSecurityEvent(
      EventType.PERMISSION_GRANTED,
      identityId,
      { 
        permissionId: permissionId.toString(), 
        permissionName: permission.name.value,
        resource: permission.resource,
        action: permission.action,
        grantedBy: grantedBy.toString() 
      },
      RiskLevel.LOW
    );
  }

  async getEffectivePermissions(identityId: Types.ObjectId): Promise<Permission[]> {
    const accessControl = await this.accessControlRepository.findActiveByIdentityId(identityId);
    if (!accessControl) {
      return [];
    }

    // Get direct permissions
    const directPermissions = await this.permissionRepository.findByIds(
      Array.from(accessControl.permissions)
    );

    // Get permissions from roles
    const roles = await this.roleRepository.findByIds(Array.from(accessControl.roles));
    const rolePermissionIds = roles.flatMap(role => Array.from(role.permissions));
    const rolePermissions = await this.permissionRepository.findByIds(rolePermissionIds);

    // Combine and deduplicate
    const allPermissions = [...directPermissions, ...rolePermissions];
    const uniquePermissions = allPermissions.filter(
      (permission, index, self) => 
        index === self.findIndex(p => p.id.equals(permission.id))
    );

    return uniquePermissions;
  }

  async hasPermission(
    identityId: Types.ObjectId,
    resource: string,
    action: string
  ): Promise<boolean> {
    const permissions = await this.getEffectivePermissions(identityId);
    
    return permissions.some(permission => 
      permission.resource === resource && 
      permission.action === action
    );
  }

  async updateAccessLevel(
    identityId: Types.ObjectId,
    accessLevel: AccessLevel,
    updatedBy: Types.ObjectId
  ): Promise<void> {
    const accessControl = await this.accessControlRepository.findByIdentityId(identityId);
    if (!accessControl) {
      throw new Error('Access control not found');
    }

    const updatedAccessControl = accessControl.updateAccessLevel(accessLevel);
    await this.accessControlRepository.save(updatedAccessControl);

    await this.auditLogger.logSecurityEvent(
      EventType.IDENTITY_UPDATED,
      identityId,
      { 
        oldAccessLevel: accessControl.accessLevel, 
        newAccessLevel: accessLevel,
        updatedBy: updatedBy.toString() 
      },
      accessLevel === AccessLevel.SUPER_ADMIN ? RiskLevel.HIGH : RiskLevel.LOW
    );
  }
}


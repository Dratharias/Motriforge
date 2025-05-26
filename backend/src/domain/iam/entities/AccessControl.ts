import { Types } from 'mongoose';
import { AccessControl as IAccessControl, AccessLevel } from '@/types/iam/interfaces';

export class AccessControl implements IAccessControl {
  constructor(
    public readonly id: Types.ObjectId,
    public readonly identityId: Types.ObjectId,
    public readonly roles: Types.ObjectId[],
    public readonly permissions: Types.ObjectId[],
    public readonly accessLevel: AccessLevel,
    public readonly effectiveFrom: Date,
    public readonly effectiveUntil: Date | undefined,
    public readonly isActive: boolean,
    public readonly createdAt: Date,
    public readonly updatedAt: Date
  ) {}

  static create(
    identityId: Types.ObjectId,
    accessLevel: AccessLevel = AccessLevel.READ,
    effectiveFrom: Date = new Date()
  ): AccessControl {
    return new AccessControl(
      new Types.ObjectId(),
      identityId,
      [],
      [],
      accessLevel,
      effectiveFrom,
      undefined,
      true,
      new Date(),
      new Date()
    );
  }

  isEffective(at: Date = new Date()): boolean {
    return this.isActive &&
           at >= this.effectiveFrom &&
           (!this.effectiveUntil || at <= this.effectiveUntil);
  }

  assignRole(roleId: Types.ObjectId): AccessControl {
    if (this.roles.some(r => r.equals(roleId))) {
      return this;
    }

    return new AccessControl(
      this.id,
      this.identityId,
      [...this.roles, roleId],
      this.permissions,
      this.accessLevel,
      this.effectiveFrom,
      this.effectiveUntil,
      this.isActive,
      this.createdAt,
      new Date()
    );
  }

  revokeRole(roleId: Types.ObjectId): AccessControl {
    return new AccessControl(
      this.id,
      this.identityId,
      this.roles.filter(r => !r.equals(roleId)),
      this.permissions,
      this.accessLevel,
      this.effectiveFrom,
      this.effectiveUntil,
      this.isActive,
      this.createdAt,
      new Date()
    );
  }

  grantPermission(permissionId: Types.ObjectId): AccessControl {
    if (this.permissions.some(p => p.equals(permissionId))) {
      return this;
    }

    return new AccessControl(
      this.id,
      this.identityId,
      this.roles,
      [...this.permissions, permissionId],
      this.accessLevel,
      this.effectiveFrom,
      this.effectiveUntil,
      this.isActive,
      this.createdAt,
      new Date()
    );
  }

  revokePermission(permissionId: Types.ObjectId): AccessControl {
    return new AccessControl(
      this.id,
      this.identityId,
      this.roles,
      this.permissions.filter(p => !p.equals(permissionId)),
      this.accessLevel,
      this.effectiveFrom,
      this.effectiveUntil,
      this.isActive,
      this.createdAt,
      new Date()
    );
  }

  updateAccessLevel(level: AccessLevel): AccessControl {
    return new AccessControl(
      this.id,
      this.identityId,
      this.roles,
      this.permissions,
      level,
      this.effectiveFrom,
      this.effectiveUntil,
      this.isActive,
      this.createdAt,
      new Date()
    );
  }

  deactivate(): AccessControl {
    return new AccessControl(
      this.id,
      this.identityId,
      this.roles,
      this.permissions,
      this.accessLevel,
      this.effectiveFrom,
      this.effectiveUntil,
      false,
      this.createdAt,
      new Date()
    );
  }
}


import { DatabaseService } from '@/database/DatabaseService';
import type { Role, Permission } from '@/shared/types/auth';

interface RoleRow {
  readonly id: string;
  readonly name: string;
  readonly display_name: string;
  readonly description: string | null;
  readonly level: number;
  readonly is_active: boolean;
}

interface PermissionRow {
  readonly id: string;
  readonly name: string;
  readonly display_name: string;
  readonly description: string | null;
  readonly resource: string;
  readonly action: string;
  readonly is_active: boolean;
}

export class RoleManager {
  constructor(private readonly db: DatabaseService) {}

  async getUserRoles(userId: string): Promise<Role[]> {
    try {
      const result = await this.db.query<RoleRow>(`
        SELECT r.id, r.name, r.display_name, r.description, r.level, r.is_active
        FROM role r
        INNER JOIN user_role ur ON r.id = ur.role_id
        WHERE ur.user_id = $1
          AND ur.is_active = true
          AND r.is_active = true
          AND (ur.expires_at IS NULL OR ur.expires_at > NOW())
      `, [userId]);

      return result.rows.map(row => {
        const role: Role = {
          id: row.id,
          name: row.name,
          displayName: row.display_name,
          level: row.level,
          isActive: row.is_active,
        };
        if (row.description) {
          return { ...role, description: row.description };
        }
        return role;
      });
    } catch (error) {
      throw new Error(`Failed to get user roles: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async getUserPermissions(userId: string): Promise<Permission[]> {
    try {
      const rolePermissions = await this.db.query<PermissionRow>(`
        SELECT DISTINCT p.id, p.name, p.display_name, p.description, p.resource, p.action, p.is_active
        FROM permission p
        INNER JOIN role_permission rp ON p.id = rp.permission_id
        INNER JOIN user_role ur ON rp.role_id = ur.role_id
        WHERE ur.user_id = $1
          AND ur.is_active = true
          AND rp.is_active = true
          AND p.is_active = true
          AND (ur.expires_at IS NULL OR ur.expires_at > NOW())
      `, [userId]);

      const directPermissions = await this.db.query<PermissionRow>(`
        SELECT DISTINCT p.id, p.name, p.display_name, p.description, p.resource, p.action, p.is_active
        FROM permission p
        INNER JOIN user_permission up ON p.id = up.permission_id
        WHERE up.user_id = $1
          AND up.is_active = true
          AND p.is_active = true
          AND (up.expires_at IS NULL OR up.expires_at > NOW())
      `, [userId]);

      const allPermissions = [...rolePermissions.rows, ...directPermissions.rows];
      const uniquePermissions = new Map<string, Permission>();

      allPermissions.forEach(row => {
        const permission: Permission = {
          id: row.id,
          name: row.name,
          displayName: row.display_name,
          resource: row.resource,
          action: row.action,
          isActive: row.is_active,
        };
        if (row.description) {
          uniquePermissions.set(row.id, { ...permission, description: row.description });
        } else {
          uniquePermissions.set(row.id, permission);
        }
      });

      return Array.from(uniquePermissions.values());
    } catch (error) {
      throw new Error(`Failed to get user permissions: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async assignRole(
    userId: string,
    roleId: string,
    assignedBy: string,
    scopeId?: string,
    scopeType?: string,
    expiresAt?: Date
  ): Promise<void> {
    try {
      await this.db.query(`
        INSERT INTO user_role (user_id, role_id, scope_id, scope_type, assigned_by, assigned_at, expires_at, is_active)
        VALUES ($1, $2, $3, $4, $5, NOW(), $6, true)
        ON CONFLICT (user_id, role_id)
        DO UPDATE SET
          is_active = true,
          assigned_by = $5,
          assigned_at = NOW(),
          expires_at = $6
      `, [userId, roleId, scopeId ?? null, scopeType ?? null, assignedBy, expiresAt ?? null]);
    } catch (error) {
      throw new Error(`Failed to assign role: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async removeRole(userId: string, roleId: string): Promise<void> {
    try {
      await this.db.query(`
        UPDATE user_role
        SET is_active = false
        WHERE user_id = $1 AND role_id = $2
      `, [userId, roleId]);
    } catch (error) {
      throw new Error(`Failed to remove role: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async grantPermission(
    userId: string,
    permissionId: string,
    grantedBy: string,
    scopeId?: string,
    scopeType?: string,
    expiresAt?: Date
  ): Promise<void> {
    try {
      await this.db.query(`
        INSERT INTO user_permission (user_id, permission_id, scope_id, scope_type, granted_by, granted_at, expires_at, is_active)
        VALUES ($1, $2, $3, $4, $5, NOW(), $6, true)
        ON CONFLICT (user_id, permission_id)
        DO UPDATE SET
          is_active = true,
          granted_by = $5,
          granted_at = NOW(),
          expires_at = $6
      `, [userId, permissionId, scopeId ?? null, scopeType ?? null, grantedBy, expiresAt ?? null]);
    } catch (error) {
      throw new Error(`Failed to grant permission: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async revokePermission(userId: string, permissionId: string): Promise<void> {
    try {
      await this.db.query(`
        UPDATE user_permission
        SET is_active = false
        WHERE user_id = $1 AND permission_id = $2
      `, [userId, permissionId]);
    } catch (error) {
      throw new Error(`Failed to revoke permission: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async getRolePermissions(roleId: string): Promise<Permission[]> {
    try {
      const result = await this.db.query<PermissionRow>(`
        SELECT p.id, p.name, p.display_name, p.description, p.resource, p.action, p.is_active
        FROM permission p
        INNER JOIN role_permission rp ON p.id = rp.permission_id
        WHERE rp.role_id = $1 AND rp.is_active = true AND p.is_active = true
      `, [roleId]);

      return result.rows.map(row => {
        const permission: Permission = {
          id: row.id,
          name: row.name,
          displayName: row.display_name,
          resource: row.resource,
          action: row.action,
          isActive: row.is_active,
        };
        if (row.description) {
          return { ...permission, description: row.description };
        }
        return permission;
      });
    } catch (error) {
      throw new Error(`Failed to get role permissions: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async hasPermission(userId: string, resource: string, action: string): Promise<boolean> {
    try {
      const result = await this.db.query<{ exists: boolean }>(`
        SELECT EXISTS(
          SELECT 1
          FROM (
            -- Role-based permissions
            SELECT p.resource, p.action
            FROM permission p
            INNER JOIN role_permission rp ON p.id = rp.permission_id
            INNER JOIN user_role ur ON rp.role_id = ur.role_id
            WHERE ur.user_id = $1
              AND ur.is_active = true
              AND rp.is_active = true
              AND p.is_active = true
              AND (ur.expires_at IS NULL OR ur.expires_at > NOW())
            UNION
            -- Direct permissions
            SELECT p.resource, p.action
            FROM permission p
            INNER JOIN user_permission up ON p.id = up.permission_id
            WHERE up.user_id = $1
              AND up.is_active = true
              AND p.is_active = true
              AND (up.expires_at IS NULL OR up.expires_at > NOW())
          ) permissions
          WHERE permissions.resource = $2 AND permissions.action = $3
        ) as exists
      `, [userId, resource, action]);

      return result.rows[0]?.exists ?? false;
    } catch (error) {
      throw new Error(`Failed to check permission: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}
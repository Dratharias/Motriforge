import { BaseRepository } from './helpers';
import { Database } from '../database/Database';
import { LoggerFacade } from '../../core/logging/LoggerFacade';
import { EventMediator } from '../../core/events/EventMediator';
import { ObjectId, Filter, Document, OptionalUnlessRequiredId } from 'mongodb';
import { EntityNotFoundError, DatabaseError } from '../../core/error/exceptions/DatabaseError';

/**
 * Role entity interface
 */
export interface IRole extends Document {
  _id?: ObjectId;
  name: string;
  description: string;
  permissions: string[];
  organizationId?: ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Permission entity interface
 */
export interface IPermission extends Document {
  _id?: ObjectId;
  name: string;
  description: string;
  resource: string;
  action: string;
  scope?: string;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * User-Role assignment interface
 */
export interface IUserRole extends Document {
  _id?: ObjectId;
  userId: ObjectId;
  roleId: ObjectId;
  organizationId?: ObjectId;
  assignedBy: ObjectId;
  assignedAt: Date;
  expiresAt?: Date;
  isActive: boolean;
}

/**
 * Role creation data
 */
export interface RoleCreationData {
  name: string;
  description: string;
  permissions?: string[];
  organizationId?: ObjectId;
}

/**
 * Role update data
 */
export interface RoleUpdateData {
  name?: string;
  description?: string;
  permissions?: string[];
}

/**
 * User permission assignment data
 */
export interface UserRoleAssignmentData {
  userId: ObjectId;
  roleId: ObjectId;
  organizationId?: ObjectId;
  assignedBy: ObjectId;
  expiresAt?: Date;
}

/**
 * Repository for managing permissions, roles, and user-role assignments
 */
export class PermissionRepository extends BaseRepository<IRole> {
  private readonly permissionCollection: string = 'permissions';
  private readonly userRoleCollection: string = 'user_roles';

  constructor(
    db: Database,
    logger: LoggerFacade,
    eventMediator?: EventMediator
  ) {
    super('roles', db, logger, eventMediator);
  }

  /**
   * Find all permissions assigned to a user (direct and through roles)
   * 
   * @param userId - User ID
   * @returns Array of permission names
   */
  public async findPermissionsByUser(userId: string | ObjectId): Promise<string[]> {
    try {
      const userObjectId = typeof userId === 'string' ? new ObjectId(userId) : userId;
      
      // Get user's roles
      const userRoles = await this.findRolesByUser(userObjectId);
      
      if (userRoles.length === 0) {
        return [];
      }
      
      // Get permissions for all roles
      const roles = await this.find({
        _id: { $in: userRoles.map(roleId => new ObjectId(roleId)) }
      } as Filter<IRole>);
      
      // Flatten and deduplicate permissions
      const permissions = new Set<string>();
      roles.forEach(role => {
        role.permissions?.forEach(permission => permissions.add(permission));
      });
      
      return Array.from(permissions);
    } catch (err) {
      this.logger.error(`Error finding permissions for user: ${userId}`, err as Error);
      throw new DatabaseError(
        'Error finding user permissions',
        'findPermissionsByUser',
        'DATABASE_ERROR',
        err as Error,
        'permissions'
      );
    }
  }

  /**
   * Find all permissions for a specific role
   * 
   * @param roleId - Role ID
   * @returns Array of permission names
   */
  public async findPermissionsByRole(roleId: string | ObjectId): Promise<string[]> {
    try {
      const role = await this.findById(roleId);
      return role.permissions ?? [];
    } catch (err) {
      if (err instanceof EntityNotFoundError) {
        throw err;
      }
      
      this.logger.error(`Error finding permissions for role: ${roleId}`, err as Error);
      throw new DatabaseError(
        'Error finding role permissions',
        'findPermissionsByRole',
        'DATABASE_ERROR',
        err as Error,
        'roles'
      );
    }
  }

  /**
   * Find all role IDs assigned to a user
   * 
   * @param userId - User ID
   * @returns Array of role IDs
   */
  public async findRolesByUser(userId: string | ObjectId): Promise<string[]> {
    try {
      const userObjectId = typeof userId === 'string' ? new ObjectId(userId) : userId;
      const userRoleCollection = this.db.getCollection<IUserRole>(this.userRoleCollection);
      
      const userRoles = await userRoleCollection.find({
        userId: userObjectId,
        isActive: true,
        $or: [
          { expiresAt: { $exists: false } },
          { expiresAt: { $gt: new Date() } }
        ]
      } as Filter<IUserRole>);
      
      return userRoles.map(userRole => userRole.roleId.toString());
    } catch (err) {
      this.logger.error(`Error finding roles for user: ${userId}`, err as Error);
      throw new DatabaseError(
        'Error finding user roles',
        'findRolesByUser',
        'DATABASE_ERROR',
        err as Error,
        this.userRoleCollection
      );
    }
  }

  /**
   * Find multiple roles by their IDs
   * 
   * @param roleIds - Array of role IDs
   * @returns Array of roles
   */
  public async findRoles(roleIds: (string | ObjectId)[]): Promise<IRole[]> {
    try {
      const objectIds = roleIds.map(id => typeof id === 'string' ? new ObjectId(id) : id);
      
      return await this.find({
        _id: { $in: objectIds }
      } as Filter<IRole>);
    } catch (err) {
      this.logger.error(`Error finding roles by IDs: ${roleIds.join(', ')}`, err as Error);
      throw new DatabaseError(
        'Error finding roles',
        'findRoles',
        'DATABASE_ERROR',
        err as Error,
        'roles'
      );
    }
  }

  /**
   * Find roles by organization
   * 
   * @param organizationId - Organization ID
   * @returns Array of roles
   */
  public async findRolesByOrganization(organizationId: string | ObjectId): Promise<IRole[]> {
    try {
      const orgObjectId = typeof organizationId === 'string' ? new ObjectId(organizationId) : organizationId;
      
      return await this.find({
        $or: [
          { organizationId: orgObjectId },
          { organizationId: { $exists: false } } // Global roles
        ]
      } as Filter<IRole>);
    } catch (err) {
      this.logger.error(`Error finding roles for organization: ${organizationId}`, err as Error);
      throw new DatabaseError(
        'Error finding organization roles',
        'findRolesByOrganization',
        'DATABASE_ERROR',
        err as Error,
        'roles'
      );
    }
  }

  /**
   * Create a new role
   * 
   * @param roleData - Role creation data
   * @returns Created role
   */
  public async createRole(roleData: RoleCreationData): Promise<IRole> {
    try {
      const now = new Date();
      
      const role: OptionalUnlessRequiredId<IRole> = {
        name: roleData.name,
        description: roleData.description,
        permissions: roleData.permissions ?? [],
        organizationId: roleData.organizationId,
        createdAt: now,
        updatedAt: now
      };

      return await this.create(role);
    } catch (err) {
      this.logger.error(`Error creating role: ${roleData.name}`, err as Error);
      throw new DatabaseError(
        'Error creating role',
        'createRole',
        'DATABASE_ERROR',
        err as Error,
        'roles'
      );
    }
  }

  /**
   * Update an existing role
   * 
   * @param roleId - Role ID
   * @param updates - Role update data
   * @returns Updated role
   */
  public async updateRole(roleId: string | ObjectId, updates: RoleUpdateData): Promise<IRole> {
    try {
      const updateData: Partial<IRole> = {
        ...updates,
        updatedAt: new Date()
      };

      return await this.update(roleId, updateData);
    } catch (err) {
      this.logger.error(`Error updating role: ${roleId}`, err as Error);
      throw new DatabaseError(
        'Error updating role',
        'updateRole',
        'DATABASE_ERROR',
        err as Error,
        'roles'
      );
    }
  }

  /**
   * Delete a role
   * 
   * @param roleId - Role ID
   * @returns True if deleted successfully
   */
  public async deleteRole(roleId: string | ObjectId): Promise<void> {
    try {
      const objectId = typeof roleId === 'string' ? new ObjectId(roleId) : roleId;
      
      // Check if role is assigned to any users
      const userRoleCollection = this.db.getCollection<IUserRole>(this.userRoleCollection);
      const assignmentCount = await userRoleCollection.countDocuments({
        roleId: objectId,
        isActive: true
      } as Filter<IUserRole>);
      
      if (assignmentCount > 0) {
        throw new DatabaseError(
          'Cannot delete role that is assigned to users',
          'deleteRole',
          'ROLE_IN_USE',
          undefined,
          'roles'
        );
      }
      
      const deleted = await this.delete(roleId);
      
      if (!deleted) {
        throw new EntityNotFoundError('Role', objectId.toString());
      }
    } catch (err) {
      if (err instanceof EntityNotFoundError || err instanceof DatabaseError) {
        throw err;
      }
      
      this.logger.error(`Error deleting role: ${roleId}`, err as Error);
      throw new DatabaseError(
        'Error deleting role',
        'deleteRole',
        'DATABASE_ERROR',
        err as Error,
        'roles'
      );
    }
  }

  /**
   * Assign a role to a user
   * 
   * @param assignmentData - User role assignment data
   * @returns Created user-role assignment
   */
  public async assignRole(assignmentData: UserRoleAssignmentData): Promise<IUserRole> {
    try {
      const userRoleCollection = this.db.getCollection<IUserRole>(this.userRoleCollection);
      const now = new Date();
      
      // Check if assignment already exists
      const existingAssignment = await userRoleCollection.findOne({
        userId: assignmentData.userId,
        roleId: assignmentData.roleId,
        organizationId: assignmentData.organizationId,
        isActive: true
      } as Filter<IUserRole>);
      
      if (existingAssignment) {
        throw new DatabaseError(
          'Role already assigned to user',
          'assignRole',
          'ROLE_ALREADY_ASSIGNED',
          undefined,
          this.userRoleCollection
        );
      }
      
      const userRole: OptionalUnlessRequiredId<IUserRole> = {
        userId: assignmentData.userId,
        roleId: assignmentData.roleId,
        organizationId: assignmentData.organizationId,
        assignedBy: assignmentData.assignedBy,
        assignedAt: now,
        expiresAt: assignmentData.expiresAt,
        isActive: true
      };
      
      const result = await userRoleCollection.insertOne(userRole);
      
      return {
        ...userRole,
        _id: result.insertedId
      } as IUserRole;
    } catch (err) {
      if (err instanceof DatabaseError) {
        throw err;
      }
      
      this.logger.error(`Error assigning role to user`, err as Error, {
        userId: assignmentData.userId.toString(),
        roleId: assignmentData.roleId.toString()
      });
      throw new DatabaseError(
        'Error assigning role to user',
        'assignRole',
        'DATABASE_ERROR',
        err as Error,
        this.userRoleCollection
      );
    }
  }

  /**
   * Remove a role assignment from a user
   * 
   * @param userId - User ID
   * @param roleId - Role ID
   * @param organizationId - Optional organization ID
   * @returns True if removed successfully
   */
  public async removeRole(
    userId: string | ObjectId, 
    roleId: string | ObjectId, 
    organizationId?: string | ObjectId
  ): Promise<void> {
    try {
      const userObjectId = typeof userId === 'string' ? new ObjectId(userId) : userId;
      const roleObjectId = typeof roleId === 'string' ? new ObjectId(roleId) : roleId;
      const orgObjectId = organizationId 
        ? (typeof organizationId === 'string' ? new ObjectId(organizationId) : organizationId)
        : undefined;
      
      const userRoleCollection = this.db.getCollection<IUserRole>(this.userRoleCollection);
      
      const filter: Filter<IUserRole> = {
        userId: userObjectId,
        roleId: roleObjectId,
        isActive: true
      };
      
      if (orgObjectId) {
        filter.organizationId = orgObjectId;
      }
      
      const result = await userRoleCollection.updateOne(
        filter,
        {
          $set: {
            isActive: false,
            updatedAt: new Date()
          }
        }
      );
      
      if (result.matchedCount === 0) {
        throw new EntityNotFoundError('UserRole', `${userId}-${roleId}`);
      }
    } catch (err) {
      if (err instanceof EntityNotFoundError) {
        throw err;
      }
      
      this.logger.error(`Error removing role from user`, err as Error, {
        userId: userId.toString(),
        roleId: roleId.toString()
      });
      throw new DatabaseError(
        'Error removing role from user',
        'removeRole',
        'DATABASE_ERROR',
        err as Error,
        this.userRoleCollection
      );
    }
  }

  /**
   * Add a permission to a role
   * 
   * @param roleId - Role ID
   * @param permission - Permission name
   * @returns Updated role
   */
  public async addPermission(roleId: string | ObjectId, permission: string): Promise<IRole> {
    try {
      const role = await this.findById(roleId);
      
      if (role.permissions?.includes(permission)) {
        return role; // Permission already exists
      }
      
      const permissions = [...(role.permissions ?? []), permission];
      
      return await this.update(roleId, { permissions });
    } catch (err) {
      this.logger.error(`Error adding permission to role`, err as Error, {
        roleId: roleId.toString(),
        permission
      });
      throw new DatabaseError(
        'Error adding permission to role',
        'addPermission',
        'DATABASE_ERROR',
        err as Error,
        'roles'
      );
    }
  }

  /**
   * Remove a permission from a role
   * 
   * @param roleId - Role ID
   * @param permission - Permission name
   * @returns Updated role
   */
  public async removePermission(roleId: string | ObjectId, permission: string): Promise<IRole> {
    try {
      const role = await this.findById(roleId);
      
      const permissions = (role.permissions ?? []).filter(p => p !== permission);
      
      return await this.update(roleId, { permissions });
    } catch (err) {
      this.logger.error(`Error removing permission from role`, err as Error, {
        roleId: roleId.toString(),
        permission
      });
      throw new DatabaseError(
        'Error removing permission from role',
        'removePermission',
        'DATABASE_ERROR',
        err as Error,
        'roles'
      );
    }
  }

  /**
   * Check if a user has a specific permission
   * 
   * @param userId - User ID
   * @param permission - Permission name
   * @param organizationId - Optional organization context
   * @returns True if user has permission
   */
  public async hasPermission(
    userId: string | ObjectId, 
    permission: string, 
    organizationId?: string | ObjectId
  ): Promise<boolean> {
    try {
      const userPermissions = await this.findPermissionsByUser(userId);
      return userPermissions.includes(permission);
    } catch (err) {
      this.logger.error(`Error checking user permission`, err as Error, {
        userId: userId.toString(),
        permission
      });
      return false; // Fail safe - deny access on error
    }
  }

  /**
   * Get all available permissions in the system
   * 
   * @returns Array of permission objects
   */
  public async getAllPermissions(): Promise<IPermission[]> {
    try {
      const permissionCollection = this.db.getCollection<IPermission>(this.permissionCollection);
      return await permissionCollection.find({});
    } catch (err) {
      this.logger.error('Error getting all permissions', err as Error);
      throw new DatabaseError(
        'Error getting all permissions',
        'getAllPermissions',
        'DATABASE_ERROR',
        err as Error,
        this.permissionCollection
      );
    }
  }

  /**
   * Validate role data
   */
  protected override validateData(data: any, isUpdate: boolean = false): void {
    if (!isUpdate) {
      if (!data.name?.trim()) {
        throw new DatabaseError(
          'Role name is required',
          'validateData',
          'VALIDATION_ERROR'
        );
      }
    }
    
    if (data.name !== undefined && !data.name?.trim()) {
      throw new DatabaseError(
        'Role name cannot be empty',
        'validateData',
        'VALIDATION_ERROR'
      );
    }
    
    if (data.permissions && !Array.isArray(data.permissions)) {
      throw new DatabaseError(
        'Permissions must be an array',
        'validateData',
        'VALIDATION_ERROR'
      );
    }
  }
}
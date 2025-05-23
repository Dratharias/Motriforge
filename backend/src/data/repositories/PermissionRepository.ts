import { Model, Types } from 'mongoose';
import { LoggerFacade } from '@/core/logging';
import { EventMediator } from '@/core/events/EventMediator';
import { CacheFacade } from '@/core/cache/facade/CacheFacade';
import { IRole } from '@/types/models';
import { IPermissionRepository } from '@/types/repositories';
import { ValidationResult, RepositoryContext } from '@/types/repositories/base';
import { BaseRepository } from './BaseRepository';
import { ValidationHelpers } from './helpers';

/**
 * Repository for permission and role operations with enhanced validation and caching
 */
export class PermissionRepository extends BaseRepository<IRole> implements IPermissionRepository {
  private static readonly CACHE_TTL = 900; // 15 minutes
  private static readonly PERMISSION_CACHE_TTL = 1800; // 30 minutes for permission data

  constructor(
    roleModel: Model<IRole>,
    logger: LoggerFacade,
    eventMediator: EventMediator,
    cache?: CacheFacade
  ) {
    super(roleModel, logger, eventMediator, cache, 'PermissionRepository');
  }

  /**
   * Find permissions by user ID
   */
  public async findPermissionsByUser(userId: Types.ObjectId): Promise<string[]> {
    const cacheKey = this.cacheHelpers.generateCustomKey('user_permissions', { 
      userId: userId.toString() 
    });
    
    const cached = await this.cacheHelpers.getCustom<string[]>(cacheKey);
    if (cached) {
      return cached;
    }

    try {
      this.logger.debug('Finding permissions by user', { userId: userId.toString() });
      
      // Aggregate to get all permissions for user's roles
      const result = await this.crudOps.aggregate<{ permissions: string[] }>([
        {
          $lookup: {
            from: 'users',
            localField: '_id',
            foreignField: 'role',
            as: 'users'
          }
        },
        {
          $match: {
            'users._id': userId
          }
        },
        {
          $project: {
            permissions: 1
          }
        }
      ]);

      const permissions = result.flatMap(role => role.permissions ?? []);
      const uniquePermissions = [...new Set(permissions)];

      if (this.cacheHelpers.isEnabled) {
        await this.cacheHelpers.setCustom(
          cacheKey, 
          uniquePermissions, 
          PermissionRepository.PERMISSION_CACHE_TTL
        );
      }

      return uniquePermissions;
    } catch (error) {
      this.logger.error('Error finding permissions by user', error as Error, { 
        userId: userId.toString() 
      });
      throw error;
    }
  }

  /**
   * Find permissions by role ID
   */
  public async findPermissionsByRole(roleId: Types.ObjectId): Promise<string[]> {
    const cacheKey = this.cacheHelpers.generateCustomKey('role_permissions', { 
      roleId: roleId.toString() 
    });
    
    const cached = await this.cacheHelpers.getCustom<string[]>(cacheKey);
    if (cached) {
      return cached;
    }

    try {
      this.logger.debug('Finding permissions by role', { roleId: roleId.toString() });
      
      const role = await this.findById(roleId);
      const permissions = role?.permissions ?? [];

      if (this.cacheHelpers.isEnabled) {
        await this.cacheHelpers.setCustom(
          cacheKey, 
          permissions, 
          PermissionRepository.PERMISSION_CACHE_TTL
        );
      }

      return permissions;
    } catch (error) {
      this.logger.error('Error finding permissions by role', error as Error, { 
        roleId: roleId.toString() 
      });
      throw error;
    }
  }

  /**
   * Find roles by user ID
   */
  public async findRolesByUser(userId: Types.ObjectId): Promise<string[]> {
    const cacheKey = this.cacheHelpers.generateCustomKey('user_roles', { 
      userId: userId.toString() 
    });
    
    const cached = await this.cacheHelpers.getCustom<string[]>(cacheKey);
    if (cached) {
      return cached;
    }

    try {
      this.logger.debug('Finding roles by user', { userId: userId.toString() });
      
      // Aggregate to get user's role and organization roles
      const result = await this.crudOps.aggregate<{ name: string }>([
        {
          $lookup: {
            from: 'users',
            localField: '_id',
            foreignField: 'role',
            as: 'directUsers'
          }
        },
        {
          $lookup: {
            from: 'users',
            let: { roleId: '$_id' },
            pipeline: [
              {
                $match: {
                  _id: userId,
                  'organizations.role': '$$roleId'
                }
              }
            ],
            as: 'orgUsers'
          }
        },
        {
          $match: {
            $or: [
              { 'directUsers._id': userId },
              { orgUsers: { $ne: [] } }
            ]
          }
        },
        {
          $project: {
            name: 1
          }
        }
      ]);

      const roleNames = result.map(role => role.name);

      if (this.cacheHelpers.isEnabled) {
        await this.cacheHelpers.setCustom(cacheKey, roleNames, PermissionRepository.CACHE_TTL);
      }

      return roleNames;
    } catch (error) {
      this.logger.error('Error finding roles by user', error as Error, { 
        userId: userId.toString() 
      });
      throw error;
    }
  }

  /**
   * Find role by ID
   */
  public async findRole(roleId: Types.ObjectId): Promise<IRole | null> {
    return this.findById(roleId);
  }

  /**
   * Find multiple roles by IDs
   */
  public async findRoles(roleIds: (Types.ObjectId)[]): Promise<IRole[]> {
    const cacheKey = this.cacheHelpers.generateCustomKey('multiple_roles', { 
      roleIds: roleIds.map(id => id.toString()).sort((a, b) => a.localeCompare(b)) 
    });
    
    const cached = await this.cacheHelpers.getCustom<IRole[]>(cacheKey);
    if (cached) {
      return cached.map(role => this.mapToEntity(role));
    }

    try {
      this.logger.debug('Finding multiple roles', { roleCount: roleIds.length });
      
      const objectIds = roleIds.map(id => id);
      const roles = await this.crudOps.find({
        _id: { $in: objectIds }
      });

      if (this.cacheHelpers.isEnabled) {
        await this.cacheHelpers.setCustom(cacheKey, roles, PermissionRepository.CACHE_TTL);
      }

      return roles.map(role => this.mapToEntity(role));
    } catch (error) {
      this.logger.error('Error finding multiple roles', error as Error, { 
        roleCount: roleIds.length 
      });
      throw error;
    }
  }

  /**
   * Assign role to user
   */
  public async assignRole(userId: Types.ObjectId, roleId: Types.ObjectId): Promise<void> {
    try {
      this.logger.debug('Assigning role to user', { 
        userId: userId.toString(),
        roleId: roleId.toString() 
      });

      // This would typically be handled by UserRepository, but we'll emit an event
      await this.publishEvent('role.assigned', {
        userId: userId.toString(),
        roleId: roleId.toString(),
        timestamp: new Date()
      });

      // Invalidate user permission caches
      if (this.cacheHelpers.isEnabled) {
        await this.cacheHelpers.invalidateByPattern('user_permissions:*');
        await this.cacheHelpers.invalidateByPattern('user_roles:*');
      }
    } catch (error) {
      this.logger.error('Error assigning role to user', error as Error, { 
        userId: userId.toString(),
        roleId: roleId.toString() 
      });
      throw error;
    }
  }

  /**
   * Remove role from user
   */
  public async removeRole(userId: Types.ObjectId, roleId: Types.ObjectId): Promise<void> {
    try {
      this.logger.debug('Removing role from user', { 
        userId: userId.toString(),
        roleId: roleId.toString() 
      });

      await this.publishEvent('role.removed', {
        userId: userId.toString(),
        roleId: roleId.toString(),
        timestamp: new Date()
      });

      // Invalidate user permission caches
      if (this.cacheHelpers.isEnabled) {
        await this.cacheHelpers.invalidateByPattern('user_permissions:*');
        await this.cacheHelpers.invalidateByPattern('user_roles:*');
      }
    } catch (error) {
      this.logger.error('Error removing role from user', error as Error, { 
        userId: userId.toString(),
        roleId: roleId.toString() 
      });
      throw error;
    }
  }

  /**
   * Add permission to role
   */
  public async addPermission(roleId: Types.ObjectId, permission: string): Promise<void> {
    try {
      this.logger.debug('Adding permission to role', { 
        roleId: roleId.toString(),
        permission 
      });

      const result = await this.crudOps.update(roleId, {
        $addToSet: { permissions: permission }
      });

      if (result && this.cacheHelpers.isEnabled) {
        await this.cacheHelpers.invalidateAfterUpdate(roleId, result);
        await this.cacheHelpers.invalidateByPattern('*_permissions:*');
        await this.cacheHelpers.invalidateByPattern('multiple_roles:*');
      }

      if (result) {
        await this.publishEvent('permission.added', {
          roleId: roleId.toString(),
          permission,
          timestamp: new Date()
        });
      }
    } catch (error) {
      this.logger.error('Error adding permission to role', error as Error, { 
        roleId: roleId.toString(),
        permission 
      });
      throw error;
    }
  }

  /**
   * Remove permission from role
   */
  public async removePermission(roleId: Types.ObjectId, permission: string): Promise<void> {
    try {
      this.logger.debug('Removing permission from role', { 
        roleId: roleId.toString(),
        permission 
      });

      const result = await this.crudOps.update(roleId, {
        $pull: { permissions: permission }
      });

      if (result && this.cacheHelpers.isEnabled) {
        await this.cacheHelpers.invalidateAfterUpdate(roleId, result);
        await this.cacheHelpers.invalidateByPattern('*_permissions:*');
        await this.cacheHelpers.invalidateByPattern('multiple_roles:*');
      }

      if (result) {
        await this.publishEvent('permission.removed', {
          roleId: roleId.toString(),
          permission,
          timestamp: new Date()
        });
      }
    } catch (error) {
      this.logger.error('Error removing permission from role', error as Error, { 
        roleId: roleId.toString(),
        permission 
      });
      throw error;
    }
  }

  /**
   * Check if user has permission
   */
  public async hasPermission(userId: Types.ObjectId, permission: string): Promise<boolean> {
    try {
      this.logger.debug('Checking if user has permission', { 
        userId: userId.toString(),
        permission 
      });

      const userPermissions = await this.findPermissionsByUser(userId);
      return userPermissions.includes(permission);
    } catch (error) {
      this.logger.error('Error checking user permission', error as Error, { 
        userId: userId.toString(),
        permission 
      });
      throw error;
    }
  }

  /**
   * Find system roles (no organization constraint)
   */
  public async findSystemRoles(): Promise<IRole[]> {
    const cacheKey = this.cacheHelpers.generateCustomKey('system_roles', {});
    
    const cached = await this.cacheHelpers.getCustom<IRole[]>(cacheKey);
    if (cached) {
      return cached.map(role => this.mapToEntity(role));
    }

    try {
      this.logger.debug('Finding system roles');
      
      const roles = await this.crudOps.find({
        organizationId: { $exists: false }
      }, {
        sort: [{ field: 'name', direction: 'asc' }]
      });

      if (this.cacheHelpers.isEnabled) {
        await this.cacheHelpers.setCustom(cacheKey, roles, PermissionRepository.CACHE_TTL);
      }

      return roles.map(role => this.mapToEntity(role));
    } catch (error) {
      this.logger.error('Error finding system roles', error as Error);
      throw error;
    }
  }

  /**
   * Find organization roles
   */
  public async findOrganizationRoles(organizationId: Types.ObjectId): Promise<IRole[]> {
    const cacheKey = this.cacheHelpers.generateCustomKey('org_roles', { 
      organizationId: organizationId.toString() 
    });
    
    const cached = await this.cacheHelpers.getCustom<IRole[]>(cacheKey);
    if (cached) {
      return cached.map(role => this.mapToEntity(role));
    }

    try {
      this.logger.debug('Finding organization roles', { 
        organizationId: organizationId.toString() 
      });
      
      const roles = await this.crudOps.find({
        organizationId: organizationId
      }, {
        sort: [{ field: 'name', direction: 'asc' }]
      });

      if (this.cacheHelpers.isEnabled) {
        await this.cacheHelpers.setCustom(cacheKey, roles, PermissionRepository.CACHE_TTL);
      }

      return roles.map(role => this.mapToEntity(role));
    } catch (error) {
      this.logger.error('Error finding organization roles', error as Error, { 
        organizationId: organizationId.toString() 
      });
      throw error;
    }
  }

  /**
   * Override create to handle role-specific logic
   */
  public async create(data: Partial<IRole>, context?: RepositoryContext): Promise<IRole> {
    // Set default values
    const roleData: Partial<IRole> = {
      ...data,
      permissions: data.permissions ?? []
    };

    const role = await super.create(roleData, context);

    // Publish role creation event
    await this.publishEvent('role.created', {
      roleId: role._id.toString(),
      name: role.name,
      organizationId: role.organizationId?.toString(),
      permissions: role.permissions,
      timestamp: new Date()
    });

    return role;
  }

  /**
   * Override update to invalidate permission caches
   */
  public async update(
    id: Types.ObjectId, 
    data: Partial<IRole>, 
    context?: RepositoryContext
  ): Promise<IRole | null> {
    const result = await super.update(id, data, context);

    if (result && this.cacheHelpers.isEnabled) {
      // Invalidate all permission-related caches since role changed
      await this.cacheHelpers.invalidateByPattern('*_permissions:*');
      await this.cacheHelpers.invalidateByPattern('*_roles:*');
    }

    return result;
  }

  /**
   * Validate role data
   */
  protected validateData(data: Partial<IRole>): ValidationResult {
    const errors: string[] = [];

    // Name validation
    if (data.name !== undefined) {
      const nameValidation = ValidationHelpers.validateFieldLength(
        data.name, 
        'name', 
        2, 
        50
      );
      if (!nameValidation.valid) {
        errors.push(...nameValidation.errors);
      }
    }

    // Description validation
    if (data.description !== undefined && data.description.length > 200) {
      errors.push('Description must be less than 200 characters');
    }

    // Permissions validation
    if (data.permissions) {
      if (!Array.isArray(data.permissions)) {
        errors.push('Permissions must be an array');
      } else {
        data.permissions.forEach((permission, index) => {
          if (typeof permission !== 'string' || permission.length === 0) {
            errors.push(`Permission at index ${index} must be a non-empty string`);
          }
        });
      }
    }

    return {
      valid: errors.length === 0,
      errors: errors.length > 0 ? errors : undefined
    };
  }

  /**
   * Map database document to domain entity
   */
  protected mapToEntity(data: any): IRole {
    return {
      _id: data._id,
      name: data.name,
      description: data.description ?? '',
      permissions: data.permissions ?? [],
      organizationId: data.organizationId,
      createdAt: data.createdAt,
      updatedAt: data.updatedAt
    } as IRole;
  }

  /**
   * Map domain entity to database document
   */
  protected mapFromEntity(entity: IRole): any {
    const doc = { ...entity };
    
    // Remove any computed fields
    delete (doc as any).__v;
    
    return doc;
  }
}
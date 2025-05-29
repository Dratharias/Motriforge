import { Types } from 'mongoose';
import { MongoRepository } from '../../database/MongoRepository';
import { Role, ResourceType, Action } from '../../../types/core/enums';
import { IPermissionRepository, IPermissionSet } from '../core/interfaces';
import { IResourcePermission } from '../../../types/core/interfaces';
import { PermissionSet } from '../core/PermissionSet';

export interface PermissionSetDocument {
  _id: Types.ObjectId;
  role: Role;
  permissions: Array<{
    resource: ResourceType;
    actions: Action[];
    conditions?: Record<string, unknown>;
  }>;
  description: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  createdBy?: Types.ObjectId;
  version: number;
}

export class MongoPermissionRepository 
  extends MongoRepository<PermissionSetDocument> 
  implements IPermissionRepository {
  
  constructor() {
    super('permission_sets');
  }

  protected async ensureIndexes(): Promise<void> {
    try {
      // Create indexes for efficient queries
      await this.collection.createIndex({ role: 1 }, { unique: true });
      await this.collection.createIndex({ isActive: 1 });
      await this.collection.createIndex({ createdAt: 1 });
      
      console.log('Permission repository indexes created successfully');
    } catch (error) {
      console.error('Error creating permission repository indexes:', error);
    }
  }

  async findByRole(role: Role): Promise<IPermissionSet | null> {
    try {
      const doc = await this.findOne({ 
        role, 
        isActive: true 
      });
      
      return doc ? this.mapToPermissionSet(doc) : null;
    } catch (error) {
      console.error(`Error finding permissions for role ${role}:`, error);
      return null;
    }
  }

  async create(permissionSet: IPermissionSet): Promise<IPermissionSet> {
    try {
      // Check if permissions for this role already exist
      const existing = await this.findByRole(permissionSet.role);
      if (existing) {
        throw new Error(`Permissions for role ${permissionSet.role} already exist`);
      }

      const doc: Partial<PermissionSetDocument> = {
        _id: permissionSet.id,
        role: permissionSet.role,
        permissions: permissionSet.permissions.map(p => ({
          resource: p.resource,
          actions: [...p.actions], // Create copy to avoid readonly issues
          conditions: p.conditions
        })),
        description: permissionSet.description,
        isActive: permissionSet.isActive,
        createdAt: new Date(),
        updatedAt: new Date(),
        version: 1
      };

      const created = await this.insertOne(doc);
      return this.mapToPermissionSet(created);
    } catch (error) {
      console.error('Error creating permission set:', error);
      throw error;
    }
  }

  async update(id: Types.ObjectId, updates: Partial<IPermissionSet>): Promise<IPermissionSet | null> {
    try {
      const updateDoc: Partial<PermissionSetDocument> = {
        updatedAt: new Date()
      };
      
      if (updates.permissions) {
        updateDoc.permissions = updates.permissions.map(p => ({
          resource: p.resource,
          actions: [...p.actions],
          conditions: p.conditions
        }));
      }
      
      if (updates.description !== undefined) {
        updateDoc.description = updates.description;
      }
      
      if (updates.isActive !== undefined) {
        updateDoc.isActive = updates.isActive;
      }

      // Increment version
      const updated = await this.findOneAndUpdate(
        { _id: id }, 
        { 
          $set: updateDoc,
          $inc: { version: 1 }
        }
      );

      return updated ? this.mapToPermissionSet(updated) : null;
    } catch (error) {
      console.error(`Error updating permission set ${id}:`, error);
      throw error;
    }
  }

  async findById(id: Types.ObjectId): Promise<IPermissionSet | null> {
    try {
      const doc = await this.findOne({ _id: id });
      return doc ? this.mapToPermissionSet(doc) : null;
    } catch (error) {
      console.error(`Error finding permission set by id ${id}:`, error);
      return null;
    }
  }

  async findAll(): Promise<readonly IPermissionSet[]> {
    try {
      const docs = await this.find({});
      return docs.map(doc => this.mapToPermissionSet(doc));
    } catch (error) {
      console.error('Error finding all permission sets:', error);
      return [];
    }
  }

  async findActive(): Promise<readonly IPermissionSet[]> {
    try {
      const docs = await this.find({ isActive: true });
      return docs.map(doc => this.mapToPermissionSet(doc));
    } catch (error) {
      console.error('Error finding active permission sets:', error);
      return [];
    }
  }

  async delete(id: Types.ObjectId): Promise<boolean> {
    try {
      return await this.deleteOne({ _id: id });
    } catch (error) {
      console.error(`Error deleting permission set ${id}:`, error);
      return false;
    }
  }

  async isRolePermissionExists(role: Role): Promise<boolean> {
    try {
      const count = await this.count({ role });
      return count > 0;
    } catch (error) {
      console.error(`Error checking if role ${role} permissions exist:`, error);
      return false;
    }
  }

  async deactivateRole(role: Role): Promise<boolean> {
    try {
      const updated = await this.findOneAndUpdate(
        { role },
        { 
          $set: { 
            isActive: false, 
            updatedAt: new Date() 
          },
          $inc: { version: 1 }
        }
      );
      return updated !== null;
    } catch (error) {
      console.error(`Error deactivating permissions for role ${role}:`, error);
      return false;
    }
  }

  private mapToPermissionSet(doc: PermissionSetDocument): IPermissionSet {
    const permissions: IResourcePermission[] = doc.permissions.map(p => ({
      resource: p.resource,
      actions: p.actions as readonly Action[],
      conditions: p.conditions
    }));

    return new PermissionSet({
      id: doc._id,
      role: doc.role,
      permissions,
      description: doc.description,
      isActive: doc.isActive,
      createdBy: doc.createdBy
    });
  }
}


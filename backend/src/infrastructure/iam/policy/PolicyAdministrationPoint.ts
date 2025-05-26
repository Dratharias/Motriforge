
import { Types } from 'mongoose';
import { Policy } from '@/types/iam/interfaces';
import { LoggerFactory } from '@/shared-kernel/infrastructure/logging/factory/LoggerFactory';
import { PolicyDocument } from '../repositories/types/DocumentInterfaces';
import { IPolicyModel } from '../repositories/types/ModelInterfaces';

export class PolicyAdministrationPoint {
  private readonly logger = LoggerFactory.getContextualLogger('PolicyAdministrationPoint');

  constructor(private readonly policyModel: IPolicyModel) {}

  async createPolicy(policy: Omit<Policy, 'id' | 'createdAt' | 'updatedAt'>): Promise<Policy> {
    try {
      this.logger.info('Creating policy', { name: policy.name });

      const doc = await this.policyModel.create({
        ...policy,
        createdAt: new Date(),
        updatedAt: new Date()
      });

      const createdPolicy = this.toDomain(doc);
      
      this.logger.info('Policy created successfully', { 
        policyId: createdPolicy.id.toString() 
      });

      return createdPolicy;

    } catch (error) {
      this.logger.error('Failed to create policy', error as Error);
      throw error;
    }
  }

  async updatePolicy(policyId: Types.ObjectId, updates: Partial<Policy>): Promise<Policy | null> {
    try {
      this.logger.info('Updating policy', { policyId: policyId.toString() });

      const doc = await this.policyModel.findByIdAndUpdate(
        policyId,
        { ...updates, updatedAt: new Date() },
        { new: true }
      );

      if (!doc) {
        this.logger.warn('Policy not found for update', { 
          policyId: policyId.toString() 
        });
        return null;
      }

      const updatedPolicy = this.toDomain(doc);
      
      this.logger.info('Policy updated successfully', { 
        policyId: updatedPolicy.id.toString() 
      });

      return updatedPolicy;

    } catch (error) {
      this.logger.error('Failed to update policy', error as Error);
      throw error;
    }
  }

  async deletePolicy(policyId: Types.ObjectId): Promise<boolean> {
    try {
      this.logger.info('Deleting policy', { policyId: policyId.toString() });

      const result = await this.policyModel.findByIdAndDelete(policyId);
      
      if (result) {
        this.logger.info('Policy deleted successfully', { 
          policyId: policyId.toString() 
        });
        return true;
      } else {
        this.logger.warn('Policy not found for deletion', { 
          policyId: policyId.toString() 
        });
        return false;
      }

    } catch (error) {
      this.logger.error('Failed to delete policy', error as Error);
      throw error;
    }
  }

  async getPolicy(policyId: Types.ObjectId): Promise<Policy | null> {
    try {
      const doc = await this.policyModel.findById(policyId);
      return doc ? this.toDomain(doc) : null;
    } catch (error) {
      this.logger.error('Failed to retrieve policy', error as Error);
      throw error;
    }
  }

  async getAllPolicies(): Promise<Policy[]> {
    try {
      const docs = await this.policyModel.find().sort({ priority: -1, name: 1 });
      return docs.map(doc => this.toDomain(doc));
    } catch (error) {
      this.logger.error('Failed to retrieve all policies', error as Error);
      throw error;
    }
  }

  async getActivePolicies(): Promise<Policy[]> {
    try {
      const docs = await this.policyModel
        .find({ isActive: true })
        .sort({ priority: -1, name: 1 });
      return docs.map(doc => this.toDomain(doc));
    } catch (error) {
      this.logger.error('Failed to retrieve active policies', error as Error);
      throw error;
    }
  }

  async activatePolicy(policyId: Types.ObjectId): Promise<boolean> {
    try {
      this.logger.info('Activating policy', { policyId: policyId.toString() });

      const result = await this.policyModel.findByIdAndUpdate(
        policyId,
        { isActive: true, updatedAt: new Date() }
      );

      const success = result !== null;
      
      if (success) {
        this.logger.info('Policy activated successfully', { 
          policyId: policyId.toString() 
        });
      } else {
        this.logger.warn('Policy not found for activation', { 
          policyId: policyId.toString() 
        });
      }

      return success;

    } catch (error) {
      this.logger.error('Failed to activate policy', error as Error);
      throw error;
    }
  }

  async deactivatePolicy(policyId: Types.ObjectId): Promise<boolean> {
    try {
      this.logger.info('Deactivating policy', { policyId: policyId.toString() });

      const result = await this.policyModel.findByIdAndUpdate(
        policyId,
        { isActive: false, updatedAt: new Date() }
      );

      const success = result !== null;
      
      if (success) {
        this.logger.info('Policy deactivated successfully', { 
          policyId: policyId.toString() 
        });
      } else {
        this.logger.warn('Policy not found for deactivation', { 
          policyId: policyId.toString() 
        });
      }

      return success;

    } catch (error) {
      this.logger.error('Failed to deactivate policy', error as Error);
      throw error;
    }
  }

  private toDomain(doc: PolicyDocument): Policy {
    return {
      id: doc._id,
      name: doc.name,
      description: doc.description,
      target: doc.target,
      rules: doc.rules,
      isActive: doc.isActive,
      priority: doc.priority,
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt
    };
  }
}
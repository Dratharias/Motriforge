
import { Types } from 'mongoose';
import { 
  PolicyRequest, 
  Policy, 
  PolicyTarget 
} from '@/types/iam/interfaces';
import { LoggerFactory } from '@/shared-kernel/infrastructure/logging/factory/LoggerFactory';
import { PolicyDocument } from '../repositories/types/DocumentInterfaces';
import { IPolicyModel } from '../repositories/types/ModelInterfaces';

export class PolicyInformationPoint {
  private readonly logger = LoggerFactory.getContextualLogger('PolicyInformationPoint');

  constructor(private readonly policyModel: IPolicyModel) {}

  async getApplicablePolicies(request: PolicyRequest): Promise<Policy[]> {
    try {
      this.logger.debug('Retrieving applicable policies', {
        subject: request.subject.toString(),
        resource: request.resource,
        action: request.action
      });

      const query: any = {
        isActive: true,
        $or: [
          { 'target.subjects': { $in: [request.subject.toString(), '*'] } },
          { 'target.subjects': { $exists: false } },
          { 'target.subjects': { $size: 0 } }
        ]
      };

      if (request.resource) {
        query.$and = query.$and ?? [];
        query.$and.push({
          $or: [
            { 'target.resources': { $in: [request.resource, '*'] } },
            { 'target.resources': { $exists: false } },
            { 'target.resources': { $size: 0 } },
            { 'target.resources': { $regex: this.createWildcardRegex(request.resource) } }
          ]
        });
      }

      if (request.action) {
        query.$and = query.$and ?? [];
        query.$and.push({
          $or: [
            { 'target.actions': { $in: [request.action, '*'] } },
            { 'target.actions': { $exists: false } },
            { 'target.actions': { $size: 0 } },
            { 'target.actions': { $regex: this.createWildcardRegex(request.action) } }
          ]
        });
      }

      const docs = await this.policyModel.find(query).lean();
      const policies = docs.map(doc => this.toDomain(doc));

      this.logger.debug('Retrieved applicable policies', { 
        count: policies.length 
      });

      return policies;

    } catch (error) {
      this.logger.error('Failed to retrieve applicable policies', error as Error);
      throw error;
    }
  }

  async getSubjectAttributes(subjectId: Types.ObjectId): Promise<Record<string, unknown>> {
    return {
      id: subjectId.toString(),
      timestamp: new Date().toISOString()
    };
  }

  async getResourceAttributes(resource: string): Promise<Record<string, unknown>> {
    return {
      resource,
      timestamp: new Date().toISOString()
    };
  }

  async getEnvironmentAttributes(): Promise<Record<string, unknown>> {
    return {
      timestamp: new Date().toISOString(),
      dayOfWeek: new Date().getDay(),
      hour: new Date().getHours()
    };
  }

  private createWildcardRegex(pattern: string): string {
    return pattern.replace(/\*/g, '.*');
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


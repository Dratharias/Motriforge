import { Types } from 'mongoose';
import { 
  PolicyRequest, 
  PolicyDecision 
} from '@/types/iam/interfaces';
import { PolicyDecisionPoint } from './PolicyDecisionPoint';
import { LoggerFactory } from '@/shared-kernel/infrastructure/logging/factory/LoggerFactory';

export class PolicyEngineService {
  private readonly logger = LoggerFactory.getContextualLogger('PolicyEngineService');
  
  constructor(private readonly policyDecisionPoint: PolicyDecisionPoint) {}

  async authorize(
    subject: Types.ObjectId,
    resource: string,
    action: string,
    environment?: Record<string, unknown>
  ): Promise<{
    authorized: boolean;
    decision: PolicyDecision;
    obligations?: string[];
    advice?: string[];
    reason?: string;
  }> {
    const contextLogger = this.logger.withData({
      subject: subject.toString(),
      resource,
      action
    });

    try {
      contextLogger.debug('Starting authorization request');

      const request: PolicyRequest = {
        subject,
        resource,
        action,
        environment: environment || {}
      };

      const response = await this.policyDecisionPoint.evaluate(request);

      const authorized = response.decision === PolicyDecision.PERMIT;

      contextLogger.info('Authorization completed', {
        authorized,
        decision: response.decision
      });

      return {
        authorized,
        decision: response.decision,
        obligations: response.obligations,
        advice: response.advice,
        reason: response.reason
      };

    } catch (error) {
      contextLogger.error('Authorization failed', error as Error);
      
      // Fail secure - deny access on error
      return {
        authorized: false,
        decision: PolicyDecision.DENY,
        reason: `Authorization error: ${(error as Error).message}`
      };
    }
  }

  async batchAuthorize(
    requests: Array<{
      subject: Types.ObjectId;
      resource: string;
      action: string;
      environment?: Record<string, unknown>;
    }>
  ): Promise<Array<{
    authorized: boolean;
    decision: PolicyDecision;
    obligations?: string[];
    advice?: string[];
    reason?: string;
  }>> {
    this.logger.info('Processing batch authorization', { 
      requestCount: requests.length 
    });

    const results = await Promise.all(
      requests.map(request => 
        this.authorize(request.subject, request.resource, request.action, request.environment)
      )
    );

    this.logger.info('Batch authorization completed', { 
      requestCount: requests.length,
      authorizedCount: results.filter(r => r.authorized).length
    });

    return results;
  }
}
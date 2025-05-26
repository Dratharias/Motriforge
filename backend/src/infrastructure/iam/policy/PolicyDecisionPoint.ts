import { 
  PolicyRequest, 
  PolicyResponse, 
  PolicyDecision, 
  Policy, 
  PolicyRule 
} from '@/types/iam/interfaces';
import { PolicyInformationPoint } from './PolicyInformationPoint';
import { RuleEngine } from './RuleEngine';
import { LoggerFactory } from '@/shared-kernel/infrastructure/logging/factory/LoggerFactory';

export class PolicyDecisionPoint {
  private readonly logger = LoggerFactory.getContextualLogger('PolicyDecisionPoint');

  constructor(
    private readonly policyInformationPoint: PolicyInformationPoint,
    private readonly ruleEngine: RuleEngine
  ) {}

  async evaluate(request: PolicyRequest): Promise<PolicyResponse> {
    const contextLogger = this.logger.withData({
      subject: request.subject.toString(),
      resource: request.resource,
      action: request.action
    });

    try {
      contextLogger.debug('Evaluating policy request');

      // Get applicable policies
      const applicablePolicies = await this.policyInformationPoint.getApplicablePolicies(request);
      
      if (applicablePolicies.length === 0) {
        contextLogger.debug('No applicable policies found');
        return {
          decision: PolicyDecision.NOT_APPLICABLE,
          reason: 'No applicable policies found'
        };
      }

      // Sort policies by priority (higher priority first)
      const sortedPolicies = applicablePolicies.toSorted((a, b) => b.priority - a.priority);

      // Evaluate policies in order
      for (const policy of sortedPolicies) {
        const policyResult = await this.evaluatePolicy(policy, request);
        
        if (policyResult.decision !== PolicyDecision.NOT_APPLICABLE) {
          contextLogger.debug('Policy decision made', {
            policyId: policy.id.toString(),
            decision: policyResult.decision
          });
          return policyResult;
        }
      }

      contextLogger.debug('No conclusive policy decision');
      return {
        decision: PolicyDecision.INDETERMINATE,
        reason: 'No conclusive policy decision could be made'
      };

    } catch (error) {
      contextLogger.error('Error evaluating policy', error as Error);
      return {
        decision: PolicyDecision.INDETERMINATE,
        reason: `Policy evaluation error: ${(error as Error).message}`
      };
    }
  }

  private async evaluatePolicy(policy: Policy, request: PolicyRequest): Promise<PolicyResponse> {
    try {
      // Check if policy target matches request
      if (!this.matchesTarget(policy, request)) {
        return {
          decision: PolicyDecision.NOT_APPLICABLE,
          reason: 'Policy target does not match request'
        };
      }

      // Evaluate rules
      const obligations: string[] = [];
      const advice: string[] = [];
      let finalDecision = PolicyDecision.NOT_APPLICABLE;

      for (const rule of policy.rules) {
        const ruleResult = await this.evaluateRule(rule, request);
        
        if (ruleResult.applies) {
          finalDecision = rule.effect === 'permit' ? PolicyDecision.PERMIT : PolicyDecision.DENY;
          
          if (rule.obligations) {
            obligations.push(...rule.obligations);
          }
          
          if (rule.advice) {
            advice.push(...rule.advice);
          }

          // For deny decisions, return immediately
          if (finalDecision === PolicyDecision.DENY) {
            break;
          }
        }
      }

      return {
        decision: finalDecision,
        obligations: obligations.length > 0 ? obligations : undefined,
        advice: advice.length > 0 ? advice : undefined,
        reason: `Policy ${policy.name} evaluated with decision: ${finalDecision}`
      };

    } catch (error) {
      return {
        decision: PolicyDecision.INDETERMINATE,
        reason: `Error evaluating policy ${policy.name}: ${(error as Error).message}`
      };
    }
  }

  private async evaluateRule(rule: PolicyRule, request: PolicyRequest): Promise<{ applies: boolean }> {
    if (!rule.condition) {
      return { applies: true };
    }

    const conditionResult = await this.ruleEngine.evaluateCondition(rule.condition, request);
    return { applies: conditionResult };
  }

  private matchesTarget(policy: Policy, request: PolicyRequest): boolean {
    const target = policy.target;

    // Check subjects
    if (target.subjects && target.subjects.length > 0) {
      const subjectMatches = target.subjects.some(subject => 
        subject === '*' || subject === request.subject.toString()
      );
      if (!subjectMatches) return false;
    }

    // Check resources
    if (target.resources && target.resources.length > 0) {
      const resourceMatches = target.resources.some(resource => 
        this.matchesPattern(resource, request.resource)
      );
      if (!resourceMatches) return false;
    }

    // Check actions
    if (target.actions && target.actions.length > 0) {
      const actionMatches = target.actions.some(action => 
        this.matchesPattern(action, request.action)
      );
      if (!actionMatches) return false;
    }

    // Check environment (if any specific checks needed)
    // This could be extended for more complex environment matching

    return true;
  }

  private matchesPattern(pattern: string, value: string): boolean {
    if (pattern === '*') return true;
    if (pattern === value) return true;
    
    // Simple wildcard matching (could be enhanced with regex)
    if (pattern.includes('*')) {
      const regexPattern = pattern.replace(/\*/g, '.*');
      return new RegExp(`^${regexPattern}$`).test(value);
    }

    return false;
  }
}


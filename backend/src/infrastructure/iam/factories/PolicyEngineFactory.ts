
import { PolicyDecisionPoint } from '../policy/PolicyDecisionPoint';
import { PolicyInformationPoint } from '../policy/PolicyInformationPoint';
import { PolicyAdministrationPoint } from '../policy/PolicyAdministrationPoint';
import { RuleEngine } from '../policy/RuleEngine';
import { PolicyEngineService } from '../policy/PolicyEngineService';
import { PolicyModel } from '../schemas/PolicySchema';

export interface IAMPolicyEngine {
  policyInformationPoint: PolicyInformationPoint;
  ruleEngine: RuleEngine;
  policyDecisionPoint: PolicyDecisionPoint;
  policyAdministrationPoint: PolicyAdministrationPoint;
  policyEngineService: PolicyEngineService;
}

export class PolicyEngineFactory {
  static create(): IAMPolicyEngine {
    const policyInformationPoint = new PolicyInformationPoint(PolicyModel);
    const ruleEngine = new RuleEngine(policyInformationPoint);
    const policyDecisionPoint = new PolicyDecisionPoint(
      policyInformationPoint,
      ruleEngine
    );
    const policyAdministrationPoint = new PolicyAdministrationPoint(PolicyModel);
    const policyEngineService = new PolicyEngineService(policyDecisionPoint);

    return {
      policyInformationPoint,
      ruleEngine,
      policyDecisionPoint,
      policyAdministrationPoint,
      policyEngineService
    };
  }
}
import { Types } from 'mongoose';
import { IUser } from '../../../types/core/interfaces';
import { Action, ResourceType } from '../../../types/core/enums';
import { IShareRequest } from '../entities/interfaces';

export interface IShareRuleContext {
  readonly sharer: IUser;
  readonly targetUser: IUser;
  readonly resourceId: Types.ObjectId;
  readonly resourceType: ResourceType;
  readonly requestedActions: readonly Action[];
  readonly shareRequest: IShareRequest;
}

export interface IShareRuleResult {
  readonly allowed: boolean;
  readonly reason?: string;
  readonly warnings?: readonly string[];
  readonly suggestedActions?: readonly Action[];
  readonly maxDuration?: number;
}

export interface IShareRule {
  readonly name: string;
  readonly priority: number;
  readonly description: string;
  
  appliesTo(context: IShareRuleContext): boolean;
  evaluate(context: IShareRuleContext): Promise<IShareRuleResult>;
}

export interface IShareRuleEngine {
  addRule(rule: IShareRule): void;
  removeRule(ruleName: string): void;
  evaluateRules(context: IShareRuleContext): Promise<{
    allowed: boolean;
    appliedRules: readonly string[];
    failedRules: readonly string[];
    warnings: readonly string[];
    suggestedActions: readonly Action[];
    maxDuration?: number;
  }>;
}
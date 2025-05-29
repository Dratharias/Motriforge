import { IShareRule, IShareRuleContext, IShareRuleEngine } from './interfaces';
import { Action } from '../../../types/core/enums';

export class ShareRuleEngine implements IShareRuleEngine {
  private readonly rules = new Map<string, IShareRule>();

  addRule(rule: IShareRule): void {
    this.rules.set(rule.name, rule);
  }

  removeRule(ruleName: string): void {
    this.rules.delete(ruleName);
  }

  async evaluateRules(context: IShareRuleContext): Promise<{
    allowed: boolean;
    appliedRules: readonly string[];
    failedRules: readonly string[];
    warnings: readonly string[];
    suggestedActions: readonly Action[];
    maxDuration?: number;
  }> {
    const applicableRules = this.getApplicableRules(context);
    const appliedRules: string[] = [];
    const failedRules: string[] = [];
    const warnings: string[] = [];
    const suggestedActionsSet = new Set<Action>();
    let maxDuration: number | undefined;
    let overallAllowed = true;
  
    for (const rule of applicableRules) {
      const result = await this.evaluateRule(rule, context, warnings, suggestedActionsSet);
      appliedRules.push(rule.name);
  
      if (!result.success) {
        overallAllowed = false;
        failedRules.push(rule.name);
      }
  
      if (result.maxDuration !== undefined) {
        maxDuration = maxDuration === undefined
          ? result.maxDuration
          : Math.min(maxDuration, result.maxDuration);
      }
    }
  
    return {
      allowed: overallAllowed,
      appliedRules,
      failedRules,
      warnings,
      suggestedActions: Array.from(suggestedActionsSet),
      maxDuration
    };
  }
  
  private getApplicableRules(context: IShareRuleContext): IShareRule[] {
    return Array.from(this.rules.values())
      .filter(rule => rule.appliesTo(context))
      .sort((a, b) => b.priority - a.priority);
  }
  
  private async evaluateRule(
    rule: IShareRule,
    context: IShareRuleContext,
    warnings: string[],
    suggestedActions: Set<Action>
  ): Promise<{ success: boolean; maxDuration?: number }> {
    try {
      const result = await rule.evaluate(context);
  
      if (result.warnings) {
        warnings.push(...result.warnings);
      }
  
      if (result.suggestedActions) {
        result.suggestedActions.forEach(action => suggestedActions.add(action));
      }
  
      return {
        success: result.allowed,
        maxDuration: result.maxDuration
      };
  
    } catch (error) {
      warnings.push(`Rule ${rule.name} evaluation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return { success: false };
    }
  }
  

  getRules(): readonly IShareRule[] {
    return Array.from(this.rules.values());
  }

  getRule(name: string): IShareRule | undefined {
    return this.rules.get(name);
  }

  clearRules(): void {
    this.rules.clear();
  }

  getRulesByPriority(): readonly IShareRule[] {
    return Array.from(this.rules.values()).sort((a, b) => b.priority - a.priority);
  }
}
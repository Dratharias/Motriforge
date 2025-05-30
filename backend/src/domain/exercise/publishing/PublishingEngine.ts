import { Exercise } from '../entities/Exercise';
import { IPublishingRule, PublishingRuleResult, PublishingContext } from './IPublishingRule';
import { ComplianceChecker } from './ComplianceChecker';
import { PublicationApprover } from './PublicationApprover';
import { ContentQualityRule } from './ContentQualityRule';
import { ExerciseValidatorFacade } from '../validation/ExerciseValidatorFacade';

/**
 * Result of publication evaluation
 */
export interface PublicationResult {
  readonly canPublish: boolean;
  readonly requiresApproval: boolean;
  readonly blockedBy: readonly string[];
  readonly approvalRequired: readonly string[];
  readonly ruleResults: readonly PublishingRuleResult[];
  readonly summary: string;
  readonly metadata: Record<string, unknown>;
}

/**
 * Engine that orchestrates exercise publishing rules
 */
export class PublishingEngine {
  private readonly rules: readonly IPublishingRule[];

  constructor(rules?: readonly IPublishingRule[]) {
    this.rules = rules ?? [
      new ComplianceChecker(),
      new PublicationApprover(),
      new ContentQualityRule(new ExerciseValidatorFacade())
    ];
  }

  /**
   * Evaluate exercise for publication
   */
  async evaluateForPublication(
    exercise: Exercise, 
    context?: PublishingContext
  ): Promise<PublicationResult> {
    const ruleResults: PublishingRuleResult[] = [];
    const blockedBy: string[] = [];
    const approvalRequired: string[] = [];

    // Get applicable rules and sort by priority
    const applicableRules = this.rules
      .filter(rule => rule.shouldApply(exercise))
      .sort((a, b) => b.priority - a.priority);

    // Evaluate each rule
    for (const rule of applicableRules) {
      try {
        const result = await rule.evaluate(exercise, context);
        ruleResults.push(result);

        if (!result.passed && result.blocksPublication) {
          blockedBy.push(result.ruleName);
        }

        if (result.requiresApproval) {
          approvalRequired.push(result.ruleName);
        }
      } catch (error) {
        // Handle rule evaluation errors
        ruleResults.push({
          passed: false,
          ruleName: rule.name,
          message: `Rule evaluation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
          blocksPublication: true,
          requiresApproval: false,
          metadata: { error: true }
        });
        blockedBy.push(rule.name);
      }
    }

    const canPublish = blockedBy.length === 0;
    const requiresApproval = approvalRequired.length > 0;

    return {
      canPublish,
      requiresApproval,
      blockedBy,
      approvalRequired,
      ruleResults,
      summary: this.generateSummary(canPublish, requiresApproval, blockedBy, approvalRequired),
      metadata: this.collectMetadata(ruleResults)
    };
  }

  /**
   * Quick check if exercise can be published
   */
  async canPublish(exercise: Exercise, context?: PublishingContext): Promise<boolean> {
    const result = await this.evaluateForPublication(exercise, context);
    return result.canPublish && !result.requiresApproval;
  }

  /**
   * Check what approvals are needed
   */
  async getApprovalRequirements(
    exercise: Exercise, 
    context?: PublishingContext
  ): Promise<{
    needsApproval: boolean;
    requiredRoles: readonly string[];
    reasons: readonly string[];
  }> {
    const result = await this.evaluateForPublication(exercise, context);
    
    const requiredRoles = result.ruleResults
      .filter(r => r.requiresApproval && r.metadata?.requiredApproverRole)
      .map(r => r.metadata!.requiredApproverRole as string);

    const reasons = result.ruleResults
      .filter(r => r.requiresApproval && r.metadata?.approvalReason)
      .map(r => r.metadata!.approvalReason as string);

    return {
      needsApproval: result.requiresApproval,
      requiredRoles: [...new Set(requiredRoles)],
      reasons: [...new Set(reasons)]
    };
  }

  /**
   * Get publication readiness score
   */
  async getPublicationReadiness(exercise: Exercise): Promise<{
    score: number;
    blockers: number;
    warnings: number;
    recommendations: readonly string[];
  }> {
    const result = await this.evaluateForPublication(exercise);
    
    const totalRules = result.ruleResults.length;
    const passedRules = result.ruleResults.filter(r => r.passed).length;
    const score = totalRules > 0 ? Math.round((passedRules / totalRules) * 100) : 0;

    const blockers = result.ruleResults.filter(r => 
      !r.passed && r.blocksPublication
    ).length;

    const warnings = result.ruleResults.filter(r => 
      !r.passed && !r.blocksPublication
    ).length;

    const recommendations = result.ruleResults
      .filter(r => !r.passed)
      .map(r => r.message ?? `${r.ruleName} requirements not met`);

    return {
      score,
      blockers,
      warnings,
      recommendations
    };
  }

  private generateSummary(
    canPublish: boolean, 
    requiresApproval: boolean, 
    blockedBy: readonly string[], 
    approvalRequired: readonly string[]
  ): string {
    if (!canPublish) {
      return `Publication blocked by: ${blockedBy.join(', ')}`;
    }
    
    if (requiresApproval) {
      return `Ready for publication after approval from: ${approvalRequired.join(', ')}`;
    }
    
    return 'Exercise is ready for immediate publication';
  }

  private collectMetadata(results: readonly PublishingRuleResult[]): Record<string, unknown> {
    const metadata: Record<string, unknown> = {};
    
    for (const result of results) {
      if (result.metadata) {
        metadata[result.ruleName] = result.metadata;
      }
    }
    
    return metadata;
  }
}
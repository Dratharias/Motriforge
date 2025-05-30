import { IPublishingRule, PublishingRuleResult, PublishingContext } from './IPublishingRule';
import { Exercise } from '../entities/Exercise';
import { ExerciseValidatorFacade } from '../validation/ExerciseValidatorFacade';

/**
 * Evaluates exercise content quality for publication
 */
export class ContentQualityRule implements IPublishingRule {
  public readonly name = 'ContentQualityRule';
  public readonly priority = 80;

  constructor(private readonly validator: ExerciseValidatorFacade) {}

  shouldApply(exercise: Exercise): boolean {
    return !exercise.isDraft; // Only check quality for publication
  }

  async evaluate(exercise: Exercise, context?: PublishingContext): Promise<PublishingRuleResult> {
    const validationResult = this.validator.validateForPublication(exercise);
    
    if (!validationResult.isValid) {
      const criticalErrors = validationResult.errors.filter(e => 
        e.severity === 'CRITICAL' || e.severity === 'ERROR'
      );
      
      return {
        passed: false,
        ruleName: this.name,
        message: `Exercise has ${criticalErrors.length} validation errors`,
        blocksPublication: true,
        requiresApproval: false,
        metadata: {
          validationErrors: criticalErrors.map(e => ({
            field: e.field,
            message: e.message,
            code: e.code
          }))
        }
      };
    }

    // Check quality score
    const summary = this.validator.getValidationSummary(exercise);
    if (summary.overallScore < 80) {
      return {
        passed: false,
        ruleName: this.name,
        message: `Exercise quality score (${summary.overallScore}%) below publication threshold (80%)`,
        blocksPublication: false,
        requiresApproval: true,
        metadata: {
          qualityScore: summary.overallScore,
          missingRequirements: summary.missingRequirements
        }
      };
    }

    return {
      passed: true,
      ruleName: this.name,
      message: `Exercise meets quality requirements (${summary.overallScore}% score)`,
      blocksPublication: false,
      requiresApproval: false
    };
  }
}


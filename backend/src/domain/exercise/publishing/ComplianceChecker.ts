import { IPublishingRule, PublishingRuleResult, PublishingContext } from './IPublishingRule';
import { Exercise } from '../entities/Exercise';
import { SafetyGuidelines } from '../config/SafetyGuidelines';
import { ExerciseType, Difficulty } from '../../../types/fitness/enums/exercise';

export class ComplianceChecker implements IPublishingRule {
  public readonly name = 'ComplianceChecker';
  public readonly priority = 100;

  shouldApply(exercise: Exercise): boolean {
    return true;
  }

  async evaluate(exercise: Exercise, context?: PublishingContext): Promise<PublishingRuleResult> {
    const needsMedicalReview = this.checkMedicalReviewRequired(exercise);
    if (needsMedicalReview && !context?.medicalReviewRequired) {
      return {
        passed: false,
        ruleName: this.name,
        message: 'Exercise requires medical review before publication',
        blocksPublication: true,
        requiresApproval: true,
        metadata: { requiresMedicalReview: true }
      };
    }

    const safetyCompliant = this.checkSafetyCompliance(exercise);
    if (!safetyCompliant.passed) {
      return {
        passed: false,
        ruleName: this.name,
        message: safetyCompliant.message,
        blocksPublication: true,
        requiresApproval: false
      };
    }

    const contentCompliant = this.checkContentCompliance(exercise);
    if (!contentCompliant.passed) {
      return {
        passed: false,
        ruleName: this.name,
        message: contentCompliant.message,
        blocksPublication: true,
        requiresApproval: false
      };
    }

    return {
      passed: true,
      ruleName: this.name,
      message: 'Exercise meets all compliance requirements',
      blocksPublication: false,
      requiresApproval: false
    };
  }

  private checkMedicalReviewRequired(exercise: Exercise): boolean {
    return SafetyGuidelines.requiresMedicalClearance(
      exercise.type,
      exercise.difficulty
    );
  }

  private checkSafetyCompliance(exercise: Exercise): { passed: boolean; message?: string } {
    const highRiskTypes = [ExerciseType.REHABILITATION, ExerciseType.SPORTS_SPECIFIC];
    if (highRiskTypes.includes(exercise.type) && exercise.contraindications.length === 0) {
      return {
        passed: false,
        message: 'High-risk exercise types must include contraindications'
      };
    }

    const advancedDifficulties = [
      Difficulty.ADVANCED_I, Difficulty.ADVANCED_II, Difficulty.ADVANCED_III, Difficulty.MASTER
    ];
    if (advancedDifficulties.includes(exercise.difficulty) && exercise.prerequisites.length === 0) {
      return {
        passed: false,
        message: 'Advanced exercises must specify prerequisite exercises'
      };
    }

    const highRiskMuscles = ['NECK', 'BACK', 'KNEE'];
    const hasHighRiskMuscles = exercise.primaryMuscles.some(muscle =>
      highRiskMuscles.includes(muscle)
    );
    if (hasHighRiskMuscles && exercise.contraindications.length === 0) {
      return {
        passed: false,
        message: 'Exercises targeting high-risk muscle groups must include safety warnings'
      };
    }

    return { passed: true };
  }

  private checkContentCompliance(exercise: Exercise): { passed: boolean; message?: string } {
    const inappropriatePatterns = [
      /\b(fuck|shit|damn|hell)\b/i,
      /\b(dangerous|risky|unsafe)\b/i
    ];

    const textContent = [
      exercise.name,
      exercise.description,
      ...exercise.instructions.map(i => i.title + ' ' + i.description),
      ...exercise.progressions.map(p => p.title + ' ' + p.description)
    ].join(' ');

    for (const pattern of inappropriatePatterns) {
      if (pattern.test(textContent)) {
        return {
          passed: false,
          message: 'Exercise content contains inappropriate or concerning language'
        };
      }
    }

    const medicalClaimPatterns = [
      /\b(cure|heal|treat|therapy)\b/i,
      /\b(guaranteed|promise|100%)\b/i
    ];

    for (const pattern of medicalClaimPatterns) {
      if (pattern.test(textContent)) {
        return {
          passed: false,
          message: 'Exercise content contains inappropriate medical claims'
        };
      }
    }

    return { passed: true };
  }
}
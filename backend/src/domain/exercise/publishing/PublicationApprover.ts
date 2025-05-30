import { IPublishingRule, PublishingRuleResult, PublishingContext } from './IPublishingRule';
import { Exercise } from '../entities/Exercise';
import { Role } from '../../../types/core/enums';
import { ExerciseType, Difficulty } from '../../../types/fitness/enums/exercise';

export class PublicationApprover implements IPublishingRule {
  public readonly name = 'PublicationApprover';
  public readonly priority = 90;

  shouldApply(exercise: Exercise): boolean {
    return !exercise.isDraft;
  }

  async evaluate(exercise: Exercise, context?: PublishingContext): Promise<PublishingRuleResult> {
    const approvalRequirement = this.determineApprovalRequirement(exercise, context);

    if (approvalRequirement.required && !context?.reviewerRequired) {
      return {
        passed: false,
        ruleName: this.name,
        message: approvalRequirement.message,
        blocksPublication: true,
        requiresApproval: true,
        metadata: {
          requiredApproverRole: approvalRequirement.requiredRole,
          approvalReason: approvalRequirement.reason
        }
      };
    }

    return {
      passed: true,
      ruleName: this.name,
      message: approvalRequirement.required ?
        'Exercise approved for publication' :
        'Exercise does not require approval',
      blocksPublication: false,
      requiresApproval: false
    };
  }

  private determineApprovalRequirement(exercise: Exercise, context?: PublishingContext): {
    required: boolean;
    requiredRole?: Role;
    reason?: string;
    message?: string;
  } {
    if (exercise.type === ExerciseType.REHABILITATION) {
      return {
        required: true,
        requiredRole: Role.ADMIN,
        reason: 'rehabilitation_exercise',
        message: 'Rehabilitation exercises require medical professional approval'
      };
    }

    const advancedDifficulties = [
      Difficulty.ADVANCED_II, Difficulty.ADVANCED_III, Difficulty.MASTER
    ];
    if (advancedDifficulties.includes(exercise.difficulty)) {
      return {
        required: true,
        requiredRole: Role.TRAINER,
        reason: 'advanced_difficulty',
        message: 'Advanced exercises require certified trainer approval'
      };
    }

    if (context?.targetAudience === 'PUBLIC') {
      return {
        required: true,
        requiredRole: Role.TRAINER,
        reason: 'public_audience',
        message: 'Public exercises require professional review'
      };
    }

    if (exercise.contraindications.length > 3) {
      return {
        required: true,
        requiredRole: Role.TRAINER,
        reason: 'safety_concerns',
        message: 'Exercises with multiple contraindications require safety review'
      };
    }

    if (exercise.instructions.length > 10) {
      return {
        required: true,
        requiredRole: Role.TRAINER,
        reason: 'complexity',
        message: 'Complex exercises with many steps require professional review'
      };
    }

    return {
      required: false,
      message: 'Exercise can be published without additional approval'
    };
  }
}


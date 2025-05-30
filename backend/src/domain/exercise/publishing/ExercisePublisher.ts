import { Types } from 'mongoose';
import { Exercise } from '../entities/Exercise';
import { ExerciseValidator } from '../validation/ExerciseValidator';
import { ExerciseConfig } from '../config/ExerciseConfig';
import { Role } from '../../../types/core/enums';

export interface PublishingContext {
  readonly publishedBy: Types.ObjectId;
  readonly targetAudience?: 'PUBLIC' | 'ORGANIZATION' | 'PRIVATE';
  readonly reviewerRequired?: boolean;
}

export interface PublishingResult {
  readonly canPublish: boolean;
  readonly requiresApproval: boolean;
  readonly blockedBy: readonly string[];
  readonly approvalRequired: readonly string[];
  readonly message: string;
}

export class ExercisePublisher {
  constructor(private readonly validator: ExerciseValidator) {}

  async evaluateForPublication(exercise: Exercise, context?: PublishingContext): Promise<PublishingResult> {
    const blockedBy: string[] = [];
    const approvalRequired: string[] = [];

    // Basic validation check
    const validation = this.validator.validateForPublication(exercise);
    if (!validation.isValid) {
      blockedBy.push('validation');
    }

    // Content compliance check
    if (this.hasInappropriateContent(exercise)) {
      blockedBy.push('content_compliance');
    }

    // Medical review requirement
    if (ExerciseConfig.publishing.requireMedicalReview.includes(exercise.type)) {
      if (!context?.reviewerRequired) {
        approvalRequired.push('medical_review');
      }
    }

    // Trainer approval requirement  
    if (ExerciseConfig.publishing.requireTrainerApproval.includes(exercise.difficulty)) {
      if (!context?.reviewerRequired) {
        approvalRequired.push('trainer_approval');
      }
    }

    // Public audience requires approval
    if (context?.targetAudience === 'PUBLIC' && !context?.reviewerRequired) {
      approvalRequired.push('public_review');
    }

    // Quality threshold check
    const summary = this.validator.getValidationSummary(exercise);
    if (summary.overallScore < ExerciseConfig.publishing.qualityThreshold) {
      approvalRequired.push('quality_review');
    }

    const canPublish = blockedBy.length === 0;
    const requiresApproval = approvalRequired.length > 0;

    return {
      canPublish,
      requiresApproval,
      blockedBy,
      approvalRequired,
      message: this.generateMessage(canPublish, requiresApproval, blockedBy, approvalRequired)
    };
  }

  async canPublish(exercise: Exercise, context?: PublishingContext): Promise<boolean> {
    const result = await this.evaluateForPublication(exercise, context);
    return result.canPublish && !result.requiresApproval;
  }

  getApprovalRequirements(exercise: Exercise): { requiredRoles: string[]; reasons: string[] } {
    const requiredRoles: string[] = [];
    const reasons: string[] = [];

    if (ExerciseConfig.publishing.requireMedicalReview.includes(exercise.type)) {
      requiredRoles.push(Role.ADMIN);
      reasons.push('medical_review');
    }

    if (ExerciseConfig.publishing.requireTrainerApproval.includes(exercise.difficulty)) {
      requiredRoles.push(Role.TRAINER);
      reasons.push('advanced_difficulty');
    }

    return { requiredRoles: [...new Set(requiredRoles)], reasons };
  }

  private hasInappropriateContent(exercise: Exercise): boolean {
    const inappropriatePatterns = [
      /\b(fuck|shit|damn|hell)\b/i,
      /\b(dangerous|risky|unsafe)\b/i,
      /\b(cure|heal|treat|therapy)\b/i,
      /\b(guaranteed|promise|100%)\b/i
    ];

    const textContent = [
      exercise.name,
      exercise.description,
      ...exercise.instructions.map(i => `${i.title} ${i.description}`)
    ].join(' ');

    return inappropriatePatterns.some(pattern => pattern.test(textContent));
  }

  private generateMessage(canPublish: boolean, requiresApproval: boolean, blockedBy: string[], approvalRequired: string[]): string {
    if (!canPublish) {
      return `Publication blocked by: ${blockedBy.join(', ')}`;
    }
    if (requiresApproval) {
      return `Ready for publication after approval: ${approvalRequired.join(', ')}`;
    }
    return 'Exercise is ready for immediate publication';
  }
}
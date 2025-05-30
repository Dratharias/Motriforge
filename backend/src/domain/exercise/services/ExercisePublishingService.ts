import { Types } from 'mongoose';
import { Exercise } from '../entities/Exercise';
import { IExerciseRepository } from '../interfaces/ExerciseInterfaces';
import { ExerciseValidatorFacade } from '../validation/ExerciseValidatorFacade';
import { PublishingEngine } from '../publishing/PublishingEngine';
import { PublishingContext } from '../publishing/IPublishingRule';
import { ValidationError } from '../../../infrastructure/errors/types/ValidationError';

export class ExercisePublishingService {
  constructor(
    private readonly exerciseRepository: IExerciseRepository,
    private readonly validator: ExerciseValidatorFacade,
    private readonly publishingEngine: PublishingEngine
  ) {}

  async publishExercise(
    id: Types.ObjectId,
    context?: PublishingContext
  ): Promise<Exercise | null> {
    const exercise = await this.exerciseRepository.findById(id);
    if (!exercise) {
      throw new ValidationError(
        'exercise',
        id,
        'not_found',
        'Exercise not found'
      );
    }

    if (!exercise.isDraft) {
      throw new ValidationError(
        'exercise',
        id,
        'already_published',
        'Exercise is already published'
      );
    }

    const validationResult = this.validator.validateForPublication(exercise);
    if (!validationResult.canPublish()) {
      throw new ValidationError(
        'exercise',
        id,
        'validation_failed',
        `Exercise cannot be published: ${validationResult.errors.map(e => e.message).join(', ')}`
      );
    }

    const publicationResult = await this.publishingEngine.evaluateForPublication(exercise, context);
    if (!publicationResult.canPublish) {
      throw new ValidationError(
        'exercise',
        id,
        'publication_blocked',
        `Publication blocked: ${publicationResult.summary}`
      );
    }

    if (publicationResult.requiresApproval && !context?.reviewerRequired) {
      throw new ValidationError(
        'exercise',
        id,
        'approval_required',
        `Exercise requires approval: ${publicationResult.summary}`
      );
    }

    const publishedExercise = exercise.publish();
    return await this.exerciseRepository.update(id, publishedExercise);
  }

  async getPublicationReadiness(id: Types.ObjectId): Promise<{
    isReady: boolean;
    validationScore: number;
    publicationScore: number;
    blockers: readonly string[];
    recommendations: readonly string[];
    requiredApprovals: readonly string[];
  }> {
    const exercise = await this.exerciseRepository.findById(id);
    if (!exercise) {
      throw new ValidationError(
        'exercise',
        id,
        'not_found',
        'Exercise not found'
      );
    }

    const validationSummary = this.validator.getValidationSummary(exercise);
    const publicationReadiness = await this.publishingEngine.getPublicationReadiness(exercise);
    const approvalRequirements = await this.publishingEngine.getApprovalRequirements(exercise);

    const isReady = validationSummary.readinessPercentage === 100 &&
                   publicationReadiness.blockers === 0;

    return {
      isReady,
      validationScore: validationSummary.readinessPercentage,
      publicationScore: publicationReadiness.score,
      blockers: [
        ...validationSummary.missingRequirements,
        ...publicationReadiness.recommendations.slice(0, publicationReadiness.blockers)
      ],
      recommendations: publicationReadiness.recommendations,
      requiredApprovals: approvalRequirements.reasons
    };
  }

  async submitForReview(
    id: Types.ObjectId,
    submittedBy: Types.ObjectId,
    notes?: string
  ): Promise<{
    submitted: boolean;
    requiredApprovers: readonly string[];
    estimatedReviewTime: number;
  }> {
    const exercise = await this.exerciseRepository.findById(id);
    if (!exercise) {
      throw new ValidationError(
        'exercise',
        id,
        'not_found',
        'Exercise not found'
      );
    }

    const context: PublishingContext = {
      publishedBy: submittedBy,
      reviewerRequired: false
    };

    const approvalRequirements = await this.publishingEngine.getApprovalRequirements(exercise, context);

    if (!approvalRequirements.needsApproval) {
      const validationResult = this.validator.validateForPublication(exercise);
      if (validationResult.canPublish()) {
        try {
          await this.publishExercise(id, { ...context, reviewerRequired: false });
          return {
            submitted: true,
            requiredApprovers: [],
            estimatedReviewTime: 0
          };
        } catch (error) {
          // If auto-publication fails, fall through to manual review
        }
      }
    }

    return {
      submitted: true,
      requiredApprovers: approvalRequirements.requiredRoles,
      estimatedReviewTime: this.estimateReviewTime(approvalRequirements.requiredRoles)
    };
  }

  async getExercisesNeedingReview(): Promise<readonly Exercise[]> {
    return await this.exerciseRepository.findNeedingReview();
  }

  async approveExercise(
    id: Types.ObjectId,
    approvedBy: Types.ObjectId,
    approverRole: string
  ): Promise<Exercise | null> {
    const exercise = await this.exerciseRepository.findById(id);
    if (!exercise) {
      throw new ValidationError(
        'exercise',
        id,
        'not_found',
        'Exercise not found'
      );
    }

    const context: PublishingContext = {
      publishedBy: approvedBy,
      reviewerRequired: true
    };

    const approvalRequirements = await this.publishingEngine.getApprovalRequirements(exercise, context);

    if (!approvalRequirements.requiredRoles.includes(approverRole)) {
      throw new ValidationError(
        'approval',
        approverRole,
        'insufficient_authority',
        `Role ${approverRole} cannot approve this exercise`
      );
    }

    return await this.publishExercise(id, context);
  }

  private estimateReviewTime(requiredRoles: readonly string[]): number {
    if (requiredRoles.length === 0) {
      return 0;
    }

    const roleTimeMap: Record<string, number> = {
      'TRAINER': 1,
      'ADMIN': 2,
      'MEDICAL': 3
    };

    const maxTime = Math.max(...requiredRoles.map(role => roleTimeMap[role] ?? 1));
    return maxTime;
  }
}
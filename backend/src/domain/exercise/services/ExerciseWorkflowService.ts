import { Types } from 'mongoose';
import { Exercise } from '../entities/Exercise';
import { ExerciseValidator } from '../validation/ExerciseValidator';
import { ExercisePublisher, PublishingContext } from '../publishing/ExercisePublisher';
import { IExerciseQueryOptions, IExerciseRepository } from '../interfaces/ExerciseInterfaces';
import { ValidationError } from '../../../infrastructure/errors/types/ValidationError';
import { ExerciseConfig } from '../config/ExerciseConfig';
import { Difficulty, EquipmentCategory, MuscleZone } from '../../../types/fitness/enums/exercise';
export class ExerciseWorkflowService {
  constructor(
    private readonly repository: IExerciseRepository,
    private readonly validator: ExerciseValidator,
    private readonly publisher: ExercisePublisher
  ) {}

  // ========== PUBLISHING WORKFLOW ==========
  async publishExercise(id: Types.ObjectId, context?: PublishingContext): Promise<Exercise | null> {
    const exercise = await this.repository.findById(id);
    if (!exercise) {
      throw new ValidationError('exercise', id, 'not_found', 'Exercise not found');
    }

    if (!exercise.isDraft) {
      throw new ValidationError('exercise', id, 'already_published', 'Exercise is already published');
    }

    // Validate for publication
    const validation = this.validator.validateForPublication(exercise);
    if (!validation.canPublish()) {
      throw new ValidationError('exercise', id, 'validation_failed',
        `Exercise cannot be published: ${validation.errors.map(e => e.message).join(', ')}`);
    }

    // Check publishing rules
    const publishingResult = await this.publisher.evaluateForPublication(exercise, context);
    if (!publishingResult.canPublish) {
      throw new ValidationError('exercise', id, 'publication_blocked',
        `Publication blocked: ${publishingResult.message}`);
    }

    if (publishingResult.requiresApproval && !context?.reviewerRequired) {
      throw new ValidationError('exercise', id, 'approval_required',
        `Exercise requires approval: ${publishingResult.message}`);
    }

    const publishedExercise = exercise.publish();
    return await this.repository.update(id, publishedExercise);
  }

  async getPublicationReadiness(id: Types.ObjectId): Promise<{
    isReady: boolean;
    validationScore: number;
    publicationScore: number;
    blockers: readonly string[];
    recommendations: readonly string[];
    requiredApprovals: readonly string[];
  }> {
    const exercise = await this.repository.findById(id);
    if (!exercise) {
      throw new ValidationError('exercise', id, 'not_found', 'Exercise not found');
    }

    const validationSummary = this.validator.getValidationSummary(exercise);
    const publishingResult = await this.publisher.evaluateForPublication(exercise);
    const approvalRequirements = this.publisher.getApprovalRequirements(exercise);

    const isReady = validationSummary.readinessPercentage === 100 && 
                   publishingResult.canPublish &&
                   !publishingResult.requiresApproval;

    return {
      isReady,
      validationScore: validationSummary.readinessPercentage,
      publicationScore: publishingResult.canPublish ? 100 : 0,
      blockers: [...validationSummary.missingRequirements, ...publishingResult.blockedBy],
      recommendations: [publishingResult.message],
      requiredApprovals: approvalRequirements.reasons
    };
  }

  async submitForReview(id: Types.ObjectId, submittedBy: Types.ObjectId, notes?: string): Promise<{
    submitted: boolean;
    requiredApprovers: readonly string[];
    estimatedReviewTime: number;
  }> {
    const exercise = await this.repository.findById(id);
    if (!exercise) {
      throw new ValidationError('exercise', id, 'not_found', 'Exercise not found');
    }
  
    const approvalRequirements = this.publisher.getApprovalRequirements(exercise);
    
    if (approvalRequirements.requiredRoles.length === 0) {
      // Check if exercise can be auto-published
      const validation = this.validator.validateForPublication(exercise);
      if (validation.canPublish()) {
        const publishingResult = await this.publisher.evaluateForPublication(exercise, { publishedBy: submittedBy });
        if (publishingResult.canPublish && !publishingResult.requiresApproval) {
          // Auto-publish if all conditions are met
          await this.publishExercise(id, { publishedBy: submittedBy });
          return { submitted: true, requiredApprovers: [], estimatedReviewTime: 0 };
        }
      }
    }
  
    return {
      submitted: true,
      requiredApprovers: approvalRequirements.requiredRoles,
      estimatedReviewTime: this.estimateReviewTime(approvalRequirements.requiredRoles)
    };
  }

  // ========== SAFETY & COMPATIBILITY ==========
  async validateExerciseSafety(exerciseId: Types.ObjectId, medicalConditions?: readonly string[]): Promise<{
    isSafe: boolean;
    warnings: readonly string[];
    contraindications: readonly string[];
    requiresMedicalClearance: boolean;
    recommendations: readonly string[];
  }> {
    const exercise = await this.repository.findById(exerciseId);
    if (!exercise) {
      throw new Error('Exercise not found');
    }

    const safety = ExerciseConfig.safety;
    const warnings: string[] = [];
    const contraindications: string[] = [];
    let requiresMedicalClearance = false;

    // Check high-risk exercise types
    if (safety.highRiskTypes.includes(exercise.type)) {
      warnings.push(`${exercise.type} exercises require professional supervision`);
      requiresMedicalClearance = true;
    }

    // Check difficulty requirements
    if (safety.highRiskDifficulties.includes(exercise.difficulty)) {
      warnings.push(`${exercise.difficulty} exercises require advanced experience`);
    }

    // Check muscle-specific contraindications
    if (medicalConditions?.length) {
      for (const muscle of exercise.primaryMuscles) {
        const muscleContraindications = safety.muscleContraindications[muscle] ?? [];
        const matches = muscleContraindications.filter(contraindication =>
          medicalConditions.some(condition =>
            condition.toLowerCase().includes(contraindication.toLowerCase())
          )
        );
        contraindications.push(...matches);
      }

      // Check if medical clearance is needed
      const needsClearance = medicalConditions.some(condition =>
        safety.medicalClearanceConditions.some(clearanceCondition =>
          condition.toLowerCase().includes(clearanceCondition.toLowerCase())
        )
      );
      if (needsClearance) {
        requiresMedicalClearance = true;
        warnings.push('Medical clearance required due to existing health conditions');
      }
    }

    const recommendations = this.generateSafetyRecommendations(exercise, medicalConditions);
    const uniqueContraindications = [...new Set(contraindications)];
    const isSafe = uniqueContraindications.length === 0 && !requiresMedicalClearance;

    return {
      isSafe,
      warnings,
      contraindications: uniqueContraindications,
      requiresMedicalClearance,
      recommendations
    };
  }

  async getExercisesForUser(userProfile: {
    fitnessLevel?: Difficulty;
    medicalConditions?: readonly string[];
    availableEquipment?: readonly EquipmentCategory[];
    excludeEquipment?: readonly EquipmentCategory[];
    preferredMuscles?: readonly MuscleZone[];
    timeAvailable?: number;
  }, options?: IExerciseQueryOptions): Promise<readonly Exercise[]> {
    let exercises = await this.repository.findPublished(options);

    // Apply filters based on user profile
    if (userProfile.fitnessLevel) {
      exercises = this.filterByFitnessLevel(exercises, userProfile.fitnessLevel);
    }

    if (userProfile.medicalConditions?.length) {
      exercises = exercises.filter(exercise => 
        !exercise.hasContraindicationsFor(userProfile.medicalConditions!)
      );
    }

    if (userProfile.availableEquipment?.length) {
      exercises = exercises.filter(exercise =>
        exercise.equipment.every(required => userProfile.availableEquipment!.includes(required))
      );
    }

    if (userProfile.excludeEquipment?.length) {
      exercises = exercises.filter(exercise =>
        !exercise.equipment.some(equipment => userProfile.excludeEquipment!.includes(equipment))
      );
    }

    if (userProfile.timeAvailable) {
      exercises = exercises.filter(exercise => 
        exercise.estimatedDuration <= userProfile.timeAvailable!
      );
    }

    return exercises;
  }

  // ========== PRIVATE HELPERS ==========
  private estimateReviewTime(requiredRoles: readonly string[]): number {
    if (requiredRoles.length === 0) return 0;
    
    const roleTimeMap: Record<string, number> = {
      'TRAINER': 1,
      'ADMIN': 2,
      'MEDICAL': 3
    };

    return Math.max(...requiredRoles.map(role => roleTimeMap[role] ?? 1));
  }

  private generateSafetyRecommendations(exercise: Exercise, medicalConditions?: readonly string[]): readonly string[] {
    const recommendations: string[] = [];

    if (exercise.difficulty === Difficulty.BEGINNER_I) {
      recommendations.push('Focus on proper form over intensity');
    } else if (ExerciseConfig.progression.difficultyLevels[exercise.difficulty] >= 4) {
      recommendations.push('Ensure mastery of prerequisite exercises');
    }

    if (exercise.equipment.length > 0) {
      recommendations.push('Verify proper equipment setup before starting');
    }

    if (medicalConditions?.length) {
      recommendations.push('Consult with healthcare provider if you have medical concerns');
    }

    return recommendations;
  }

  private filterByFitnessLevel(exercises: readonly Exercise[], fitnessLevel: Difficulty): readonly Exercise[] {
    const config = ExerciseConfig.progression;
    const userLevel = config.difficultyLevels[fitnessLevel] ?? 5;
    
    return exercises.filter(exercise => {
      const exerciseLevel = config.difficultyLevels[exercise.difficulty] ?? 5;
      return exerciseLevel <= userLevel + 1;
    });
  }
}
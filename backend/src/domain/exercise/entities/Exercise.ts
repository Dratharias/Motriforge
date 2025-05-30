import { Types } from 'mongoose';
import { ICloneable, IDraftable, IDraftPreview, IShareable, ValidationResult } from '../../../types/core/behaviors';
import {
  ExerciseType,
  Difficulty,
  MuscleZone,
  EquipmentCategory
} from '../../../types/fitness/enums/exercise';
import { ExerciseInstruction } from './ExerciseInstruction';
import { ExerciseProgression } from './ExerciseProgression';
import {
  IContraindication,
  IExercisePrerequisite,
  IUserPerformance,
  IPrerequisiteStatus,
  IRecommendationCriteria,
  PrerequisiteCategory
} from '../interfaces/ExerciseInterfaces';
import { MediaType } from '../../../types/fitness/enums/media';
import { User } from '@/domain/user/entities/User';
import { IEntity } from '@/types/core/interfaces';

export class Exercise implements IEntity, ICloneable<Exercise>, IShareable, IDraftable {
  public readonly id: Types.ObjectId;
  public name: string;
  public description: string;
  public type: ExerciseType;
  public difficulty: Difficulty;
  public primaryMuscles: readonly MuscleZone[];
  public secondaryMuscles: readonly MuscleZone[];
  public equipment: readonly EquipmentCategory[];
  public instructions: readonly ExerciseInstruction[];
  public progressions: readonly ExerciseProgression[];
  public contraindications: readonly IContraindication[];
  public prerequisites: readonly IExercisePrerequisite[];
  public mediaUrls: readonly string[];
  public mediaTypes: readonly MediaType[];
  public tags: readonly string[];
  public estimatedDuration: number;
  public caloriesBurnedPerMinute?: number;
  public minimumAge?: number;
  public maximumAge?: number;
  public readonly createdAt: Date;
  public readonly updatedAt: Date;
  public readonly createdBy: Types.ObjectId;
  public readonly isActive: boolean;
  public isDraft: boolean;
  public publishedAt?: Date;
  public reviewedBy?: Types.ObjectId;

  constructor(data: {
    id: Types.ObjectId;
    name: string;
    description: string;
    type: ExerciseType;
    difficulty: Difficulty;
    primaryMuscles: readonly MuscleZone[];
    secondaryMuscles?: readonly MuscleZone[];
    equipment?: readonly EquipmentCategory[];
    instructions?: readonly ExerciseInstruction[];
    progressions?: readonly ExerciseProgression[];
    contraindications?: readonly IContraindication[];
    prerequisites?: readonly IExercisePrerequisite[];
    mediaUrls?: readonly string[];
    mediaTypes?: readonly MediaType[];
    tags?: readonly string[];
    estimatedDuration?: number;
    caloriesBurnedPerMinute?: number;
    minimumAge?: number;
    maximumAge?: number;
    createdAt: Date;
    updatedAt: Date;
    createdBy: Types.ObjectId;
    isActive: boolean;
    isDraft?: boolean;
    publishedAt?: Date;
    reviewedBy?: Types.ObjectId;
  }) {
    this.id = data.id;
    this.name = data.name;
    this.description = data.description;
    this.type = data.type;
    this.difficulty = data.difficulty;
    this.primaryMuscles = data.primaryMuscles;
    this.secondaryMuscles = data.secondaryMuscles ?? [];
    this.equipment = data.equipment ?? [];
    this.instructions = data.instructions ?? [];
    this.progressions = data.progressions ?? [];
    this.contraindications = data.contraindications ?? [];
    this.prerequisites = data.prerequisites ?? [];
    this.mediaUrls = data.mediaUrls ?? [];
    this.mediaTypes = data.mediaTypes ?? [];
    this.tags = data.tags ?? [];
    this.estimatedDuration = data.estimatedDuration ?? 5;
    this.caloriesBurnedPerMinute = data.caloriesBurnedPerMinute;
    this.minimumAge = data.minimumAge;
    this.maximumAge = data.maximumAge;
    this.createdAt = data.createdAt;
    this.updatedAt = data.updatedAt;
    this.createdBy = data.createdBy;
    this.isActive = data.isActive;
    this.isDraft = data.isDraft ?? false;
    this.publishedAt = data.publishedAt;
    this.reviewedBy = data.reviewedBy;
  }

  // ICloneable Implementation
  clone(): Exercise {
    return new Exercise({
      ...this,
      id: new Types.ObjectId(),
      isDraft: true,
      publishedAt: undefined,
      reviewedBy: undefined,
      createdAt: new Date(),
      updatedAt: new Date()
    });
  }

  cloneWithModifications(modifications: Partial<Exercise>): Exercise {
    return new Exercise({
      ...this,
      ...modifications,
      id: new Types.ObjectId(),
      isDraft: true,
      publishedAt: undefined,
      reviewedBy: undefined,
      createdAt: new Date(),
      updatedAt: new Date()
    } as any);
  }

  // IShareable Implementation
  canBeSharedWith(user: User): boolean {
    return !this.isDraft && this.isActive && !!this.publishedAt;
  }

  // IDraftable Implementation
  validateForPublication(): ValidationResult {
    const errors: any[] = [];
    const warnings: any[] = [];

    if (!this.name || this.name.trim().length < 3) {
      errors.push({ field: 'name', message: 'Name must be at least 3 characters', code: 'min_length' });
    }

    if (!this.description || this.description.trim().length < 10) {
      errors.push({ field: 'description', message: 'Description must be at least 10 characters', code: 'min_length' });
    }

    if (!this.primaryMuscles || this.primaryMuscles.length === 0) {
      errors.push({ field: 'primaryMuscles', message: 'At least one primary muscle is required', code: 'required' });
    }

    if (this.instructions.length === 0) {
      errors.push({ field: 'instructions', message: 'At least one instruction is required', code: 'required' });
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      isDraftValid: true,
      requiredForPublication: ['name', 'description', 'primaryMuscles', 'instructions'],
      canSaveDraft: () => true,
      canPublish: () => errors.length === 0
    };
  }

  validateDraft(): ValidationResult {
    const errors: any[] = [];
    const warnings: any[] = [];

    if (!this.name || this.name.trim().length === 0) {
      errors.push({ field: 'name', message: 'Name is required', code: 'required' });
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      isDraftValid: errors.length === 0,
      requiredForPublication: ['name', 'description', 'primaryMuscles', 'instructions'],
      canSaveDraft: () => errors.length === 0,
      canPublish: () => false
    };
  }

  canBePublished(): boolean {
    return this.validateForPublication().canPublish();
  }

  publish(): Exercise {
    const validation = this.validateForPublication();
    if (!validation.canPublish()) {
      throw new Error(`Cannot publish exercise: ${validation.errors.map(e => e.message).join(', ')}`);
    }

    return new Exercise({
      ...this,
      isDraft: false,
      publishedAt: new Date(),
      updatedAt: new Date()
    });
  }

  saveDraft(): Exercise {
    return new Exercise({
      ...this,
      isDraft: true,
      updatedAt: new Date()
    });
  }

  getDraftPreview(): IDraftPreview {
    const requiredFields = ['name', 'description', 'primaryMuscles', 'instructions'];
    const missingFields: string[] = [];

    if (!this.name || this.name.trim().length < 3) missingFields.push('name');
    if (!this.description || this.description.trim().length < 10) missingFields.push('description');
    if (!this.primaryMuscles || this.primaryMuscles.length === 0) missingFields.push('primaryMuscles');
    if (this.instructions.length === 0) missingFields.push('instructions');

    const completionPercentage = Math.round(((requiredFields.length - missingFields.length) / requiredFields.length) * 100);

    // Calculate optional fields completed
    const optionalFields = ['secondaryMuscles', 'equipment', 'tags', 'mediaUrls', 'progressions', 'contraindications', 'prerequisites'];
    const completedOptionalFields = optionalFields.filter(field => {
      switch (field) {
        case 'secondaryMuscles': return this.secondaryMuscles.length > 0;
        case 'equipment': return this.equipment.length > 0;
        case 'tags': return this.tags.length > 0;
        case 'mediaUrls': return this.mediaUrls.length > 0;
        case 'progressions': return this.progressions.length > 0;
        case 'contraindications': return this.contraindications.length > 0;
        case 'prerequisites': return this.prerequisites.length > 0;
        default: return false;
      }
    });

    return {
      completionPercentage,
      missingRequiredFields: missingFields,
      estimatedTimeToComplete: missingFields.length * 5,
      lastModified: this.updatedAt,
      optionalFieldsCompleted: completedOptionalFields
    };
  }

  // Exercise-Specific Methods
  targetsMuscle(muscle: MuscleZone): boolean {
    return this.primaryMuscles.includes(muscle) || this.secondaryMuscles.includes(muscle);
  }

  requiresEquipment(equipment: EquipmentCategory): boolean {
    return this.equipment.includes(equipment);
  }

  hasContraindicationsFor(conditions: readonly string[]): boolean {
    return this.contraindications.some(contraindication =>
      contraindication.conditions.some(condition =>
        conditions.some(userCondition =>
          userCondition.toLowerCase().includes(condition.toLowerCase())
        )
      )
    );
  }

  hasPrerequisites(): boolean {
    return this.prerequisites.length > 0;
  }

  checkPrerequisites(userPerformances: readonly IUserPerformance[]): readonly IPrerequisiteStatus[] {
    return this.prerequisites.map(prerequisite => {
      const userPerformance = userPerformances.find(p =>
        p.exerciseId.toString() === prerequisite.exerciseId.toString()
      );

      return this.evaluatePrerequisite(prerequisite, userPerformance);
    });
  }

  isRecommendedFor(userPerformances: readonly IUserPerformance[]): boolean {
    if (this.prerequisites.length === 0) {
      return true;
    }

    const prerequisiteStatuses = this.checkPrerequisites(userPerformances);
    const requiredPrerequisites = prerequisiteStatuses.filter(status =>
      status.prerequisite.isRequired ?? false
    );

    if (requiredPrerequisites.length === 0) {
      // If no required prerequisites, recommend if majority are met
      const metCount = prerequisiteStatuses.filter(status => status.isMet).length;
      return metCount >= Math.ceil(prerequisiteStatuses.length * 0.6);
    }

    // All required prerequisites must be met
    return requiredPrerequisites.every(status => status.isMet);
  }

  getPrerequisiteReadiness(userPerformances: readonly IUserPerformance[]): number {
    if (this.prerequisites.length === 0) {
      return 100;
    }

    const prerequisiteStatuses = this.checkPrerequisites(userPerformances);
    const totalProgress = prerequisiteStatuses.reduce((sum, status) => sum + status.progress, 0);
    return Math.round(totalProgress / prerequisiteStatuses.length);
  }

  canUserAttempt(userPerformances: readonly IUserPerformance[]): boolean {
    // Users can always attempt exercises, prerequisites are only for recommendations
    return true;
  }

  getRecommendationScore(userPerformances: readonly IUserPerformance[], criteria?: IRecommendationCriteria): number {
    let score = 50; // Base score

    // Boost score based on prerequisite readiness
    const readiness = this.getPrerequisiteReadiness(userPerformances);
    score += (readiness / 100) * 30;

    // Boost if recommended
    if (this.isRecommendedFor(userPerformances)) {
      score += 20;
    }

    // Apply criteria-based adjustments
    if (criteria) {
      // Fitness level alignment
      if (criteria.fitnessLevel) {
        const difficultyLevels = {
          [Difficulty.BEGINNER_I]: 1, [Difficulty.BEGINNER_II]: 2, [Difficulty.BEGINNER_III]: 3,
          [Difficulty.INTERMEDIATE_I]: 4, [Difficulty.INTERMEDIATE_II]: 5, [Difficulty.INTERMEDIATE_III]: 6,
          [Difficulty.ADVANCED_I]: 7, [Difficulty.ADVANCED_II]: 8, [Difficulty.ADVANCED_III]: 9,
          [Difficulty.MASTER]: 10
        };
        const userLevel = difficultyLevels[criteria.fitnessLevel] ?? 5;
        const exerciseLevel = difficultyLevels[this.difficulty] ?? 5;
        
        if (exerciseLevel <= userLevel) {
          score += 10;
        } else if (exerciseLevel > userLevel + 1) {
          score -= 15;
        }
      }

      // Time availability
      if (criteria.availableTime && this.estimatedDuration <= criteria.availableTime) {
        score += 10;
      }

      // Preferred muscles
      if (criteria.preferredMuscles?.length) {
        const matchCount = this.primaryMuscles.filter(muscle => 
          criteria.preferredMuscles!.includes(muscle)
        ).length;
        score += matchCount * 5;
      }

      // Equipment exclusions
      if (criteria.excludedEquipment?.length) {
        const hasExcludedEquipment = this.equipment.some(eq => 
          criteria.excludedEquipment!.includes(eq)
        );
        if (hasExcludedEquipment) {
          score -= 20;
        }
      }
    }

    return Math.min(100, Math.max(0, Math.round(score)));
  }

  getComplexityScore(): number {
    let score = 0;

    // Base difficulty
    const difficultyLevels = {
      [Difficulty.BEGINNER_I]: 1, [Difficulty.BEGINNER_II]: 2, [Difficulty.BEGINNER_III]: 3,
      [Difficulty.INTERMEDIATE_I]: 4, [Difficulty.INTERMEDIATE_II]: 5, [Difficulty.INTERMEDIATE_III]: 6,
      [Difficulty.ADVANCED_I]: 7, [Difficulty.ADVANCED_II]: 8, [Difficulty.ADVANCED_III]: 9,
      [Difficulty.MASTER]: 10
    };
    score += (difficultyLevels[this.difficulty] ?? 5) * 10;

    // Muscle complexity
    score += this.primaryMuscles.length * 5;
    score += this.secondaryMuscles.length * 3;

    // Equipment complexity
    score += this.equipment.length * 8;

    // Instruction complexity
    score += this.instructions.length * 3;

    // Prerequisite complexity
    score += this.prerequisites.length * 5;

    return Math.round(score);
  }

  // Update Operations
  update(updates: Partial<Exercise>): Exercise {
    return new Exercise({
      ...this,
      ...updates,
      updatedAt: new Date()
    } as any);
  }

  addInstruction(instruction: ExerciseInstruction): Exercise {
    return new Exercise({
      ...this,
      instructions: [...this.instructions, instruction],
      updatedAt: new Date()
    });
  }

  addProgression(progression: ExerciseProgression): Exercise {
    return new Exercise({
      ...this,
      progressions: [...this.progressions, progression],
      updatedAt: new Date()
    });
  }

  addContraindication(contraindication: IContraindication): Exercise {
    return new Exercise({
      ...this,
      contraindications: [...this.contraindications, contraindication],
      updatedAt: new Date()
    });
  }

  addPrerequisite(prerequisite: IExercisePrerequisite): Exercise {
    return new Exercise({
      ...this,
      prerequisites: [...this.prerequisites, prerequisite],
      updatedAt: new Date()
    });
  }

  removePrerequisite(prerequisiteId: Types.ObjectId): Exercise {
    return new Exercise({
      ...this,
      prerequisites: this.prerequisites.filter(p => !p.id.equals(prerequisiteId)),
      updatedAt: new Date()
    });
  }

  // Status Methods
  isPublished(): boolean {
    return !this.isDraft && !!this.publishedAt;
  }

  needsReview(): boolean {
    return this.isPublished() && !this.reviewedBy;
  }

  private evaluatePrerequisite(
    prerequisite: IExercisePrerequisite,
    userPerformance?: IUserPerformance
  ): IPrerequisiteStatus {
    if (!userPerformance) {
      return {
        prerequisite,
        userPerformance: undefined,
        isMet: false,
        progress: 0,
        readinessScore: 0,
        missingRequirements: ['No performance data available'],
        estimatedTimeToMeet: 30 // days
      };
    }

    let currentValue = 0;
    let isMet = false;
    const missingRequirements: string[] = [];

    switch (prerequisite.category) {
      case PrerequisiteCategory.REPS:
        currentValue = userPerformance.bestReps ?? 0;
        isMet = currentValue >= prerequisite.minRecommended;
        if (!isMet) {
          missingRequirements.push(`Need ${prerequisite.minRecommended - currentValue} more reps`);
        }
        break;

      case PrerequisiteCategory.HOLD_TIME:
        currentValue = userPerformance.bestHoldTime ?? 0;
        isMet = currentValue >= prerequisite.minRecommended;
        if (!isMet) {
          missingRequirements.push(`Need to hold ${prerequisite.minRecommended - currentValue} more seconds`);
        }
        break;

      case PrerequisiteCategory.DURATION:
        currentValue = userPerformance.bestDuration ?? 0;
        isMet = currentValue >= prerequisite.minRecommended;
        if (!isMet) {
          missingRequirements.push(`Need ${prerequisite.minRecommended - currentValue} more seconds duration`);
        }
        break;

      case PrerequisiteCategory.WEIGHT:
        currentValue = userPerformance.bestWeight ?? 0;
        isMet = currentValue >= prerequisite.minRecommended;
        if (!isMet) {
          missingRequirements.push(`Need ${prerequisite.minRecommended - currentValue} more kg`);
        }
        break;

      case PrerequisiteCategory.CONSISTENCY:
        currentValue = userPerformance.consistentDays ?? 0;
        isMet = currentValue >= prerequisite.minRecommended;
        if (!isMet) {
          missingRequirements.push(`Need ${prerequisite.minRecommended - currentValue} more consistent days`);
        }
        break;

      case PrerequisiteCategory.FORM:
        currentValue = userPerformance.formQuality ?? 0;
        isMet = currentValue >= prerequisite.minRecommended;
        if (!isMet) {
          missingRequirements.push(`Need form quality score of ${prerequisite.minRecommended}`);
        }
        break;
    }

    const progress = Math.min(100, Math.round((currentValue / prerequisite.minRecommended) * 100));
    const readinessScore = Math.min(100, progress);

    return {
      prerequisite,
      userPerformance,
      isMet,
      progress,
      readinessScore,
      missingRequirements,
      estimatedTimeToMeet: isMet ? 0 : Math.max(7, Math.round((prerequisite.minRecommended - currentValue) * 2))
    };
  }
}
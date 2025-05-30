import { Types } from 'mongoose';
import { Exercise } from '../entities/Exercise';
import { ExerciseInstruction } from '../entities/ExerciseInstruction';
import { ExerciseProgression, IExercisePrerequisite, IProgressionWithPrerequisitesOptions } from '../entities/ExerciseProgression';
import {
  ExerciseType,
  Difficulty,
  MuscleZone,
  EquipmentCategory
} from '../../../types/fitness/enums/exercise';
import { MediaType } from '../../../types/fitness/enums/media';
import { IContraindication, ContraindicationType, ContraindicationSeverity } from '../interfaces/ExerciseInterfaces';
import { ExerciseConfig } from '../config/ExerciseConfig';

export class ExerciseBuilder {
  private readonly exercise: Partial<Exercise> & {
    id: Types.ObjectId;
    createdAt: Date;
    updatedAt: Date;
    createdBy: Types.ObjectId;
  };
  private readonly instructions: ExerciseInstruction[] = [];
  private readonly progressions: ExerciseProgression[] = [];
  private readonly contraindications: IContraindication[] = [];

  constructor(name: string, createdBy: Types.ObjectId) {
    const now = new Date();
    const defaults = ExerciseConfig.defaults;

    this.exercise = {
      id: new Types.ObjectId(),
      name: name.trim(),
      type: defaults.type,
      difficulty: defaults.difficulty,
      primaryMuscles: [],
      secondaryMuscles: [],
      equipment: defaults.equipment,
      tags: [],
      estimatedDuration: defaults.estimatedDuration,
      caloriesBurnedPerMinute: defaults.caloriesBurnedPerMinute,
      isDraft: defaults.isDraft,
      isActive: defaults.isActive,
      createdAt: now,
      updatedAt: now,
      createdBy
    };
  }

  withDescription(description: string): this {
    this.exercise.description = description.trim();
    return this;
  }

  withType(type: ExerciseType): this {
    this.exercise.type = type;
    return this;
  }

  withDifficulty(difficulty: Difficulty): this {
    this.exercise.difficulty = difficulty;
    return this;
  }

  withPrimaryMuscles(...muscles: MuscleZone[]): this {
    this.exercise.primaryMuscles = [...(this.exercise.primaryMuscles ?? []), ...muscles];
    return this;
  }

  withSecondaryMuscles(...muscles: MuscleZone[]): this {
    this.exercise.secondaryMuscles = [...(this.exercise.secondaryMuscles ?? []), ...muscles];
    return this;
  }

  withEquipment(...equipment: EquipmentCategory[]): this {
    this.exercise.equipment = [...(this.exercise.equipment ?? []), ...equipment];
    return this;
  }

  withBodyweightOnly(): this {
    this.exercise.equipment = [EquipmentCategory.BODYWEIGHT];
    return this;
  }

  withDuration(minutes: number): this {
    this.exercise.estimatedDuration = minutes;
    return this;
  }

  withCaloriesBurn(caloriesPerMinute: number): this {
    this.exercise.caloriesBurnedPerMinute = caloriesPerMinute;
    return this;
  }

  withTags(...tags: string[]): this {
    this.exercise.tags = [...(this.exercise.tags ?? []), ...tags];
    return this;
  }

  withPrerequisites(...prerequisites: Types.ObjectId[]): this {
    this.exercise.prerequisites = [...(this.exercise.prerequisites ?? []), ...prerequisites];
    return this;
  }

  withMedia(url: string, type: MediaType): this {
    this.exercise.mediaUrls = [...(this.exercise.mediaUrls ?? []), url];
    this.exercise.mediaTypes = [...(this.exercise.mediaTypes ?? []), type];
    return this;
  }

  withImage(url: string): this {
    return this.withMedia(url, MediaType.IMAGE);
  }

  withVideo(url: string): this {
    return this.withMedia(url, MediaType.VIDEO);
  }

  addInstruction(
    stepNumber: number,
    title: string,
    description: string,
    options?: {
      duration?: number;
      mediaUrl?: string;
      mediaType?: MediaType;
      tips?: string[];
      commonMistakes?: string[];
      isOptional?: boolean;
    }
  ): this {
    const instruction = new ExerciseInstruction({
      id: new Types.ObjectId(),
      exerciseId: this.exercise.id,
      stepNumber,
      title,
      description,
      duration: options?.duration,
      mediaUrl: options?.mediaUrl,
      mediaType: options?.mediaType,
      tips: options?.tips ?? [],
      commonMistakes: options?.commonMistakes ?? [],
      isOptional: options?.isOptional ?? false,
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: this.exercise.createdBy,
      isActive: true,
      isDraft: true
    });

    this.instructions.push(instruction);
    return this;
  }

  addWarmupInstruction(description: string, duration?: number): this {
    return this.addInstruction(
      this.instructions.length + 1,
      'Warm-up',
      description,
      { duration }
    );
  }

  addCooldownInstruction(description: string, duration?: number): this {
    return this.addInstruction(
      this.instructions.length + 1,
      'Cool-down',
      description,
      { duration }
    );
  }

  addProgressionWithPrerequisites(options: IProgressionWithPrerequisitesOptions): this {
    const prerequisiteObjects: IExercisePrerequisite[] = options.prerequisites.map(prereq => ({
      exerciseId: prereq.exerciseId,
      exerciseName: prereq.exerciseName,
      minimumPerformance: {
        reps: prereq.reps,
        sets: prereq.sets,
        duration: prereq.duration,
        holdTime: prereq.holdTime,
        consecutiveDays: prereq.consecutiveDays,
        weight: prereq.weight
      },
      isRequired: prereq.isRequired ?? true,
      description: prereq.description
    }));
  
    const progression = new ExerciseProgression({
      id: new Types.ObjectId(),
      exerciseId: this.exercise.id,
      fromDifficulty: options.fromDifficulty,
      toDifficulty: options.toDifficulty,
      title: options.title,
      description: options.description,
      criteria: options.criteria,
      modifications: options.modifications,
      prerequisites: prerequisiteObjects,
      targetExerciseId: options.targetExerciseId,
      estimatedTimeToAchieve: options.estimatedTimeToAchieve ?? 14,
      order: options.order ?? this.progressions.length + 1,
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: this.exercise.createdBy,
      isActive: true,
      isDraft: false
    });
  
    this.progressions.push(progression);
    return this;
  }

  addProgression(
    fromDifficulty: Difficulty,
    toDifficulty: Difficulty,
    title: string,
    description: string,
    criteria: string[],
    modifications: string[],
    options?: {
      targetExerciseId?: Types.ObjectId;
      estimatedTimeToAchieve?: number;
      order?: number;
    }
  ): this {
    const progression = new ExerciseProgression({
      id: new Types.ObjectId(),
      exerciseId: this.exercise.id,
      fromDifficulty,
      toDifficulty,
      title,
      description,
      criteria,
      modifications,
      targetExerciseId: options?.targetExerciseId,
      estimatedTimeToAchieve: options?.estimatedTimeToAchieve ?? 14,
      order: options?.order ?? this.progressions.length + 1,
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: this.exercise.createdBy,
      isActive: true,
      isDraft: false
    });

    this.progressions.push(progression);
    return this;
  }

  addDifficultyProgression(
    targetDifficulty: Difficulty,
    modifications: string[],
    estimatedDays = 14
  ): this {
    const currentDifficulty = this.exercise.difficulty!;
    return this.addProgression(
      currentDifficulty,
      targetDifficulty,
      `Progress to ${targetDifficulty}`,
      `Advance from ${currentDifficulty} to ${targetDifficulty} level`,
      [`Master ${currentDifficulty} level`, 'Complete prerequisites'],
      modifications,
      { estimatedTimeToAchieve: estimatedDays }
    );
  }

  addContraindication(
    type: ContraindicationType,
    severity: ContraindicationSeverity,
    conditions: string[],
    description: string,
    alternatives: Types.ObjectId[] = []
  ): this {
    const contraindication: IContraindication = {
      id: new Types.ObjectId(),
      type,
      severity,
      conditions,
      description,
      alternatives
    };

    this.contraindications.push(contraindication);
    return this;
  }

  addMedicalContraindication(conditions: string[], description: string): this {
    return this.addContraindication(
      ContraindicationType.MEDICAL,
      ContraindicationSeverity.RELATIVE,
      conditions,
      description
    );
  }

  addInjuryContraindication(conditions: string[], description: string): this {
    return this.addContraindication(
      ContraindicationType.INJURY,
      ContraindicationSeverity.ABSOLUTE,
      conditions,
      description
    );
  }

  asDraft(): this {
    this.exercise.isDraft = true;
    return this;
  }

  asPublished(): this {
    this.exercise.isDraft = false;
    this.exercise.publishedAt = new Date();
    return this;
  }

  withReviewer(reviewerId: Types.ObjectId): this {
    this.exercise.reviewedBy = reviewerId;
    return this;
  }

  static beginnerStrengthExercise(name: string, createdBy: Types.ObjectId): ExerciseBuilder {
    return new ExerciseBuilder(name, createdBy)
      .withDescription(`A beginner-friendly strength exercise designed to build foundational muscle strength and proper movement patterns.`)
      .withType(ExerciseType.STRENGTH)
      .withDifficulty(Difficulty.BEGINNER_I)
      .withDuration(10)
      .withCaloriesBurn(3)
      .withTags('strength', 'beginner');
  }

  static cardioExercise(name: string, createdBy: Types.ObjectId): ExerciseBuilder {
    return new ExerciseBuilder(name, createdBy)
      .withDescription(`A cardiovascular exercise designed to improve heart health, endurance, and overall fitness levels.`)
      .withType(ExerciseType.CARDIO)
      .withDifficulty(Difficulty.INTERMEDIATE_I)
      .withDuration(20)
      .withCaloriesBurn(8)
      .withTags('cardio', 'endurance');
  }

  static flexibilityExercise(name: string, createdBy: Types.ObjectId): ExerciseBuilder {
    return new ExerciseBuilder(name, createdBy)
      .withDescription(`A flexibility and mobility exercise designed to improve range of motion and reduce muscle tension.`)
      .withType(ExerciseType.FLEXIBILITY)
      .withDifficulty(Difficulty.BEGINNER_I)
      .withDuration(5)
      .withCaloriesBurn(2)
      .withTags('flexibility', 'mobility');
  }

  static rehabExercise(name: string, createdBy: Types.ObjectId): ExerciseBuilder {
    return new ExerciseBuilder(name, createdBy)
      .withDescription(`A rehabilitation exercise designed to restore function and mobility while preventing further injury.`)
      .withType(ExerciseType.REHABILITATION)
      .withDifficulty(Difficulty.BEGINNER_I)
      .withDuration(15)
      .withCaloriesBurn(2)
      .withTags('rehabilitation', 'recovery')
      .addMedicalContraindication(
        ['acute inflammation', 'severe pain'],
        'Do not perform during acute injury phase'
      );
  }

  validate(): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];
    const rules = ExerciseConfig.validation;

    if (!this.exercise.name || this.exercise.name.trim().length < rules.nameMinLength) {
      errors.push('Exercise name must be at least 3 characters');
    }

    if (!this.exercise.description || this.exercise.description.trim().length < rules.descriptionMinLength) {
      errors.push('Exercise description must be at least 10 characters');
    }

    if (!this.exercise.primaryMuscles || this.exercise.primaryMuscles.length === 0) {
      errors.push('At least one primary muscle group is required');
    }

    if (this.instructions.length === 0 && !this.exercise.isDraft) {
      errors.push('Published exercises require at least one instruction');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  build(): Exercise {
    const validation = this.validate();
    if (!validation.isValid) {
      throw new Error(`Cannot build exercise: ${validation.errors.join(', ')}`);
    }

    return new Exercise({
      ...(this.exercise as any),
      instructions: this.instructions,
      progressions: this.progressions,
      contraindications: this.contraindications
    });
  }

  buildDraft(): Exercise {
    return new Exercise({
      ...(this.exercise as any),
      instructions: this.instructions,
      progressions: this.progressions,
      contraindications: this.contraindications,
      isDraft: true
    });
  }
}


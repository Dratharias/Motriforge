import { Types } from 'mongoose';
import { Exercise } from '../entities/Exercise';
import {
  IExerciseRepository,
  IExerciseCreationData
} from '../interfaces/ExerciseInterfaces';
import { ExerciseDefaults } from '../config/ExerciseDefaults';
import { ExerciseValidatorFacade } from '../validation/ExerciseValidatorFacade';
import { ValidationError } from '../../../infrastructure/errors/types/ValidationError';
import { MuscleZone } from '../../../types/fitness/enums/exercise';

export class ExerciseCreationService {
  constructor(
    private readonly exerciseRepository: IExerciseRepository,
    private readonly validator: ExerciseValidatorFacade
  ) {}

  async createExercise(
    data: IExerciseCreationData,
    createdBy: Types.ObjectId
  ): Promise<Exercise> {
    await this.validateCreationData(data);

    const isNameAvailable = await this.exerciseRepository.isNameAvailable(data.name);
    if (!isNameAvailable) {
      throw new ValidationError(
        'name',
        data.name,
        'unique',
        'Exercise name is already taken'
      );
    }

    const exercise = this.buildExercise(data, createdBy);

    const validationResult = this.validator.validateForDraft(exercise);
    if (!validationResult.canSaveDraft()) {
      throw new ValidationError(
        'exercise',
        exercise,
        'validation_failed',
        `Exercise validation failed: ${validationResult.errors.map(e => e.message).join(', ')}`
      );
    }

    return await this.exerciseRepository.create(exercise);
  }

  async bulkCreateExercises(
    exercisesData: readonly IExerciseCreationData[],
    createdBy: Types.ObjectId
  ): Promise<readonly Exercise[]> {
    const exercises: Exercise[] = [];
    const validatedData: IExerciseCreationData[] = [];

    for (const data of exercisesData) {
      await this.validateCreationData(data);
      validatedData.push(data);
    }

    for (const data of validatedData) {
      const exercise = this.buildExercise(data, createdBy);
      const validationResult = this.validator.validateForDraft(exercise);
      if (!validationResult.canSaveDraft()) {
        throw new ValidationError(
          'exercise',
          exercise,
          'validation_failed',
          `Exercise "${data.name}" validation failed: ${validationResult.errors.map(e => e.message).join(', ')}`
        );
      }
      exercises.push(exercise);
    }

    return await this.exerciseRepository.bulkCreate(exercises);
  }

  async createTemplate(
    name: string,
    type: string,
    createdBy: Types.ObjectId
  ): Promise<Exercise> {
    const defaults = ExerciseDefaults.getCreationDefaults();

    const templateData: IExerciseCreationData = {
      name: `${name} (Template)`,
      description: `Template for ${name} exercise - customize as needed`,
      type: type as any,
      difficulty: defaults.difficulty,
      primaryMuscles: [MuscleZone.CORE], // Templates need at least one muscle to pass validation
      isDraft: true
    };

    return await this.createExercise(templateData, createdBy);
  }

  private buildExercise(data: IExerciseCreationData, createdBy: Types.ObjectId): Exercise {
    const now = new Date();
    const defaults = ExerciseDefaults.getCreationDefaults();

    return new Exercise({
      id: new Types.ObjectId(),
      name: data.name.trim(),
      description: data.description.trim(),
      type: data.type,
      difficulty: data.difficulty,
      primaryMuscles: data.primaryMuscles,
      secondaryMuscles: data.secondaryMuscles ?? [],
      equipment: data.equipment ?? defaults.equipment,
      tags: data.tags ?? defaults.tags,
      estimatedDuration: data.estimatedDuration ?? defaults.estimatedDuration,
      prerequisites: data.prerequisites ?? [],
      createdAt: now,
      updatedAt: now,
      createdBy,
      isActive: defaults.isActive,
      isDraft: data.isDraft ?? defaults.isDraft
    });
  }

  private async validateCreationData(data: IExerciseCreationData): Promise<void> {
    const rules = ExerciseDefaults.getValidationRules();

    if (!data.name || data.name.trim().length < rules.nameMinLength) {
      throw new ValidationError(
        'name',
        data.name,
        'min_length',
        `Exercise name must be at least ${rules.nameMinLength} characters`
      );
    }

    if (data.name.trim().length > rules.nameMaxLength) {
      throw new ValidationError(
        'name',
        data.name,
        'max_length',
        `Exercise name must be less than ${rules.nameMaxLength} characters`
      );
    }

    if (!data.description || data.description.trim().length < rules.descriptionMinLength) {
      throw new ValidationError(
        'description',
        data.description,
        'min_length',
        `Exercise description must be at least ${rules.descriptionMinLength} characters`
      );
    }

    if (!data.primaryMuscles || data.primaryMuscles.length === 0) {
      throw new ValidationError(
        'primaryMuscles',
        data.primaryMuscles,
        'required',
        'At least one primary muscle group is required'
      );
    }
  }
}
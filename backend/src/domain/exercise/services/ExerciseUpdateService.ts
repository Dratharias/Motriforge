import { Types } from 'mongoose';
import { Exercise } from '../entities/Exercise';
import {
  IExerciseRepository,
  IExerciseUpdateData
} from '../interfaces/ExerciseInterfaces';
import { ExerciseValidatorFacade } from '../validation/ExerciseValidatorFacade';
import { ValidationError } from '../../../infrastructure/errors/types/ValidationError';

/**
 * Service responsible for updating existing exercises
 */
export class ExerciseUpdateService {
  constructor(
    private readonly exerciseRepository: IExerciseRepository,
    private readonly validator: ExerciseValidatorFacade
  ) {}

  /**
   * Update an existing exercise
   */
  async updateExercise(
    id: Types.ObjectId,
    updates: IExerciseUpdateData
  ): Promise<Exercise | null> {
    // Get current exercise
    const currentExercise = await this.exerciseRepository.findById(id);
    if (!currentExercise) {
      throw new ValidationError(
        'exercise',
        id,
        'not_found',
        'Exercise not found'
      );
    }

    // Validate update data
    await this.validateUpdateData(updates, id);

    // Apply updates and validate
    const updatedExercise = currentExercise.update(updates);
    
    const validationResult = currentExercise.isDraft ? 
      this.validator.validateForDraft(updatedExercise) :
      this.validator.validateForPublication(updatedExercise);

    if (!validationResult.canSaveDraft()) {
      throw new ValidationError(
        'exercise',
        updatedExercise,
        'validation_failed',
        `Update validation failed: ${validationResult.errors.map(e => e.message).join(', ')}`
      );
    }

    return await this.exerciseRepository.update(id, updatedExercise);
  }

  /**
   * Update multiple exercises in batch
   */
  async bulkUpdateExercises(
    updates: ReadonlyArray<{ id: Types.ObjectId; updates: IExerciseUpdateData }>
  ): Promise<readonly Exercise[]> {
    const validatedUpdates: Array<{ id: Types.ObjectId; updates: Partial<Exercise> }> = [];

    // Validate all updates first
    for (const update of updates) {
      await this.validateUpdateData(update.updates, update.id);
      
      const currentExercise = await this.exerciseRepository.findById(update.id);
      if (!currentExercise) {
        throw new ValidationError(
          'exercise',
          update.id,
          'not_found',
          `Exercise ${update.id} not found`
        );
      }

      const updatedExercise = currentExercise.update(update.updates);
      const validationResult = this.validator.validateForDraft(updatedExercise);
      
      if (!validationResult.canSaveDraft()) {
        throw new ValidationError(
          'exercise',
          update.id,
          'validation_failed',
          `Exercise ${update.id} validation failed`
        );
      }

      validatedUpdates.push({
        id: update.id,
        updates: updatedExercise
      });
    }

    return await this.exerciseRepository.bulkUpdate(validatedUpdates);
  }

  /**
   * Archive an exercise (soft delete)
   */
  async archiveExercise(id: Types.ObjectId): Promise<boolean> {
    const exercise = await this.exerciseRepository.findById(id);
    if (!exercise) {
      return false;
    }

    // Check if exercise can be archived
    const canArchive = await this.canExerciseBeArchived(id);
    if (!canArchive) {
      throw new ValidationError(
        'exercise',
        id,
        'archive_validation',
        'Cannot archive exercise that is actively used in workouts or programs'
      );
    }

    return await this.exerciseRepository.archive(id);
  }

  /**
   * Restore an archived exercise
   */
  async restoreExercise(id: Types.ObjectId): Promise<boolean> {
    return await this.exerciseRepository.restore(id);
  }

  /**
   * Permanently delete an exercise
   */
  async deleteExercise(id: Types.ObjectId): Promise<boolean> {
    const exercise = await this.exerciseRepository.findById(id);
    if (!exercise) {
      return false;
    }

    // Only allow deletion of draft exercises or archived exercises
    if (!exercise.isDraft && exercise.isActive) {
      throw new ValidationError(
        'exercise',
        id,
        'delete_validation',
        'Cannot delete published active exercises. Archive first.'
      );
    }

    return await this.exerciseRepository.delete(id);
  }

  private async validateUpdateData(
    updates: IExerciseUpdateData, 
    exerciseId: Types.ObjectId
  ): Promise<void> {
    // Validate name uniqueness if name is being updated
    if (updates.name !== undefined) {
      const trimmedName = updates.name.trim();
      const isNameAvailable = await this.exerciseRepository.isNameAvailable(
        trimmedName, 
        exerciseId
      );
      
      if (!isNameAvailable) {
        throw new ValidationError(
          'name',
          trimmedName,
          'unique',
          'Exercise name is already taken'
        );
      }
    }

    // Validate primary muscles requirement
    if (updates.primaryMuscles !== undefined && updates.primaryMuscles.length === 0) {
      throw new ValidationError(
        'primaryMuscles',
        updates.primaryMuscles,
        'required',
        'At least one primary muscle group is required'
      );
    }

    // Validate age restrictions
    if (updates.minimumAge !== undefined && updates.maximumAge !== undefined) {
      if (updates.minimumAge >= updates.maximumAge) {
        throw new ValidationError(
          'maximumAge',
          updates.maximumAge,
          'logical_error',
          'Maximum age must be greater than minimum age'
        );
      }
    }
  }

  private async canExerciseBeArchived(exerciseId: Types.ObjectId): Promise<boolean> {
    // TODO: Check if exercise is used in any active workouts or programs
    // For now, always allow archiving
    return true;
  }
}


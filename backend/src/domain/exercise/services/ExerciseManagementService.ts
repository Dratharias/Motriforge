import { Types } from 'mongoose';
import { Exercise } from '../entities/Exercise';
import { ExerciseValidator } from '../validation/ExerciseValidator';
import { IExerciseRepository } from '../interfaces/ExerciseInterfaces';
import { ExerciseConfig } from '../config/ExerciseConfig';
import { ValidationError } from '../../../infrastructure/errors/types/ValidationError';

export interface ExerciseCreationData {
  readonly name: string;
  readonly description: string;
  readonly type: any;
  readonly difficulty: any;
  readonly primaryMuscles: readonly any[];
  readonly secondaryMuscles?: readonly any[];
  readonly equipment?: readonly any[];
  readonly tags?: readonly string[];
  readonly estimatedDuration?: number;
  readonly isDraft?: boolean;
}

export interface ExerciseUpdateData {
  readonly name?: string;
  readonly description?: string;
  readonly type?: any;
  readonly difficulty?: any;
  readonly primaryMuscles?: readonly any[];
  readonly secondaryMuscles?: readonly any[];
  readonly equipment?: readonly any[];
  readonly estimatedDuration?: number;
}

export class ExerciseManagementService {
  constructor(
    private readonly repository: IExerciseRepository,
    private readonly validator: ExerciseValidator
  ) {}

  async createExercise(data: ExerciseCreationData, createdBy: Types.ObjectId): Promise<Exercise> {
    // Check name availability
    const isNameAvailable = await this.repository.isNameAvailable(data.name);
    if (!isNameAvailable) {
      throw new ValidationError('name', data.name, 'unique', 'Exercise name is already taken');
    }

    // Build exercise
    const exercise = this.buildExercise(data, createdBy);

    // Validate for draft
    const validation = this.validator.validateForDraft(exercise);
    if (!validation.canSaveDraft()) {
      throw new ValidationError('exercise', exercise, 'validation_failed',
        `Validation failed: ${validation.errors.map(e => e.message).join(', ')}`);
    }

    return await this.repository.create(exercise);
  }

  async updateExercise(id: Types.ObjectId, updates: ExerciseUpdateData): Promise<Exercise | null> {
    const currentExercise = await this.repository.findById(id);
    if (!currentExercise) {
      throw new ValidationError('exercise', id, 'not_found', 'Exercise not found');
    }

    // Check name availability if name is being updated
    if (updates.name && updates.name !== currentExercise.name) {
      const isNameAvailable = await this.repository.isNameAvailable(updates.name, id);
      if (!isNameAvailable) {
        throw new ValidationError('name', updates.name, 'unique', 'Exercise name is already taken');
      }
    }

    const updatedExercise = currentExercise.update(updates);
    
    // Validate based on draft status
    const validation = currentExercise.isDraft ? 
      this.validator.validateForDraft(updatedExercise) :
      this.validator.validateForPublication(updatedExercise);

    if (!validation.canSaveDraft()) {
      throw new ValidationError('exercise', updatedExercise, 'validation_failed',
        `Update validation failed: ${validation.errors.map(e => e.message).join(', ')}`);
    }

    return await this.repository.update(id, updatedExercise);
  }

  async cloneExercise(sourceId: Types.ObjectId, createdBy: Types.ObjectId, modifications: Partial<ExerciseCreationData> = {}): Promise<Exercise> {
    const sourceExercise = await this.repository.findById(sourceId);
    if (!sourceExercise) {
      throw new ValidationError('exercise', sourceId, 'not_found', 'Source exercise not found');
    }

    // Generate unique name
    let cloneName = modifications.name ?? sourceExercise.name;
    if (!modifications.name) {
      cloneName = await this.generateUniqueCloneName(sourceExercise.name);
    }

    const clonedExercise = sourceExercise.cloneWithModifications({
      ...modifications,
      name: cloneName,
      createdBy,
      createdAt: new Date(),
      updatedAt: new Date()
    });

    return await this.repository.create(clonedExercise);
  }

  async deleteExercise(id: Types.ObjectId): Promise<boolean> {
    const exercise = await this.repository.findById(id);
    if (!exercise) {
      return false;
    }

    if (!exercise.isDraft && exercise.isActive) {
      throw new ValidationError('exercise', id, 'delete_validation',
        'Cannot delete published active exercises. Archive first.');
    }

    return await this.repository.delete(id);
  }

  async archiveExercise(id: Types.ObjectId): Promise<boolean> {
    return await this.repository.archive(id);
  }

  async restoreExercise(id: Types.ObjectId): Promise<boolean> {
    return await this.repository.restore(id);
  }

  private buildExercise(data: ExerciseCreationData, createdBy: Types.ObjectId): Exercise {
    const now = new Date();
    const defaults = ExerciseConfig.defaults;

    return new Exercise({
      id: new Types.ObjectId(),
      name: data.name.trim(),
      description: data.description.trim(),
      type: data.type,
      difficulty: data.difficulty,
      primaryMuscles: data.primaryMuscles,
      secondaryMuscles: data.secondaryMuscles ?? [],
      equipment: data.equipment ?? defaults.equipment,
      tags: data.tags ?? [],
      estimatedDuration: data.estimatedDuration ?? defaults.estimatedDuration,
      createdAt: now,
      updatedAt: now,
      createdBy,
      isActive: defaults.isActive,
      isDraft: data.isDraft ?? defaults.isDraft
    });
  }

  private async generateUniqueCloneName(originalName: string): Promise<string> {
    let cloneName = `${originalName} (Copy)`;
    let counter = 1;

    while (!(await this.repository.isNameAvailable(cloneName))) {
      counter++;
      cloneName = `${originalName} (Copy ${counter})`;
    }

    return cloneName;
  }
}
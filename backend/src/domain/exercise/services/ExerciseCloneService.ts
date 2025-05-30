import { Types } from 'mongoose';
import { Exercise } from '../entities/Exercise';
import { IExerciseRepository, IExerciseCreationData } from '../interfaces/ExerciseInterfaces';
import { ValidationError } from '../../../infrastructure/errors/types/ValidationError';

/**
 * Service responsible for cloning exercises
 */
export class ExerciseCloneService {
  constructor(private readonly exerciseRepository: IExerciseRepository) {}

  /**
   * Clone an exercise with optional modifications
   */
  async cloneExercise(
    sourceId: Types.ObjectId,
    createdBy: Types.ObjectId,
    modifications: Partial<IExerciseCreationData> = {}
  ): Promise<Exercise> {
    const sourceExercise = await this.exerciseRepository.findById(sourceId);
    if (!sourceExercise) {
      throw new ValidationError(
        'exercise',
        sourceId,
        'not_found',
        'Source exercise not found'
      );
    }

    // Create cloned exercise
    const clonedExercise = sourceExercise.cloneWithModifications({
      ...modifications,
      createdBy,
      createdAt: new Date(),
      updatedAt: new Date()
    });

    // Generate unique name if not specified
    let finalName = modifications.name ?? clonedExercise.name;
    if (!modifications.name) {
      finalName = await this.generateUniqueCloneName(sourceExercise.name);
    }

    const finalExercise = new Exercise({
      ...clonedExercise,
      name: finalName
    });

    return await this.exerciseRepository.create(finalExercise);
  }

  /**
   * Clone exercise as template (removes most content, keeps structure)
   */
  async cloneAsTemplate(
    sourceId: Types.ObjectId,
    templateName: string,
    createdBy: Types.ObjectId
  ): Promise<Exercise> {
    const sourceExercise = await this.exerciseRepository.findById(sourceId);
    if (!sourceExercise) {
      throw new ValidationError(
        'exercise',
        sourceId,
        'not_found',
        'Source exercise not found'
      );
    }

    const templateExercise = sourceExercise.cloneWithModifications({
      name: templateName,
      description: `Template based on ${sourceExercise.name}`,
      instructions: [], // Clear instructions
      progressions: [], // Clear progressions
      mediaUrls: [], // Clear media
      mediaTypes: [],
      contraindications: [], // Clear contraindications
      tags: [], // Clear tags
      isDraft: true,
      createdBy,
      createdAt: new Date(),
      updatedAt: new Date()
    });

    return await this.exerciseRepository.create(templateExercise);
  }

  /**
   * Clone with variation (creates a modified version)
   */
  async cloneAsVariation(
    sourceId: Types.ObjectId,
    variationName: string,
    createdBy: Types.ObjectId,
    modifications: {
      difficulty?: any;
      equipment?: any[];
      primaryMuscles?: any[];
      description?: string;
    } = {}
  ): Promise<Exercise> {
    const sourceExercise = await this.exerciseRepository.findById(sourceId);
    if (!sourceExercise) {
      throw new ValidationError(
        'exercise',
        sourceId,
        'not_found',
        'Source exercise not found'
      );
    }

    const variationExercise = sourceExercise.cloneWithModifications({
      name: variationName,
      description: modifications.description ?? 
        `Variation of ${sourceExercise.name}: ${modifications.difficulty ?? 'modified version'}`,
      difficulty: modifications.difficulty ?? sourceExercise.difficulty,
      equipment: modifications.equipment ?? sourceExercise.equipment,
      primaryMuscles: modifications.primaryMuscles ?? sourceExercise.primaryMuscles,
      isDraft: true,
      createdBy,
      createdAt: new Date(),
      updatedAt: new Date()
    });

    const createdVariation = await this.exerciseRepository.create(variationExercise);

    // Update source exercise to include this as a variation
    await this.addVariationReference(sourceId, createdVariation.id);

    return createdVariation;
  }

  /**
   * Bulk clone exercises
   */
  async bulkCloneExercises(
    sourceIds: readonly Types.ObjectId[],
    createdBy: Types.ObjectId,
    namePrefix?: string
  ): Promise<readonly Exercise[]> {
    const clonedExercises: Exercise[] = [];

    for (const sourceId of sourceIds) {
      const sourceExercise = await this.exerciseRepository.findById(sourceId);
      if (!sourceExercise) {
        continue; // Skip missing exercises
      }

      const cloneName = namePrefix ? 
        `${namePrefix} ${sourceExercise.name}` : 
        await this.generateUniqueCloneName(sourceExercise.name);

      const clonedExercise = sourceExercise.cloneWithModifications({
        name: cloneName,
        createdBy,
        createdAt: new Date(),
        updatedAt: new Date()
      });

      clonedExercises.push(clonedExercise);
    }

    return await this.exerciseRepository.bulkCreate(clonedExercises);
  }

  private async generateUniqueCloneName(originalName: string): Promise<string> {
    let cloneName = `${originalName} (Copy)`;
    let counter = 1;

    while (!(await this.exerciseRepository.isNameAvailable(cloneName))) {
      counter++;
      cloneName = `${originalName} (Copy ${counter})`;
    }

    return cloneName;
  }

  private async addVariationReference(
    sourceId: Types.ObjectId, 
    variationId: Types.ObjectId
  ): Promise<void> {
    const sourceExercise = await this.exerciseRepository.findById(sourceId);
    if (sourceExercise) {
      const updatedVariations = [...sourceExercise.variations, variationId];
      await this.exerciseRepository.update(sourceId, { 
        variations: updatedVariations 
      });
    }
  }
}


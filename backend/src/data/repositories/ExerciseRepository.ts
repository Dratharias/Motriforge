import { BaseRepository } from './helpers';
import { Database } from '../database/Database';
import { LoggerFacade } from '../../core/logging/LoggerFacade';
import { EventMediator } from '../../core/events/EventMediator';
import { ObjectId, Filter, Document, OptionalUnlessRequiredId } from 'mongodb';
import { DatabaseError } from '../../core/error/exceptions/DatabaseError';

/**
 * Exercise entity interface
 */
export interface IExercise extends Document {
  _id?: ObjectId;
  name: string;
  description: string;
  instructions: string;
  muscleGroups: string[];
  primaryMuscleGroup: string;
  equipment: ObjectId[];
  exerciseType: ObjectId;
  difficulty: ObjectId;
  mediaIds: ObjectId[];
  prerequisites: string[];
  formCues: string[];
  commonMistakes: string[];
  tags: string[];
  organization: ObjectId;
  createdBy: ObjectId;
  shared: boolean;
  organizationVisibility: string;
  isArchived: boolean;
  workoutsCount: number;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Exercise progression interface
 */
export interface IExerciseProgression extends Document {
  _id?: ObjectId;
  exerciseId: ObjectId;
  progressionExerciseId: ObjectId;
  notes: string;
  modifications: string[];
  isEasier: boolean;
  progressionOrder: number;
  difficultyDelta: number;
  createdBy: ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Exercise alternative interface
 */
export interface IExerciseAlternative extends Document {
  _id?: ObjectId;
  exerciseId: ObjectId;
  alternativeExerciseId: ObjectId;
  reason: string;
  notes: string;
  accommodates: string[];
  similarityScore: number;
  createdBy: ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Exercise metric interface
 */
export interface IExerciseMetric extends Document {
  _id?: ObjectId;
  name: string;
  unit: ObjectId;
  defaultValue: number;
  exerciseId: ObjectId;
  isStandard: boolean;
  minValue: number;
  maxValue: number;
  increment: number;
}

/**
 * Exercise creation data
 */
export interface ExerciseCreationData {
  name: string;
  description: string;
  instructions: string;
  muscleGroups: string[];
  primaryMuscleGroup: string;
  equipment?: ObjectId[];
  exerciseType: ObjectId;
  difficulty: ObjectId;
  mediaIds?: ObjectId[];
  prerequisites?: string[];
  formCues?: string[];
  commonMistakes?: string[];
  tags?: string[];
  organization: ObjectId;
  createdBy: ObjectId;
  shared?: boolean;
  organizationVisibility?: string;
}

/**
 * Exercise update data
 */
export interface ExerciseUpdateData {
  name?: string;
  description?: string;
  instructions?: string;
  muscleGroups?: string[];
  primaryMuscleGroup?: string;
  equipment?: ObjectId[];
  exerciseType?: ObjectId;
  difficulty?: ObjectId;
  mediaIds?: ObjectId[];
  prerequisites?: string[];
  formCues?: string[];
  commonMistakes?: string[];
  tags?: string[];
  shared?: boolean;
  organizationVisibility?: string;
  isArchived?: boolean;
}

/**
 * Exercise search criteria
 */
export interface ExerciseSearchCriteria {
  name?: string;
  muscleGroups?: string[];
  primaryMuscleGroup?: string;
  equipment?: ObjectId[];
  exerciseType?: ObjectId;
  difficulty?: ObjectId;
  organizationId?: ObjectId;
  createdBy?: ObjectId;
  tags?: string[];
  shared?: boolean;
  isArchived?: boolean;
  searchTerm?: string;
}

/**
 * Repository for managing exercises and related entities
 */
export class ExerciseRepository extends BaseRepository<IExercise> {
  private readonly progressionCollection: string = 'exercise_progressions';
  private readonly alternativeCollection: string = 'exercise_alternatives';
  private readonly metricCollection: string = 'exercise_metrics';

  constructor(
    db: Database,
    logger: LoggerFacade,
    eventMediator?: EventMediator
  ) {
    super('exercises', db, logger, eventMediator);
  }

  /**
   * Create new exercise with optional progressions and alternatives
   */
  public async createExercise(
    data: ExerciseCreationData,
    progressions?: Partial<IExerciseProgression>[],
    alternatives?: Partial<IExerciseAlternative>[]
  ): Promise<IExercise> {
    return await this.withTransaction(async (tx) => {
      const now = new Date();
      const exercise: OptionalUnlessRequiredId<IExercise> = {
        ...data,
        equipment: data.equipment ?? [],
        mediaIds: data.mediaIds ?? [],
        prerequisites: data.prerequisites ?? [],
        formCues: data.formCues ?? [],
        commonMistakes: data.commonMistakes ?? [],
        tags: data.tags ?? [],
        shared: data.shared ?? false,
        organizationVisibility: data.organizationVisibility ?? 'private',
        isArchived: false,
        workoutsCount: 0,
        createdAt: now,
        updatedAt: now
      };
  
      const createdExercise = await tx.insertOne<IExercise>(this.collectionName, exercise);
  
      if (progressions?.length) {
        await this.progressionRepo.insertMany(progressions.map(p => ({
          ...p,
          exerciseId: createdExercise._id,
          createdAt: now,
          updatedAt: now
        })) as IExerciseProgression[]);
      }
  
      if (alternatives?.length) {
        await this.alternativeRepo.insertMany(alternatives.map(a => ({
          ...a,
          exerciseId: createdExercise._id,
          createdAt: now,
          updatedAt: now
        })) as IExerciseAlternative[]);
      }
  
      return createdExercise;
    });
  }  

  /**
   * Find exercises by muscle groups
   */
  public async findByMuscleGroups(
    muscleGroups: string[],
    matchAll: boolean = false,
    organizationId?: ObjectId
  ): Promise<IExercise[]> {
    try {
      const filter: Filter<IExercise> = {
        isArchived: false
      };

      if (matchAll) {
        filter.muscleGroups = { $all: muscleGroups };
      } else {
        filter.muscleGroups = { $in: muscleGroups };
      }

      if (organizationId) {
        filter.organization = organizationId;
      }

      return await this.find(filter, { sort: { name: 1 } });
    } catch (err) {
      this.logger.error(`Error finding exercises by muscle groups: ${muscleGroups.join(', ')}`, err as Error);
      throw new DatabaseError(
        'Error finding exercises by muscle groups',
        'findByMuscleGroups',
        'DATABASE_ERROR',
        err as Error,
        'exercises'
      );
    }
  }

  /**
   * Find exercises by equipment
   */
  public async findByEquipment(
    equipmentIds: ObjectId[],
    requiresAll: boolean = false,
    organizationId?: ObjectId
  ): Promise<IExercise[]> {
    try {
      const filter: Filter<IExercise> = {
        isArchived: false
      };

      if (requiresAll) {
        filter.equipment = { $all: equipmentIds };
      } else {
        filter.equipment = { $in: equipmentIds };
      }

      if (organizationId) {
        filter.organization = organizationId;
      }

      return await this.find(filter, { sort: { name: 1 } });
    } catch (err) {
      this.logger.error(`Error finding exercises by equipment`, err as Error);
      throw new DatabaseError(
        'Error finding exercises by equipment',
        'findByEquipment',
        'DATABASE_ERROR',
        err as Error,
        'exercises'
      );
    }
  }

  /**
   * Search exercises with comprehensive criteria
   */
  public async searchExercises(criteria: ExerciseSearchCriteria): Promise<IExercise[]> {
    try {
      const filter: Filter<IExercise> = {};

      if (criteria.name) {
        filter.name = { $regex: criteria.name, $options: 'i' };
      }

      if (criteria.muscleGroups && criteria.muscleGroups.length > 0) {
        filter.muscleGroups = { $in: criteria.muscleGroups };
      }

      if (criteria.primaryMuscleGroup) {
        filter.primaryMuscleGroup = criteria.primaryMuscleGroup;
      }

      if (criteria.equipment && criteria.equipment.length > 0) {
        filter.equipment = { $in: criteria.equipment };
      }

      if (criteria.exerciseType) {
        filter.exerciseType = criteria.exerciseType;
      }

      if (criteria.difficulty) {
        filter.difficulty = criteria.difficulty;
      }

      if (criteria.organizationId) {
        filter.organization = criteria.organizationId;
      }

      if (criteria.createdBy) {
        filter.createdBy = criteria.createdBy;
      }

      if (criteria.tags && criteria.tags.length > 0) {
        filter.tags = { $in: criteria.tags };
      }

      if (criteria.shared !== undefined) {
        filter.shared = criteria.shared;
      }

      if (criteria.isArchived !== undefined) {
        filter.isArchived = criteria.isArchived;
      } else {
        filter.isArchived = false; // Default to non-archived
      }

      if (criteria.searchTerm) {
        filter.$or = [
          { name: { $regex: criteria.searchTerm, $options: 'i' } },
          { description: { $regex: criteria.searchTerm, $options: 'i' } },
          { tags: { $in: [new RegExp(criteria.searchTerm, 'i')] } }
        ];
      }

      return await this.find(filter, { sort: { name: 1 } });
    } catch (err) {
      this.logger.error('Error searching exercises', err as Error, { criteria });
      throw new DatabaseError(
        'Error searching exercises',
        'searchExercises',
        'DATABASE_ERROR',
        err as Error,
        'exercises'
      );
    }
  }

  /**
   * Find exercises by organization with visibility rules
   */
  public async findByOrganization(
    organizationId: ObjectId,
    includeShared: boolean = true
  ): Promise<IExercise[]> {
    try {
      const filter: Filter<IExercise> = {
        isArchived: false,
        $or: [
          { organization: organizationId }
        ]
      };

      if (includeShared) {
        filter.$or!.push({ shared: true });
      }

      return await this.find(filter, { sort: { name: 1 } });
    } catch (err) {
      this.logger.error(`Error finding exercises by organization: ${organizationId}`, err as Error);
      throw new DatabaseError(
        'Error finding exercises by organization',
        'findByOrganization',
        'DATABASE_ERROR',
        err as Error,
        'exercises'
      );
    }
  }

  /**
   * Get exercise progressions
   */
  public async getExerciseProgressions(exerciseId: ObjectId): Promise<IExerciseProgression[]> {
    try {
      const progressionCollection = this.db.getCollection<IExerciseProgression>(this.progressionCollection);
      
      return await progressionCollection.find({
        exerciseId
      } as Filter<IExerciseProgression>, {
        sort: { progressionOrder: 1 }
      });
    } catch (err) {
      this.logger.error(`Error getting exercise progressions for: ${exerciseId}`, err as Error);
      throw new DatabaseError(
        'Error getting exercise progressions',
        'getExerciseProgressions',
        'DATABASE_ERROR',
        err as Error,
        this.progressionCollection
      );
    }
  }

  /**
   * Get exercise alternatives
   */
  public async getExerciseAlternatives(exerciseId: ObjectId): Promise<IExerciseAlternative[]> {
    try {
      const alternativeCollection = this.db.getCollection<IExerciseAlternative>(this.alternativeCollection);
      
      return await alternativeCollection.find({
        exerciseId
      } as Filter<IExerciseAlternative>, {
        sort: { similarityScore: -1 }
      });
    } catch (err) {
      this.logger.error(`Error getting exercise alternatives for: ${exerciseId}`, err as Error);
      throw new DatabaseError(
        'Error getting exercise alternatives',
        'getExerciseAlternatives',
        'DATABASE_ERROR',
        err as Error,
        this.alternativeCollection
      );
    }
  }

  /**
   * Add exercise progression
   */
  public async addProgression(
    exerciseId: ObjectId,
    progressionData: Partial<IExerciseProgression>
  ): Promise<IExerciseProgression> {
    try {
      // Verify exercise exists
      await this.findById(exerciseId);

      const progressionCollection = this.db.getCollection<IExerciseProgression>(this.progressionCollection);
      const now = new Date();

      const progression: OptionalUnlessRequiredId<IExerciseProgression> = {
        ...progressionData,
        exerciseId,
        createdAt: now,
        updatedAt: now
      };

      const result = await progressionCollection.insertOne(progression);

      return {
        ...progression,
        _id: result.insertedId
      } as IExerciseProgression;
    } catch (err) {
      this.logger.error(`Error adding progression for exercise: ${exerciseId}`, err as Error);
      throw new DatabaseError(
        'Error adding exercise progression',
        'addProgression',
        'DATABASE_ERROR',
        err as Error,
        this.progressionCollection
      );
    }
  }

  /**
   * Add exercise alternative
   */
  public async addAlternative(
    exerciseId: ObjectId,
    alternativeData: Partial<IExerciseAlternative>
  ): Promise<IExerciseAlternative> {
    try {
      // Verify exercise exists
      await this.findById(exerciseId);

      const alternativeCollection = this.db.getCollection<IExerciseAlternative>(this.alternativeCollection);
      const now = new Date();

      const alternative: OptionalUnlessRequiredId<IExerciseAlternative> = {
        ...alternativeData,
        exerciseId,
        createdAt: now,
        updatedAt: now
      };

      const result = await alternativeCollection.insertOne(alternative);

      return {
        ...alternative,
        _id: result.insertedId
      } as IExerciseAlternative;
    } catch (err) {
      this.logger.error(`Error adding alternative for exercise: ${exerciseId}`, err as Error);
      throw new DatabaseError(
        'Error adding exercise alternative',
        'addAlternative',
        'DATABASE_ERROR',
        err as Error,
        this.alternativeCollection
      );
    }
  }

  /**
   * Update exercise with workout count increment
   */
  public async incrementWorkoutCount(exerciseId: ObjectId): Promise<void> {
    try {
      await this.collection.updateOne(
        { _id: exerciseId } as Filter<IExercise>,
        { 
          $inc: { workoutsCount: 1 },
          $set: { updatedAt: new Date() }
        }
      );
    } catch (err) {
      this.logger.error(`Error incrementing workout count for exercise: ${exerciseId}`, err as Error);
      throw new DatabaseError(
        'Error incrementing workout count',
        'incrementWorkoutCount',
        'DATABASE_ERROR',
        err as Error,
        'exercises'
      );
    }
  }

  /**
   * Find similar exercises based on muscle groups and type
   */
  public async findSimilarExercises(
    exerciseId: ObjectId,
    limit: number = 5
  ): Promise<IExercise[]> {
    try {
      const exercise = await this.findById(exerciseId);
      
      const filter: Filter<IExercise> = {
        _id: { $ne: exerciseId },
        isArchived: false,
        $or: [
          { primaryMuscleGroup: exercise.primaryMuscleGroup },
          { muscleGroups: { $in: exercise.muscleGroups } },
          { exerciseType: exercise.exerciseType }
        ]
      };

      return await this.find(filter, { 
        sort: { workoutsCount: -1 },
        limit 
      });
    } catch (err) {
      this.logger.error(`Error finding similar exercises for: ${exerciseId}`, err as Error);
      throw new DatabaseError(
        'Error finding similar exercises',
        'findSimilarExercises',
        'DATABASE_ERROR',
        err as Error,
        'exercises'
      );
    }
  }

  /**
   * Archive exercise
   */
  public async archiveExercise(exerciseId: ObjectId): Promise<IExercise> {
    try {
      return await this.update(exerciseId, { 
        isArchived: true,
        updatedAt: new Date()
      });
    } catch (err) {
      this.logger.error(`Error archiving exercise: ${exerciseId}`, err as Error);
      throw new DatabaseError(
        'Error archiving exercise',
        'archiveExercise',
        'DATABASE_ERROR',
        err as Error,
        'exercises'
      );
    }
  }

  /**
   * Get popular exercises by workout count
   */
  public async getPopularExercises(
    organizationId?: ObjectId,
    limit: number = 10
  ): Promise<IExercise[]> {
    try {
      const filter: Filter<IExercise> = {
        isArchived: false,
        workoutsCount: { $gt: 0 }
      };

      if (organizationId) {
        filter.$or = [
          { organization: organizationId },
          { shared: true }
        ];
      }

      return await this.find(filter, {
        sort: { workoutsCount: -1 },
        limit
      });
    } catch (err) {
      this.logger.error('Error getting popular exercises', err as Error);
      throw new DatabaseError(
        'Error getting popular exercises',
        'getPopularExercises',
        'DATABASE_ERROR',
        err as Error,
        'exercises'
      );
    }
  }

  /**
   * Validate exercise data
   */
  protected override validateData(data: any, isUpdate: boolean = false): void {
    if (!isUpdate) {
      if (!data.name?.trim()) {
        throw new DatabaseError(
          'Exercise name is required',
          'validateData',
          'VALIDATION_ERROR'
        );
      }

      if (!data.muscleGroups || !Array.isArray(data.muscleGroups) || data.muscleGroups.length === 0) {
        throw new DatabaseError(
          'At least one muscle group is required',
          'validateData',
          'VALIDATION_ERROR'
        );
      }

      if (!data.primaryMuscleGroup?.trim()) {
        throw new DatabaseError(
          'Primary muscle group is required',
          'validateData',
          'VALIDATION_ERROR'
        );
      }
    }

    if (data.name !== undefined && !data.name?.trim()) {
      throw new DatabaseError(
        'Exercise name cannot be empty',
        'validateData',
        'VALIDATION_ERROR'
      );
    }

    if (data.muscleGroups && (!Array.isArray(data.muscleGroups) || data.muscleGroups.length === 0)) {
      throw new DatabaseError(
        'Muscle groups must be a non-empty array',
        'validateData',
        'VALIDATION_ERROR'
      );
    }

    if (data.equipment && !Array.isArray(data.equipment)) {
      throw new DatabaseError(
        'Equipment must be an array',
        'validateData',
        'VALIDATION_ERROR'
      );
    }
  }
}
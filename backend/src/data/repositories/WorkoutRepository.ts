import { Model, Types } from 'mongoose';
import { LoggerFacade } from '@/core/logging';
import { EventMediator } from '@/core/events/EventMediator';
import { CacheFacade } from '@/core/cache/facade/CacheFacade';
import { IWorkout, IWorkoutBlock, IWorkoutExercise } from '@/types/models';
import { IWorkoutRepository } from '@/types/repositories';
import { ValidationResult, RepositoryContext } from '@/types/repositories/base';
import { BaseRepository } from './BaseRepository';
import { ValidationHelpers } from './helpers';

/**
 * Repository for workout operations with enhanced validation and caching
 */
export class WorkoutRepository extends BaseRepository<IWorkout> implements IWorkoutRepository {
  private static readonly CACHE_TTL = 600; // 10 minutes
  private static readonly WORKOUT_CACHE_TTL = 1800; // 30 minutes for workout data
  private static readonly POPULAR_CACHE_TTL = 3600; // 1 hour for popular workouts

  constructor(
    workoutModel: Model<IWorkout>,
    logger: LoggerFacade,
    eventMediator: EventMediator,
    cache?: CacheFacade
  ) {
    super(workoutModel, logger, eventMediator, cache, 'WorkoutRepository');
  }

  /**
   * Find workout by name
   */
  public async findByName(name: string): Promise<IWorkout | null> {
    const cacheKey = this.cacheHelpers.generateCustomKey('name', { name });
    
    const cached = await this.cacheHelpers.getCustom<IWorkout>(cacheKey);
    if (cached) {
      return this.mapToEntity(cached);
    }

    try {
      this.logger.debug('Finding workout by name', { name });
      
      const workout = await this.crudOps.findOne({
        name: { $regex: new RegExp(`^${name}$`, 'i') }
      });

      if (workout && this.cacheHelpers.isEnabled) {
        await this.cacheHelpers.setCustom(cacheKey, workout, WorkoutRepository.WORKOUT_CACHE_TTL);
        const workoutId = this.extractId(workout);
        if (workoutId) {
          await this.cacheHelpers.cacheById(workoutId, workout, WorkoutRepository.WORKOUT_CACHE_TTL);
        }
      }

      return workout ? this.mapToEntity(workout) : null;
    } catch (error) {
      this.logger.error('Error finding workout by name', error as Error, { name });
      throw error;
    }
  }

  /**
   * Find workouts by goal
   */
  public async findByGoal(goal: string): Promise<IWorkout[]> {
    const cacheKey = this.cacheHelpers.generateCustomKey('goal', { goal });
    
    const cached = await this.cacheHelpers.getCustom<IWorkout[]>(cacheKey);
    if (cached) {
      return cached.map(workout => this.mapToEntity(workout));
    }

    try {
      this.logger.debug('Finding workouts by goal', { goal });
      
      const workouts = await this.crudOps.find({
        goal: { $in: [goal] }
      }, {
        sort: [{ field: 'name', direction: 'asc' }]
      });

      if (this.cacheHelpers.isEnabled) {
        await this.cacheHelpers.setCustom(cacheKey, workouts, WorkoutRepository.CACHE_TTL);
      }

      return workouts.map(workout => this.mapToEntity(workout));
    } catch (error) {
      this.logger.error('Error finding workouts by goal', error as Error, { goal });
      throw error;
    }
  }

  /**
   * Find workouts by duration range
   */
  public async findByDuration(minDuration: number, maxDuration: number): Promise<IWorkout[]> {
    const cacheKey = this.cacheHelpers.generateCustomKey('duration', { 
      minDuration, 
      maxDuration 
    });
    
    const cached = await this.cacheHelpers.getCustom<IWorkout[]>(cacheKey);
    if (cached) {
      return cached.map(workout => this.mapToEntity(workout));
    }

    try {
      this.logger.debug('Finding workouts by duration', { minDuration, maxDuration });
      
      const workouts = await this.crudOps.find({
        durationInMinutes: {
          $gte: minDuration,
          $lte: maxDuration
        }
      }, {
        sort: [{ field: 'durationInMinutes', direction: 'asc' }]
      });

      if (this.cacheHelpers.isEnabled) {
        await this.cacheHelpers.setCustom(cacheKey, workouts, WorkoutRepository.CACHE_TTL);
      }

      return workouts.map(workout => this.mapToEntity(workout));
    } catch (error) {
      this.logger.error('Error finding workouts by duration', error as Error, { 
        minDuration, 
        maxDuration 
      });
      throw error;
    }
  }

  /**
   * Find workouts by intensity level
   */
  public async findByIntensity(intensity: string): Promise<IWorkout[]> {
    const cacheKey = this.cacheHelpers.generateCustomKey('intensity', { intensity });
    
    const cached = await this.cacheHelpers.getCustom<IWorkout[]>(cacheKey);
    if (cached) {
      return cached.map(workout => this.mapToEntity(workout));
    }

    try {
      this.logger.debug('Finding workouts by intensity', { intensity });
      
      const workouts = await this.crudOps.find({
        intensityLevel: intensity
      }, {
        sort: [{ field: 'name', direction: 'asc' }]
      });

      if (this.cacheHelpers.isEnabled) {
        await this.cacheHelpers.setCustom(cacheKey, workouts, WorkoutRepository.CACHE_TTL);
      }

      return workouts.map(workout => this.mapToEntity(workout));
    } catch (error) {
      this.logger.error('Error finding workouts by intensity', error as Error, { intensity });
      throw error;
    }
  }

  /**
   * Find workouts by organization
   */
  public async findByOrganization(organizationId: Types.ObjectId): Promise<IWorkout[]> {
    const cacheKey = this.cacheHelpers.generateCustomKey('organization', { 
      organizationId: organizationId.toString() 
    });
    
    const cached = await this.cacheHelpers.getCustom<IWorkout[]>(cacheKey);
    if (cached) {
      return cached.map(workout => this.mapToEntity(workout));
    }

    try {
      this.logger.debug('Finding workouts by organization', { 
        organizationId: organizationId.toString() 
      });
      
      const workouts = await this.crudOps.find({
        organization: organizationId
      }, {
        sort: [{ field: 'name', direction: 'asc' }]
      });

      if (this.cacheHelpers.isEnabled) {
        await this.cacheHelpers.setCustom(cacheKey, workouts, WorkoutRepository.CACHE_TTL);
      }

      return workouts.map(workout => this.mapToEntity(workout));
    } catch (error) {
      this.logger.error('Error finding workouts by organization', error as Error, { 
        organizationId: organizationId.toString() 
      });
      throw error;
    }
  }

  /**
   * Find workouts by creator
   */
  public async findByCreator(creatorId: Types.ObjectId): Promise<IWorkout[]> {
    const cacheKey = this.cacheHelpers.generateCustomKey('creator', { 
      creatorId: creatorId.toString() 
    });
    
    const cached = await this.cacheHelpers.getCustom<IWorkout[]>(cacheKey);
    if (cached) {
      return cached.map(workout => this.mapToEntity(workout));
    }

    try {
      this.logger.debug('Finding workouts by creator', { 
        creatorId: creatorId.toString() 
      });
      
      const workouts = await this.crudOps.find({
        createdBy: creatorId
      }, {
        sort: [{ field: 'createdAt', direction: 'desc' }]
      });

      if (this.cacheHelpers.isEnabled) {
        await this.cacheHelpers.setCustom(cacheKey, workouts, WorkoutRepository.CACHE_TTL);
      }

      return workouts.map(workout => this.mapToEntity(workout));
    } catch (error) {
      this.logger.error('Error finding workouts by creator', error as Error, { 
        creatorId: creatorId.toString() 
      });
      throw error;
    }
  }

  /**
   * Find template workouts
   */
  public async findTemplates(): Promise<IWorkout[]> {
    const cacheKey = this.cacheHelpers.generateCustomKey('templates', {});
    
    const cached = await this.cacheHelpers.getCustom<IWorkout[]>(cacheKey);
    if (cached) {
      return cached.map(workout => this.mapToEntity(workout));
    }

    try {
      this.logger.debug('Finding template workouts');
      
      const workouts = await this.crudOps.find({
        isTemplate: true
      }, {
        sort: [{ field: 'name', direction: 'asc' }]
      });

      if (this.cacheHelpers.isEnabled) {
        await this.cacheHelpers.setCustom(cacheKey, workouts, WorkoutRepository.CACHE_TTL);
      }

      return workouts.map(workout => this.mapToEntity(workout));
    } catch (error) {
      this.logger.error('Error finding template workouts', error as Error);
      throw error;
    }
  }

  /**
   * Find workouts by tags
   */
  public async findByTags(tags: string[]): Promise<IWorkout[]> {
    const cacheKey = this.cacheHelpers.generateCustomKey('tags', { 
      tags: tags.toSorted((a, b) => a.localeCompare(b)) 
    });
    
    const cached = await this.cacheHelpers.getCustom<IWorkout[]>(cacheKey);
    if (cached) {
      return cached.map(workout => this.mapToEntity(workout));
    }

    try {
      this.logger.debug('Finding workouts by tags', { tags });
      
      const workouts = await this.crudOps.find({
        tags: { $in: tags }
      }, {
        sort: [{ field: 'name', direction: 'asc' }]
      });

      if (this.cacheHelpers.isEnabled) {
        await this.cacheHelpers.setCustom(cacheKey, workouts, WorkoutRepository.CACHE_TTL);
      }

      return workouts.map(workout => this.mapToEntity(workout));
    } catch (error) {
      this.logger.error('Error finding workouts by tags', error as Error, { tags });
      throw error;
    }
  }

  /**
   * Find workout blocks
   */
  public async findBlocks(workoutId: Types.ObjectId): Promise<IWorkoutBlock[]> {
    const cacheKey = this.cacheHelpers.generateCustomKey('blocks', { 
      workoutId: workoutId.toString() 
    });
    
    const cached = await this.cacheHelpers.getCustom<IWorkoutBlock[]>(cacheKey);
    if (cached) {
      return cached;
    }

    try {
      this.logger.debug('Finding workout blocks', { 
        workoutId: workoutId.toString() 
      });
      
      // This would need to be implemented with a separate WorkoutBlock collection
      // For now, returning empty array as placeholder
      const blocks: IWorkoutBlock[] = [];

      if (this.cacheHelpers.isEnabled) {
        await this.cacheHelpers.setCustom(cacheKey, blocks, WorkoutRepository.CACHE_TTL);
      }

      return blocks;
    } catch (error) {
      this.logger.error('Error finding workout blocks', error as Error, { 
        workoutId: workoutId.toString() 
      });
      throw error;
    }
  }

  /**
   * Find workout exercises
   */
  public async findExercises(workoutId: Types.ObjectId): Promise<IWorkoutExercise[]> {
    const cacheKey = this.cacheHelpers.generateCustomKey('exercises', { 
      workoutId: workoutId.toString() 
    });
    
    const cached = await this.cacheHelpers.getCustom<IWorkoutExercise[]>(cacheKey);
    if (cached) {
      return cached;
    }

    try {
      this.logger.debug('Finding workout exercises', { 
        workoutId: workoutId.toString() 
      });
      
      // This would need to be implemented with a separate WorkoutExercise collection
      // For now, returning empty array as placeholder
      const exercises: IWorkoutExercise[] = [];

      if (this.cacheHelpers.isEnabled) {
        await this.cacheHelpers.setCustom(cacheKey, exercises, WorkoutRepository.CACHE_TTL);
      }

      return exercises;
    } catch (error) {
      this.logger.error('Error finding workout exercises', error as Error, { 
        workoutId: workoutId.toString() 
      });
      throw error;
    }
  }

  /**
   * Search workouts by name
   */
  public async searchByName(query: string, limit: number = 20): Promise<IWorkout[]> {
    try {
      this.logger.debug('Searching workouts by name', { query, limit });
      
      const workouts = await this.crudOps.find({
        name: { $regex: query, $options: 'i' }
      }, {
        sort: [{ field: 'name', direction: 'asc' }],
        pagination: { limit, offset: 0, page: 1, pageSize: limit }
      });

      return workouts.map(workout => this.mapToEntity(workout));
    } catch (error) {
      this.logger.error('Error searching workouts by name', error as Error, { query, limit });
      throw error;
    }
  }

  /**
   * Find popular workouts
   */
  public async findPopular(limit: number = 10): Promise<IWorkout[]> {
    const cacheKey = this.cacheHelpers.generateCustomKey('popular', { limit });
    
    const cached = await this.cacheHelpers.getCustom<IWorkout[]>(cacheKey);
    if (cached) {
      return cached.map(workout => this.mapToEntity(workout));
    }

    try {
      this.logger.debug('Finding popular workouts', { limit });
      
      const workouts = await this.crudOps.find({}, {
        sort: [{ field: 'subscribersCount', direction: 'desc' }],
        pagination: { limit, offset: 0, page: 1, pageSize: limit }
      });

      if (this.cacheHelpers.isEnabled) {
        await this.cacheHelpers.setCustom(
          cacheKey, 
          workouts, 
          WorkoutRepository.POPULAR_CACHE_TTL
        );
      }

      return workouts.map(workout => this.mapToEntity(workout));
    } catch (error) {
      this.logger.error('Error finding popular workouts', error as Error, { limit });
      throw error;
    }
  }

  /**
   * Increment subscriber count for workout
   */
  public async incrementSubscriberCount(id: Types.ObjectId): Promise<void> {
    try {
      this.logger.debug('Incrementing subscriber count', { id: id.toString() });

      const result = await this.crudOps.update(id, {
        $inc: { subscribersCount: 1 }
      });

      if (result && this.cacheHelpers.isEnabled) {
        await this.cacheHelpers.invalidateAfterUpdate(id, result);
        await this.cacheHelpers.invalidateByPattern('popular:*');
      }

      if (result) {
        await this.publishEvent('workout.subscriber_count.incremented', {
          workoutId: id.toString(),
          newCount: result.subscribersCount,
          timestamp: new Date()
        });
      }
    } catch (error) {
      this.logger.error('Error incrementing subscriber count', error as Error, { 
        id: id.toString() 
      });
      throw error;
    }
  }

  /**
   * Find workouts by target muscle groups
   */
  public async findByMuscleGroups(muscleGroups: string[]): Promise<IWorkout[]> {
    const cacheKey = this.cacheHelpers.generateCustomKey('muscle_groups', { 
      muscleGroups: muscleGroups.toSorted((a, b) => a.localeCompare(b)) 
    });
    
    const cached = await this.cacheHelpers.getCustom<IWorkout[]>(cacheKey);
    if (cached) {
      return cached.map(workout => this.mapToEntity(workout));
    }

    try {
      this.logger.debug('Finding workouts by muscle groups', { muscleGroups });
      
      const workouts = await this.crudOps.find({
        targetMuscleGroups: { $in: muscleGroups }
      }, {
        sort: [{ field: 'name', direction: 'asc' }]
      });

      if (this.cacheHelpers.isEnabled) {
        await this.cacheHelpers.setCustom(cacheKey, workouts, WorkoutRepository.CACHE_TTL);
      }

      return workouts.map(workout => this.mapToEntity(workout));
    } catch (error) {
      this.logger.error('Error finding workouts by muscle groups', error as Error, { 
        muscleGroups 
      });
      throw error;
    }
  }

  /**
   * Override create to handle workout-specific logic
   */
  public async create(data: Partial<IWorkout>, context?: RepositoryContext): Promise<IWorkout> {
    // Validate unique name within organization
    if (data.name && data.organization) {
      const existingWorkout = await this.crudOps.findOne({
        name: { $regex: new RegExp(`^${data.name}$`, 'i') },
        organization: data.organization
      });
      
      if (existingWorkout) {
        throw new Error('Workout with this name already exists in the organization');
      }
    }

    // Set default values
    const workoutData: Partial<IWorkout> = {
      ...data,
      tags: data.tags ?? [],
      goal: data.goal ?? [],
      equipment: data.equipment ?? [],
      targetMuscleGroups: data.targetMuscleGroups ?? [],
      prerequisites: data.prerequisites ?? [],
      mediaIds: data.mediaIds ?? [],
      subscribersCount: 0,
      isTemplate: data.isTemplate ?? false,
      shared: data.shared ?? false,
      estimatedCalories: data.estimatedCalories ?? 0
    };

    const workout = await super.create(workoutData, context);

    // Publish workout creation event
    await this.publishEvent('workout.created', {
      workoutId: workout._id.toString(),
      name: workout.name,
      organizationId: workout.organization.toString(),
      duration: workout.durationInMinutes,
      isTemplate: workout.isTemplate,
      timestamp: new Date()
    });

    return workout;
  }

  /**
   * Validate workout data
   */
  protected validateData(data: Partial<IWorkout>): ValidationResult {
    const errors: string[] = [];

    // Name validation
    if (data.name !== undefined) {
      const nameValidation = ValidationHelpers.validateFieldLength(
        data.name, 
        'name', 
        2, 
        100
      );
      if (!nameValidation.valid) {
        errors.push(...nameValidation.errors);
      }
    }

    // Description validation
    if (data.description !== undefined && data.description.length > 1000) {
      errors.push('Description must be less than 1000 characters');
    }

    // Duration validation
    if (data.durationInMinutes !== undefined) {
      const durationValidation = ValidationHelpers.validateNumericRange(
        data.durationInMinutes, 
        'durationInMinutes', 
        1, 
        480 // 8 hours max
      );
      if (!durationValidation.valid) {
        errors.push(...durationValidation.errors);
      }
    }

    // Estimated calories validation
    if (data.estimatedCalories !== undefined) {
      const caloriesValidation = ValidationHelpers.validateNumericRange(
        data.estimatedCalories, 
        'estimatedCalories', 
        0, 
        5000
      );
      if (!caloriesValidation.valid) {
        errors.push(...caloriesValidation.errors);
      }
    }

    // Tags validation
    if (data.tags) {
      if (!Array.isArray(data.tags)) {
        errors.push('Tags must be an array');
      } else {
        data.tags.forEach((tag, index) => {
          if (typeof tag !== 'string' || tag.length === 0) {
            errors.push(`Tag at index ${index} must be a non-empty string`);
          }
        });
      }
    }

    // Target muscle groups validation
    if (data.targetMuscleGroups) {
      if (!Array.isArray(data.targetMuscleGroups)) {
        errors.push('Target muscle groups must be an array');
      }
    }

    // Prerequisites validation
    if (data.prerequisites) {
      if (!Array.isArray(data.prerequisites)) {
        errors.push('Prerequisites must be an array');
      }
    }

    return {
      valid: errors.length === 0,
      errors: errors.length > 0 ? errors : undefined
    };
  }

  /**
   * Map database document to domain entity
   */
  protected mapToEntity(data: any): IWorkout {
    return {
      _id: data._id,
      name: data.name,
      description: data.description ?? '',
      durationInMinutes: data.durationInMinutes,
      intensityLevel: data.intensityLevel,
      goal: data.goal ?? [],
      tags: data.tags ?? [],
      mediaIds: data.mediaIds ?? [],
      equipment: data.equipment ?? [],
      targetMuscleGroups: data.targetMuscleGroups ?? [],
      prerequisites: data.prerequisites ?? [],
      estimatedCalories: data.estimatedCalories ?? 0,
      isTemplate: data.isTemplate ?? false,
      templateCategory: data.templateCategory ?? '',
      subscribersCount: data.subscribersCount ?? 0,
      organization: data.organization,
      createdBy: data.createdBy,
      isArchived: data.isArchived ?? false,
      shared: data.shared ?? false,
      organizationVisibility: data.organizationVisibility,
      createdAt: data.createdAt,
      updatedAt: data.updatedAt
    } as IWorkout;
  }

  /**
   * Map domain entity to database document
   */
  protected mapFromEntity(entity: IWorkout): any {
    const doc = { ...entity };
    
    // Remove any computed fields
    delete (doc as any).__v;
    
    return doc;
  }
}
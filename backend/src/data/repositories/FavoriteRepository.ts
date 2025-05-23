import { Model, Types } from 'mongoose';
import { LoggerFacade } from '@/core/logging';
import { EventMediator } from '@/core/events/EventMediator';
import { CacheFacade } from '@/core/cache/facade/CacheFacade';
import { IFavorite } from '@/types/models';
import { IFavoriteRepository, ValidationResult } from '@/types/repositories';
import { BaseRepository } from './BaseRepository';
import { ValidationHelpers } from './helpers';

/**
 * Repository for favorite operations with enhanced validation and caching
 */
export class FavoriteRepository extends BaseRepository<IFavorite> implements IFavoriteRepository {
  private static readonly CACHE_TTL = 600; // 10 minutes
  private static readonly USER_FAVORITES_CACHE_TTL = 1800; // 30 minutes for user favorites

  constructor(
    favoriteModel: Model<IFavorite>,
    logger: LoggerFacade,
    eventMediator: EventMediator,
    cache?: CacheFacade
  ) {
    super(favoriteModel, logger, eventMediator, cache, 'FavoriteRepository');
  }

  /**
   * Find favorites by user
   */
  public async findByUser(userId: Types.ObjectId): Promise<IFavorite | null> {
    const cacheKey = this.cacheHelpers.generateCustomKey('user', { 
      userId: userId.toString() 
    });
    
    const cached = await this.cacheHelpers.getCustom<IFavorite>(cacheKey);
    if (cached) {
      return this.mapToEntity(cached);
    }

    try {
      this.logger.debug('Finding favorites by user', { userId: userId.toString() });
      
      const favorites = await this.crudOps.findOne({
        user: userId
      });

      if (favorites && this.cacheHelpers.isEnabled) {
        await this.cacheHelpers.setCustom(
          cacheKey, 
          favorites, 
          FavoriteRepository.USER_FAVORITES_CACHE_TTL
        );
      }

      return favorites ? this.mapToEntity(favorites) : null;
    } catch (error) {
      this.logger.error('Error finding favorites by user', error as Error, { 
        userId: userId.toString() 
      });
      throw error;
    }
  }

  /**
   * Add exercise to favorites
   */
  public async addExercise(
    userId: Types.ObjectId, 
    exerciseId: Types.ObjectId
  ): Promise<void> {
    try {
      this.logger.debug('Adding exercise to favorites', { 
        userId: userId.toString(),
        exerciseId: exerciseId.toString() 
      });

      const result = await this.crudOps.findOneAndUpdate(
        { user: userId },
        { 
          $addToSet: { 
            exercises: exerciseId 
          },
          $setOnInsert: {
            user: userId,
            workouts: [],
            programs: [],
            swaps: [],
            theme: 'default'
          }
        },
        { upsert: true, returnNew: true }
      );

      if (result && this.cacheHelpers.isEnabled) {
        await this.cacheHelpers.invalidateByPattern(`user:*${userId.toString()}*`);
      }

      if (result) {
        await this.publishEvent('favorite.exercise.added', {
          userId: userId.toString(),
          exerciseId: exerciseId.toString(),
          timestamp: new Date()
        });
      }
    } catch (error) {
      this.logger.error('Error adding exercise to favorites', error as Error, { 
        userId: userId.toString(),
        exerciseId: exerciseId.toString()
      });
      throw error;
    }
  }

  /**
   * Remove exercise from favorites
   */
  public async removeExercise(
    userId: Types.ObjectId, 
    exerciseId: Types.ObjectId
  ): Promise<void> {
    try {
      this.logger.debug('Removing exercise from favorites', { 
        userId: userId.toString(),
        exerciseId: exerciseId.toString() 
      });

      const result = await this.crudOps.findOneAndUpdate(
        { user: userId },
        { 
          $pull: { 
            exercises: exerciseId 
          }
        }
      );

      if (result && this.cacheHelpers.isEnabled) {
        await this.cacheHelpers.invalidateByPattern(`user:*${userId.toString()}*`);
      }

      if (result) {
        await this.publishEvent('favorite.exercise.removed', {
          userId: userId.toString(),
          exerciseId: exerciseId.toString(),
          timestamp: new Date()
        });
      }
    } catch (error) {
      this.logger.error('Error removing exercise from favorites', error as Error, { 
        userId: userId.toString(),
        exerciseId: exerciseId.toString()
      });
      throw error;
    }
  }

  /**
   * Add workout to favorites
   */
  public async addWorkout(
    userId: Types.ObjectId, 
    workoutId: Types.ObjectId
  ): Promise<void> {
    try {
      this.logger.debug('Adding workout to favorites', { 
        userId: userId.toString(),
        workoutId: workoutId.toString() 
      });

      const result = await this.crudOps.findOneAndUpdate(
        { user: userId },
        { 
          $addToSet: { 
            workouts: workoutId 
          },
          $setOnInsert: {
            user: userId,
            exercises: [],
            programs: [],
            swaps: [],
            theme: 'default'
          }
        },
        { upsert: true, returnNew: true }
      );

      if (result && this.cacheHelpers.isEnabled) {
        await this.cacheHelpers.invalidateByPattern(`user:*${userId.toString()}*`);
      }

      if (result) {
        await this.publishEvent('favorite.workout.added', {
          userId: userId.toString(),
          workoutId: workoutId.toString(),
          timestamp: new Date()
        });
      }
    } catch (error) {
      this.logger.error('Error adding workout to favorites', error as Error, { 
        userId: userId.toString(),
        workoutId: workoutId.toString()
      });
      throw error;
    }
  }

  /**
   * Remove workout from favorites
   */
  public async removeWorkout(
    userId: Types.ObjectId, 
    workoutId: Types.ObjectId
  ): Promise<void> {
    try {
      this.logger.debug('Removing workout from favorites', { 
        userId: userId.toString(),
        workoutId: workoutId.toString() 
      });

      const result = await this.crudOps.findOneAndUpdate(
        { user: userId },
        { 
          $pull: { 
            workouts: workoutId
          }
        }
      );

      if (result && this.cacheHelpers.isEnabled) {
        await this.cacheHelpers.invalidateByPattern(`user:*${userId.toString()}*`);
      }

      if (result) {
        await this.publishEvent('favorite.workout.removed', {
          userId: userId.toString(),
          workoutId: workoutId.toString(),
          timestamp: new Date()
        });
      }
    } catch (error) {
      this.logger.error('Error removing workout from favorites', error as Error, { 
        userId: userId.toString(),
        workoutId: workoutId.toString()
      });
      throw error;
    }
  }

  /**
   * Add program to favorites
   */
  public async addProgram(
    userId: Types.ObjectId, 
    programId: Types.ObjectId
  ): Promise<void> {
    try {
      this.logger.debug('Adding program to favorites', { 
        userId: userId.toString(),
        programId: programId.toString() 
      });

      const result = await this.crudOps.findOneAndUpdate(
        { user: userId },
        { 
          $addToSet: { 
            programs: programId 
          },
          $setOnInsert: {
            user: userId,
            exercises: [],
            workouts: [],
            swaps: [],
            theme: 'default'
          }
        },
        { upsert: true, returnNew: true }
      );

      if (result && this.cacheHelpers.isEnabled) {
        await this.cacheHelpers.invalidateByPattern(`user:*${userId.toString()}*`);
      }

      if (result) {
        await this.publishEvent('favorite.program.added', {
          userId: userId.toString(),
          programId: programId.toString(),
          timestamp: new Date()
        });
      }
    } catch (error) {
      this.logger.error('Error adding program to favorites', error as Error, { 
        userId: userId.toString(),
        programId: programId.toString()
      });
      throw error;
    }
  }

  /**
   * Remove program from favorites
   */
  public async removeProgram(
    userId: Types.ObjectId, 
    programId: Types.ObjectId
  ): Promise<void> {
    try {
      this.logger.debug('Removing program from favorites', { 
        userId: userId.toString(),
        programId: programId.toString() 
      });

      const result = await this.crudOps.findOneAndUpdate(
        { user: userId },
        { 
          $pull: { 
            programs: programId 
          }
        }
      );

      if (result && this.cacheHelpers.isEnabled) {
        await this.cacheHelpers.invalidateByPattern(`user:*${userId.toString()}*`);
      }

      if (result) {
        await this.publishEvent('favorite.program.removed', {
          userId: userId.toString(),
          programId: programId.toString(),
          timestamp: new Date()
        });
      }
    } catch (error) {
      this.logger.error('Error removing program from favorites', error as Error, { 
        userId: userId.toString(),
        programId: programId.toString()
      });
      throw error;
    }
  }

  /**
   * Check if exercise is favorite
   */
  public async isFavoriteExercise(
    userId: Types.ObjectId, 
    exerciseId: Types.ObjectId
  ): Promise<boolean> {
    try {
      this.logger.debug('Checking if exercise is favorite', { 
        userId: userId.toString(),
        exerciseId: exerciseId.toString() 
      });

      const favorite = await this.findByUser(userId);
      
      if (!favorite) {
        return false;
      }

      return favorite.exercises.some(
        id => id.toString() === exerciseId.toString()
      );
    } catch (error) {
      this.logger.error('Error checking if exercise is favorite', error as Error, { 
        userId: userId.toString(),
        exerciseId: exerciseId.toString()
      });
      throw error;
    }
  }

  /**
   * Check if workout is favorite
   */
  public async isFavoriteWorkout(
    userId: Types.ObjectId, 
    workoutId: Types.ObjectId
  ): Promise<boolean> {
    try {
      this.logger.debug('Checking if workout is favorite', { 
        userId: userId.toString(),
        workoutId: workoutId.toString() 
      });

      const favorite = await this.findByUser(userId);
      
      if (!favorite) {
        return false;
      }

      return favorite.workouts.some(
        id => id.toString() === workoutId.toString()
      );
    } catch (error) {
      this.logger.error('Error checking if workout is favorite', error as Error, { 
        userId: userId.toString(),
        workoutId: workoutId.toString()
      });
      throw error;
    }
  }

  /**
   * Check if program is favorite
   */
  public async isFavoriteProgram(
    userId: Types.ObjectId, 
    programId: Types.ObjectId
  ): Promise<boolean> {
    try {
      this.logger.debug('Checking if program is favorite', { 
        userId: userId.toString(),
        programId: programId.toString() 
      });

      const favorite = await this.findByUser(userId);
      
      if (!favorite) {
        return false;
      }

      return favorite.programs.some(
        id => id.toString() === programId.toString()
      );
    } catch (error) {
      this.logger.error('Error checking if program is favorite', error as Error, { 
        userId: userId.toString(),
        programId: programId.toString()
      });
      throw error;
    }
  }

  /**
   * Get favorite counts for user
   */
  public async getFavoriteCounts(userId: Types.ObjectId): Promise<{
    exercises: number;
    workouts: number;
    programs: number;
    swaps: number;
  }> {
    try {
      this.logger.debug('Getting favorite counts for user', { 
        userId: userId.toString() 
      });

      const favorite = await this.findByUser(userId);
      
      if (!favorite) {
        return { exercises: 0, workouts: 0, programs: 0, swaps: 0 };
      }

      return {
        exercises: favorite.exercises.length,
        workouts: favorite.workouts.length,
        programs: favorite.programs.length,
        swaps: favorite.swaps.length
      };
    } catch (error) {
      this.logger.error('Error getting favorite counts for user', error as Error, { 
        userId: userId.toString()
      });
      throw error;
    }
  }

  /**
   * Clear all favorites for user
   */
  public async clearAllFavorites(userId: Types.ObjectId): Promise<void> {
    try {
      this.logger.debug('Clearing all favorites for user', { 
        userId: userId.toString() 
      });

      const result = await this.crudOps.findOneAndUpdate(
        { user: userId },
        { 
          $set: {
            exercises: [],
            workouts: [],
            programs: [],
            swaps: []
          }
        }
      );

      if (result && this.cacheHelpers.isEnabled) {
        await this.cacheHelpers.invalidateByPattern(`user:*${userId.toString()}*`);
      }

      if (result) {
        await this.publishEvent('favorite.all.cleared', {
          userId: userId.toString(),
          timestamp: new Date()
        });
      }
    } catch (error) {
      this.logger.error('Error clearing all favorites for user', error as Error, { 
        userId: userId.toString()
      });
      throw error;
    }
  }

  /**
   * Validate favorite data
   */
  protected validateData(data: Partial<IFavorite>): ValidationResult {
    const errors: string[] = [];

    // User validation
    if (data.user && !ValidationHelpers.validateObjectId(data.user.toString())) {
      errors.push('Invalid user ID format');
    }

    // Theme validation
    if (data.theme !== undefined) {
      const themeValidation = ValidationHelpers.validateFieldLength(
        data.theme, 
        'theme', 
        1, 
        50
      );
      if (!themeValidation.valid) {
        errors.push(...themeValidation.errors);
      }
    }

    // Arrays validation
    const arrayFields = ['exercises', 'workouts', 'programs', 'swaps'] as const;
    
    arrayFields.forEach(field => {
      if (data[field]) {
        if (!Array.isArray(data[field])) {
          errors.push(`${field} must be an array`);
        } else {
          data[field].forEach((id, index) => {
            if (!ValidationHelpers.validateObjectId(id.toString())) {
              errors.push(`Invalid ${field} ID at index ${index}`);
            }
          });
        }
      }
    });

    return {
      valid: errors.length === 0,
      errors: errors.length > 0 ? errors : undefined
    };
  }

  /**
   * Map database document to domain entity
   */
  protected mapToEntity(data: any): IFavorite {
    return {
      _id: data._id,
      user: data.user,
      exercises: data.exercises ?? [],
      workouts: data.workouts ?? [],
      programs: data.programs ?? [],
      swaps: data.swaps ?? [],
      theme: data.theme ?? 'default',
      createdAt: data.createdAt,
      updatedAt: data.updatedAt
    } as IFavorite;
  }

  /**
   * Map domain entity to database document
   */
  protected mapFromEntity(entity: IFavorite): any {
    const doc = { ...entity };
    
    // Remove any computed fields
    delete (doc as any).__v;
    
    return doc;
  }
}
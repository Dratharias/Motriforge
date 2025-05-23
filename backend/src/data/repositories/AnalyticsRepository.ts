import { Model, Types } from 'mongoose';
import { LoggerFacade } from '@/core/logging';
import { EventMediator } from '@/core/events/EventMediator';
import { CacheFacade } from '@/core/cache/facade/CacheFacade';
import { IActivity, IActivityEntry } from '@/types/models';
import { IActivityRepository } from '@/types/repositories';
import { AggregationPipeline, ValidationResult } from '@/types/repositories/base';
import { BaseRepository } from './BaseRepository';
import { ValidationHelpers } from './helpers';

/**
 * Repository for activity operations with enhanced validation and caching
 */
export class ActivityRepository extends BaseRepository<IActivity> implements IActivityRepository {
  private static readonly CACHE_TTL = 300; // 5 minutes
  private static readonly USER_ACTIVITY_CACHE_TTL = 600; // 10 minutes for user activity

  constructor(
    activityModel: Model<IActivity>,
    logger: LoggerFacade,
    eventMediator: EventMediator,
    cache?: CacheFacade
  ) {
    super(activityModel, logger, eventMediator, cache, 'ActivityRepository');
  }

  /**
   * Find activity by user
   */
  public async findByUser(userId: Types.ObjectId): Promise<IActivity | null> {
    const cacheKey = this.cacheHelpers.generateCustomKey('user', { 
      userId: userId.toString() 
    });
    
    const cached = await this.cacheHelpers.getCustom<IActivity>(cacheKey);
    if (cached) {
      return this.mapToEntity(cached);
    }

    try {
      this.logger.debug('Finding activity by user', { userId: userId.toString() });
      
      const activity = await this.crudOps.findOne({
        user: userId
      });

      if (activity && this.cacheHelpers.isEnabled) {
        await this.cacheHelpers.setCustom(
          cacheKey, 
          activity, 
          ActivityRepository.USER_ACTIVITY_CACHE_TTL
        );
      }

      return activity ? this.mapToEntity(activity) : null;
    } catch (error) {
      this.logger.error('Error finding activity by user', error as Error, { 
        userId: userId.toString() 
      });
      throw error;
    }
  }

  /**
   * Find user entries with pagination
   */
  public async findUserEntries(
    userId: Types.ObjectId, 
    limit: number = 50
  ): Promise<IActivityEntry[]> {
    const cacheKey = this.cacheHelpers.generateCustomKey('entries', { 
      userId: userId.toString(),
      limit 
    });
    
    const cached = await this.cacheHelpers.getCustom<IActivityEntry[]>(cacheKey);
    if (cached) {
      return cached;
    }

    try {
      this.logger.debug('Finding user activity entries', { 
        userId: userId.toString(),
        limit 
      });
      
      // This would need to be implemented with a separate ActivityEntry collection
      // Using aggregation to get recent activity entries
      const pipeline: AggregationPipeline = [
        { $match: { user: userId } },
        {
          $lookup: {
            from: 'activityentries',
            localField: 'user',
            foreignField: 'user',
            as: 'entries'
          }
        },
        { $unwind: { path: '$entries', preserveNullAndEmptyArrays: true } },
        { $replaceRoot: { newRoot: { $ifNull: ['$entries', {}] } } },
        { $match: { timestamp: { $exists: true } } },
        { $sort: { timestamp: -1 } },
        { $limit: limit }
      ];

      const entries = await this.crudOps.aggregate<IActivityEntry>(pipeline);


      if (this.cacheHelpers.isEnabled) {
        await this.cacheHelpers.setCustom(cacheKey, entries, ActivityRepository.CACHE_TTL);
      }

      return entries;
    } catch (error) {
      this.logger.error('Error finding user activity entries', error as Error, { 
        userId: userId.toString(),
        limit 
      });
      throw error;
    }
  }

  /**
   * Record new activity entry
   */
  public async recordActivity(entry: Partial<IActivityEntry>): Promise<IActivityEntry> {
    try {
      this.logger.debug('Recording activity entry', { 
        userId: entry.user?.toString(),
        action: entry.action 
      });

      // Create the activity entry
      const activityEntry: Partial<IActivityEntry> = {
        ...entry,
        timestamp: entry.timestamp ?? new Date(),
        meta: entry.meta ?? {}
      };

      // This would typically be inserted into a separate ActivityEntry collection
      // For now, we'll simulate the creation
      const createdEntry = {
        _id: new Types.ObjectId(),
        ...activityEntry,
        createdAt: new Date(),
        updatedAt: new Date()
      } as IActivityEntry;

      // Update the user's activity record
      if (entry.user) {
        await this.updateUserActivityStats(entry.user, entry.action!, entry.duration);
      }

      // Invalidate related caches
      if (this.cacheHelpers.isEnabled && entry.user) {
        await this.cacheHelpers.invalidateByPattern(`user:*${entry.user.toString()}*`);
        await this.cacheHelpers.invalidateByPattern(`entries:*${entry.user.toString()}*`);
      }

      await this.publishEvent('activity.recorded', {
        userId: entry.user?.toString(),
        action: entry.action,
        targetModel: entry.targetModel,
        targetId: entry.targetId?.toString(),
        timestamp: new Date()
      });

      return createdEntry;
    } catch (error) {
      this.logger.error('Error recording activity entry', error as Error, { 
        userId: entry.user?.toString(),
        action: entry.action
      });
      throw error;
    }
  }

  /**
   * Update user activity statistics
   */
  private async updateUserActivityStats(
    userId: Types.ObjectId, 
    action: string, 
    duration?: number
  ): Promise<void> {
    const updateFields: any = {};
    const currentDate = new Date();

    // Handle different types of activities
    switch (action) {
      case 'workout_completed':
        updateFields.$inc = { 
          totalWorkoutsCompleted: 1,
          ...(duration && { totalWorkoutDuration: duration })
        };
        updateFields.$set = { lastWorkoutDate: currentDate };
        break;
      
      case 'workout_started':
        updateFields.$set = { lastWorkoutDate: currentDate };
        break;
      
      default:
        // For other activities, just update the timestamp
        updateFields.$set = { updatedAt: currentDate };
        break;
    }

    await this.crudOps.findOneAndUpdate(
      { user: userId },
      updateFields,
      { upsert: true }
    );
  }

  /**
   * Update user streak information
   */
  public async updateStreak(userId: Types.ObjectId): Promise<void> {
    try {
      this.logger.debug('Updating user streak', { userId: userId.toString() });

      const activity = await this.findByUser(userId);
      if (!activity) {
        return;
      }

      // Calculate current streak based on recent activity
      const currentStreak = await this.calculateCurrentStreak(userId);
      const longestStreak = Math.max(activity.longestStreak, currentStreak);

      await this.crudOps.findOneAndUpdate(
        { user: userId },
        {
          $set: {
            streak: currentStreak,
            longestStreak,
            updatedAt: new Date()
          }
        }
      );

      // Invalidate cache
      if (this.cacheHelpers.isEnabled) {
        await this.cacheHelpers.invalidateByPattern(`user:*${userId.toString()}*`);
      }

      await this.publishEvent('activity.streak.updated', {
        userId: userId.toString(),
        currentStreak,
        longestStreak,
        timestamp: new Date()
      });
    } catch (error) {
      this.logger.error('Error updating user streak', error as Error, { 
        userId: userId.toString() 
      });
      throw error;
    }
  }

  /**
   * Calculate current streak for user
   */
  private async calculateCurrentStreak(userId: Types.ObjectId): Promise<number> {
    try {
      // This would need to be implemented based on actual activity entries
      // For now, returning a placeholder value
      const recentEntries = await this.findUserEntries(userId, 30);
      
      // Simple streak calculation based on consecutive days with activity
      let streak = 0;
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      for (let i = 0; i < 30; i++) {
        const checkDate = new Date(today);
        checkDate.setDate(today.getDate() - i);
        
        const hasActivity = recentEntries.some(entry => {
          const entryDate = new Date(entry.timestamp);
          entryDate.setHours(0, 0, 0, 0);
          return entryDate.getTime() === checkDate.getTime();
        });

        if (hasActivity) {
          streak++;
        } else if (i > 0) { // Allow for today to not have activity yet
          break;
        }
      }

      return streak;
    } catch (error) {
      this.logger.error('Error calculating current streak', error as Error, { 
        userId: userId.toString() 
      });
      return 0;
    }
  }

  /**
   * Find active workout for user
   */
  public async findActiveWorkout(userId: Types.ObjectId): Promise<IActivity['activeWorkout'] | null> {
    try {
      this.logger.debug('Finding active workout for user', { userId: userId.toString() });

      const activity = await this.findByUser(userId);
      return activity?.activeWorkout ?? null;
    } catch (error) {
      this.logger.error('Error finding active workout for user', error as Error, { 
        userId: userId.toString() 
      });
      throw error;
    }
  }

  /**
   * Find active program for user
   */
  public async findActiveProgram(userId: Types.ObjectId): Promise<IActivity['activeProgram'] | null> {
    try {
      this.logger.debug('Finding active program for user', { userId: userId.toString() });

      const activity = await this.findByUser(userId);
      return activity?.activeProgram ?? null;
    } catch (error) {
      this.logger.error('Error finding active program for user', error as Error, { 
        userId: userId.toString() 
      });
      throw error;
    }
  }

  /**
   * Set active workout for user
   */
  public async setActiveWorkout(
    userId: Types.ObjectId, 
    workoutId: Types.ObjectId
  ): Promise<void> {
    try {
      this.logger.debug('Setting active workout for user', { 
        userId: userId.toString(),
        workoutId: workoutId.toString() 
      });

      const activeWorkout = {
        workoutId: workoutId,
        startedAt: new Date(),
        lastUpdatedAt: new Date(),
        completionPercentage: 0,
        notes: ''
      };

      await this.crudOps.findOneAndUpdate(
        { user: userId },
        {
          $set: {
            activeWorkout,
            updatedAt: new Date()
          },
          $setOnInsert: {
            user: userId,
            subscribedWorkouts: [],
            subscribedPrograms: [],
            activeProgram: null,
            totalWorkoutsCompleted: 0,
            totalWorkoutDuration: 0,
            lastWorkoutDate: new Date(),
            streak: 0,
            longestStreak: 0
          }
        },
        { upsert: true }
      );

      // Invalidate cache
      if (this.cacheHelpers.isEnabled) {
        await this.cacheHelpers.invalidateByPattern(`user:*${userId.toString()}*`);
      }

      await this.publishEvent('activity.workout.started', {
        userId: userId.toString(),
        workoutId: workoutId.toString(),
        timestamp: new Date()
      });
    } catch (error) {
      this.logger.error('Error setting active workout for user', error as Error, { 
        userId: userId.toString(),
        workoutId: workoutId.toString()
      });
      throw error;
    }
  }

  /**
   * Set active program for user
   */
  public async setActiveProgram(
    userId: Types.ObjectId, 
    programId: Types.ObjectId
  ): Promise<void> {
    try {
      this.logger.debug('Setting active program for user', { 
        userId: userId.toString(),
        programId: programId.toString() 
      });

      const activeProgram = {
        programId: programId,
        startedAt: new Date(),
        currentDay: 1,
        completedWorkouts: [],
        lastCompletedDate: new Date(),
        adherencePercentage: 0,
        notes: ''
      };

      await this.crudOps.findOneAndUpdate(
        { user: userId },
        {
          $set: {
            activeProgram,
            updatedAt: new Date()
          },
          $setOnInsert: {
            user: userId,
            subscribedWorkouts: [],
            subscribedPrograms: [],
            activeWorkout: null,
            totalWorkoutsCompleted: 0,
            totalWorkoutDuration: 0,
            lastWorkoutDate: new Date(),
            streak: 0,
            longestStreak: 0
          }
        },
        { upsert: true }
      );

      // Invalidate cache
      if (this.cacheHelpers.isEnabled) {
        await this.cacheHelpers.invalidateByPattern(`user:*${userId.toString()}*`);
      }

      await this.publishEvent('activity.program.started', {
        userId: userId.toString(),
        programId: programId.toString(),
        timestamp: new Date()
      });
    } catch (error) {
      this.logger.error('Error setting active program for user', error as Error, { 
        userId: userId.toString(),
        programId: programId.toString()
      });
      throw error;
    }
  }

  /**
   * Clear active workout for user
   */
  public async clearActiveWorkout(userId: Types.ObjectId): Promise<void> {
    try {
      this.logger.debug('Clearing active workout for user', { userId: userId.toString() });

      await this.crudOps.findOneAndUpdate(
        { user: userId },
        {
          $unset: { activeWorkout: 1 },
          $set: { updatedAt: new Date() }
        }
      );

      // Invalidate cache
      if (this.cacheHelpers.isEnabled) {
        await this.cacheHelpers.invalidateByPattern(`user:*${userId.toString()}*`);
      }

      await this.publishEvent('activity.workout.cleared', {
        userId: userId.toString(),
        timestamp: new Date()
      });
    } catch (error) {
      this.logger.error('Error clearing active workout for user', error as Error, { 
        userId: userId.toString()
      });
      throw error;
    }
  }

  /**
   * Clear active program for user
   */
  public async clearActiveProgram(userId: Types.ObjectId): Promise<void> {
    try {
      this.logger.debug('Clearing active program for user', { userId: userId.toString() });

      await this.crudOps.findOneAndUpdate(
        { user: userId },
        {
          $unset: { activeProgram: 1 },
          $set: { updatedAt: new Date() }
        }
      );

      // Invalidate cache
      if (this.cacheHelpers.isEnabled) {
        await this.cacheHelpers.invalidateByPattern(`user:*${userId.toString()}*`);
      }

      await this.publishEvent('activity.program.cleared', {
        userId: userId.toString(),
        timestamp: new Date()
      });
    } catch (error) {
      this.logger.error('Error clearing active program for user', error as Error, { 
        userId: userId.toString()
      });
      throw error;
    }
  }

  /**
   * Validate activity data
   */
  protected validateData(data: Partial<IActivity>): ValidationResult {
    const errors: string[] = [];

    // User validation
    if (data.user && !ValidationHelpers.validateObjectId(data.user.toString())) {
      errors.push('Invalid user ID format');
    }

    // Numeric field validations
    this.validateNumericFields(data, errors);

    // Array field validations
    this.validateArrayFields(data, errors);

    // Date field validations
    this.validateDateFields(data, errors);

    return {
      valid: errors.length === 0,
      errors: errors.length > 0 ? errors : undefined
    };
  }

  /**
   * Validate numeric fields
   */
  private validateNumericFields(data: Partial<IActivity>, errors: string[]): void {
    const numericFields = [
      { field: 'totalWorkoutsCompleted', min: 0, max: 100000 },
      { field: 'totalWorkoutDuration', min: 0, max: 10000000 },
      { field: 'streak', min: 0, max: 10000 },
      { field: 'longestStreak', min: 0, max: 10000 }
    ] as const;

    numericFields.forEach(({ field, min, max }) => {
      if (data[field] !== undefined) {
        const validation = ValidationHelpers.validateNumericRange(
          data[field], 
          field, 
          min, 
          max
        );
        if (!validation.valid) {
          errors.push(...validation.errors);
        }
      }
    });
  }

  /**
   * Validate array fields
   */
  private validateArrayFields(data: Partial<IActivity>, errors: string[]): void {
    const arrayFields = ['subscribedWorkouts', 'subscribedPrograms'] as const;
    
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
  }

  /**
   * Validate date fields
   */
  private validateDateFields(data: Partial<IActivity>, errors: string[]): void {
    if (data.lastWorkoutDate && isNaN(new Date(data.lastWorkoutDate).getTime())) {
      errors.push('Invalid lastWorkoutDate format');
    }
  }

  /**
   * Map database document to domain entity
   */
  protected mapToEntity(data: any): IActivity {
    return {
      _id: data._id,
      user: data.user,
      subscribedWorkouts: data.subscribedWorkouts ?? [],
      subscribedPrograms: data.subscribedPrograms ?? [],
      activeWorkout: data.activeWorkout ?? null,
      activeProgram: data.activeProgram ?? null,
      totalWorkoutsCompleted: data.totalWorkoutsCompleted ?? 0,
      totalWorkoutDuration: data.totalWorkoutDuration ?? 0,
      lastWorkoutDate: data.lastWorkoutDate ?? new Date(),
      streak: data.streak ?? 0,
      longestStreak: data.longestStreak ?? 0,
      createdAt: data.createdAt,
      updatedAt: data.updatedAt
    } as IActivity;
  }

  /**
   * Map domain entity to database document
   */
  protected mapFromEntity(entity: IActivity): any {
    const doc = { ...entity };
    
    // Remove any computed fields
    delete (doc as any).__v;
    
    return doc;
  }
}
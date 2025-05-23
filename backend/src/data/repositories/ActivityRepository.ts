import { Model, Types } from 'mongoose';
import { LoggerFacade } from '@/core/logging';
import { EventMediator } from '@/core/events/EventMediator';
import { CacheFacade } from '@/core/cache/facade/CacheFacade';
import { IActivity, IActivityEntry, IActiveWorkout, IActiveProgram } from '@/types/models';
import { IActivityRepository } from '@/types/repositories';
import { ValidationResult, RepositoryContext } from '@/types/repositories/base';
import { BaseRepository } from './BaseRepository';
import { ValidationHelpers } from './helpers';

/**
 * Repository for activity tracking operations with enhanced validation and caching
 */
export class ActivityRepository extends BaseRepository<IActivity> implements IActivityRepository {
  private static readonly CACHE_TTL = 300; // 5 minutes for activity data
  private static readonly USER_ACTIVITY_CACHE_TTL = 600; // 10 minutes for user activity
  private static readonly ENTRY_CACHE_TTL = 180; // 3 minutes for activity entries

  constructor(
    activityModel: Model<IActivity>,
    logger: LoggerFacade,
    eventMediator: EventMediator,
    cache?: CacheFacade
  ) {
    super(activityModel, logger, eventMediator, cache, 'ActivityRepository');
  }

  /**
   * Find activity by user ID
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
      }) as IActivity;

      if (activity && this.cacheHelpers.isEnabled) {
        await this.cacheHelpers.setCustom(
          cacheKey, 
          activity, 
          ActivityRepository.USER_ACTIVITY_CACHE_TTL
        );
        const activityId = this.extractId(activity);
        if (activityId) {
          await this.cacheHelpers.cacheById(activityId, activity, ActivityRepository.CACHE_TTL);
        }
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
   * Find user activity entries with pagination
   */
  public async findUserEntries(
    userId: Types.ObjectId, 
    limit: number = 50
  ): Promise<IActivityEntry[]> {
    const cacheKey = this.cacheHelpers.generateCustomKey('user_entries', { 
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
      // Using aggregation to get recent entries
      const entries = await this.crudOps.aggregate<IActivityEntry>([
        {
          $lookup: {
            from: 'activityentries',
            localField: 'user',
            foreignField: 'user',
            as: 'entries'
          }
        },
        { $match: { user: userId } },
        { $unwind: '$entries' },
        { $replaceRoot: { newRoot: '$entries' } },
        { $sort: { timestamp: -1 } },
        { $limit: limit }
      ]);

      if (this.cacheHelpers.isEnabled) {
        await this.cacheHelpers.setCustom(cacheKey, entries, ActivityRepository.ENTRY_CACHE_TTL);
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
        action: entry.action,
        targetModel: entry.targetModel 
      });

      // Create the activity entry - this would typically be in a separate collection
      const activityEntry: IActivityEntry = {
        _id: new Types.ObjectId(),
        user: entry.user as Types.ObjectId,
        activityId: entry.activityId as Types.ObjectId,
        targetModel: entry.targetModel ?? 'unknown',
        targetId: entry.targetId as Types.ObjectId,
        action: entry.action!,
        timestamp: entry.timestamp ?? new Date(),
        duration: entry.duration,
        progress: entry.progress,
        meta: entry.meta ?? {},
        createdAt: new Date(),
        updatedAt: new Date()
      };

      // Update user's activity summary
      await this.updateActivitySummary(entry.user as Types.ObjectId, entry);

      // Invalidate relevant caches
      if (this.cacheHelpers.isEnabled) {
        await this.cacheHelpers.invalidateByPattern('user:*');
        await this.cacheHelpers.invalidateByPattern('user_entries:*');
      }

      // Publish activity recorded event
      await this.publishEvent('activity.recorded', {
        userId: entry.user?.toString(),
        action: entry.action,
        targetModel: entry.targetModel,
        targetId: entry.targetId?.toString(),
        timestamp: new Date()
      });

      return activityEntry;
    } catch (error) {
      this.logger.error('Error recording activity entry', error as Error, { 
        userId: entry.user?.toString(),
        action: entry.action 
      });
      throw error;
    }
  }

  /**
   * Update user streak based on recent activity
   */
  public async updateStreak(userId: Types.ObjectId): Promise<void> {
    try {
      this.logger.debug('Updating user streak', { userId: userId.toString() });

      const activity = await this.findByUser(userId);
      if (!activity) {
        return;
      }

      const lastWorkoutDate = await this.getLastWorkoutDate(userId);
      const newStreak = this.calculateStreak(activity.streak, lastWorkoutDate);
      const longestStreak = Math.max(activity.longestStreak, newStreak);

      await this.updateActivityStreak(activity._id, newStreak, longestStreak);

      if (this.cacheHelpers.isEnabled) {
        await this.cacheHelpers.invalidateAfterUpdate(activity._id);
      }

      await this.publishStreakUpdatedEvent(userId, newStreak, longestStreak);
    } catch (error) {
      this.logger.error('Error updating user streak', error as Error, { 
        userId: userId.toString() 
      });
      throw error;
    }
  }

  /**
   * Get last workout completion date for user
   */
  private async getLastWorkoutDate(userId: Types.ObjectId): Promise<Date | null> {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);

    const pipeline = [
      {
        $lookup: {
          from: 'activityentries',
          localField: 'user',
          foreignField: 'user',
          as: 'entries'
        }
      },
      { $match: { user: userId } },
      { $unwind: '$entries' },
      {
        $match: {
          'entries.action': 'workout_completed',
          'entries.timestamp': { $gte: yesterday }
        }
      },
      {
        $group: {
          _id: null,
          lastWorkoutDate: { $max: '$entries.timestamp' }
        }
      }
    ];

    const recentEntries = await this.crudOps.aggregate<{ lastWorkoutDate: Date }>(pipeline);
    return recentEntries[0]?.lastWorkoutDate ?? null;
  }

  /**
   * Calculate new streak based on last workout date
   */
  private calculateStreak(currentStreak: number, lastWorkoutDate: Date | null): number {
    if (!lastWorkoutDate) {
      return 0;
    }

    const today = new Date();
    const daysSinceLastWorkout = Math.floor(
      (today.getTime() - lastWorkoutDate.getTime()) / (1000 * 60 * 60 * 24)
    );

    if (daysSinceLastWorkout === 0) {
      return currentStreak + 1; // Workout completed today
    } else if (daysSinceLastWorkout === 1) {
      return currentStreak; // Maintain current streak
    } else {
      return 0; // Streak broken
    }
  }

  /**
   * Update activity streak in database
   */
  private async updateActivityStreak(
    activityId: Types.ObjectId,
    newStreak: number,
    longestStreak: number
  ): Promise<void> {
    await this.crudOps.update(activityId, {
      streak: newStreak,
      longestStreak,
      updatedAt: new Date()
    });
  }

  /**
   * Publish streak updated event
   */
  private async publishStreakUpdatedEvent(
    userId: Types.ObjectId,
    newStreak: number,
    longestStreak: number
  ): Promise<void> {
    await this.publishEvent('activity.streak.updated', {
      userId: userId.toString(),
      newStreak,
      longestStreak,
      timestamp: new Date()
    });
  }

  /**
   * Find active workout for user
   */
  public async findActiveWorkout(userId: Types.ObjectId): Promise<IActiveWorkout | null> {
    try {
      this.logger.debug('Finding active workout', { userId: userId.toString() });

      const activity = await this.findByUser(userId);
      return activity?.activeWorkout ?? null;
    } catch (error) {
      this.logger.error('Error finding active workout', error as Error, { 
        userId: userId.toString() 
      });
      throw error;
    }
  }

  /**
   * Find active program for user
   */
  public async findActiveProgram(userId: Types.ObjectId): Promise<IActiveProgram | null> {
    try {
      this.logger.debug('Finding active program', { userId: userId.toString() });

      const activity = await this.findByUser(userId);
      return activity?.activeProgram ?? null;
    } catch (error) {
      this.logger.error('Error finding active program', error as Error, { 
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
      this.logger.debug('Setting active workout', { 
        userId: userId.toString(),
        workoutId: workoutId.toString() 
      });

      const activeWorkout: IActiveWorkout = {
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
          }
        },
        { upsert: true }
      );

      if (this.cacheHelpers.isEnabled) {
        await this.cacheHelpers.invalidateByPattern('user:*');
      }

      await this.publishEvent('activity.workout.started', {
        userId: userId.toString(),
        workoutId: workoutId.toString(),
        timestamp: new Date()
      });
    } catch (error) {
      this.logger.error('Error setting active workout', error as Error, { 
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
      this.logger.debug('Setting active program', { 
        userId: userId.toString(),
        programId: programId.toString() 
      });

      const activeProgram: IActiveProgram = {
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
          }
        },
        { upsert: true }
      );

      if (this.cacheHelpers.isEnabled) {
        await this.cacheHelpers.invalidateByPattern('user:*');
      }

      await this.publishEvent('activity.program.started', {
        userId: userId.toString(),
        programId: programId.toString(),
        timestamp: new Date()
      });
    } catch (error) {
      this.logger.error('Error setting active program', error as Error, { 
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
      this.logger.debug('Clearing active workout', { userId: userId.toString() });

      await this.crudOps.findOneAndUpdate(
        { user: userId },
        {
          $unset: { activeWorkout: 1 },
          $set: { updatedAt: new Date() }
        }
      );

      if (this.cacheHelpers.isEnabled) {
        await this.cacheHelpers.invalidateByPattern('user:*');
      }

      await this.publishEvent('activity.workout.cleared', {
        userId: userId.toString(),
        timestamp: new Date()
      });
    } catch (error) {
      this.logger.error('Error clearing active workout', error as Error, { 
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
      this.logger.debug('Clearing active program', { userId: userId.toString() });

      await this.crudOps.findOneAndUpdate(
        { user: userId },
        { 
          $unset: { activeProgram: 1 },
          $set: { updatedAt: new Date() }
        }
      );

      if (this.cacheHelpers.isEnabled) {
        await this.cacheHelpers.invalidateByPattern('user:*');
      }

      await this.publishEvent('activity.program.cleared', {
        userId: userId.toString(),
        timestamp: new Date()
      });
    } catch (error) {
      this.logger.error('Error clearing active program', error as Error, { 
        userId: userId.toString() 
      });
      throw error;
    }
  }

  /**
   * Update activity summary based on new entry
   */
  private async updateActivitySummary(
    userId: Types.ObjectId, 
    entry: Partial<IActivityEntry>
  ): Promise<void> {
    try {
      const updateData: any = {
        updatedAt: new Date()
      };

      // Update counters based on action type
      if (entry.action === 'workout_completed') {
        updateData.$inc = {
          totalWorkoutsCompleted: 1,
          totalWorkoutDuration: entry.duration ?? 0
        };
        updateData.$set = {
          lastWorkoutDate: entry.timestamp ?? new Date()
        };
      }

      await this.crudOps.findOneAndUpdate(
        { user: userId },
        updateData,
        { upsert: true }
      );
    } catch (error) {
      this.logger.warn('Error updating activity summary', { 
        userId: userId.toString(),
        error: (error as Error).message 
      });
    }
  }

  /**
   * Override create to handle activity-specific logic
   */
  public async create(data: Partial<IActivity>, context?: RepositoryContext): Promise<IActivity> {
    // Set default values
    const activityData: Partial<IActivity> = {
      ...data,
      subscribedWorkouts: data.subscribedWorkouts ?? [],
      subscribedPrograms: data.subscribedPrograms ?? [],
      activeWorkout: data.activeWorkout ?? null,
      activeProgram: data.activeProgram ?? null,
      totalWorkoutsCompleted: 0,
      totalWorkoutDuration: 0,
      lastWorkoutDate: new Date(),
      streak: 0,
      longestStreak: 0
    };

    const activity = await super.create(activityData, context);

    // Publish activity creation event
    await this.publishEvent('activity.created', {
      activityId: activity._id.toString(),
      userId: activity.user.toString(),
      timestamp: new Date()
    });

    return activity;
  }

  /**
   * Validate activity data
   */
  protected validateData(data: Partial<IActivity>): ValidationResult {
    const errors: string[] = [];

    // User validation (required)
    if (!data.user) {
      errors.push('User is required');
    }

    // Numeric field validations
    if (data.totalWorkoutsCompleted !== undefined) {
      const workoutCountValidation = ValidationHelpers.validateNumericRange(
        data.totalWorkoutsCompleted, 
        'totalWorkoutsCompleted', 
        0, 
        10000
      );
      if (!workoutCountValidation.valid) {
        errors.push(...workoutCountValidation.errors);
      }
    }

    if (data.totalWorkoutDuration !== undefined) {
      const durationValidation = ValidationHelpers.validateNumericRange(
        data.totalWorkoutDuration, 
        'totalWorkoutDuration', 
        0, 
        100000
      );
      if (!durationValidation.valid) {
        errors.push(...durationValidation.errors);
      }
    }

    if (data.streak !== undefined) {
      const streakValidation = ValidationHelpers.validateNumericRange(
        data.streak, 
        'streak', 
        0, 
        1000
      );
      if (!streakValidation.valid) {
        errors.push(...streakValidation.errors);
      }
    }

    // Array validations
    if (data.subscribedWorkouts && !Array.isArray(data.subscribedWorkouts)) {
      errors.push('Subscribed workouts must be an array');
    }

    if (data.subscribedPrograms && !Array.isArray(data.subscribedPrograms)) {
      errors.push('Subscribed programs must be an array');
    }

    return {
      valid: errors.length === 0,
      errors: errors.length > 0 ? errors : undefined
    };
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
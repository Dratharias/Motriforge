import { Model, Types } from 'mongoose';
import { LoggerFacade } from '@/core/logging';
import { EventMediator } from '@/core/events/EventMediator';
import { CacheFacade } from '@/core/cache/facade/CacheFacade';
import { IProgram, IProgramScheduleItem } from '@/types/models';
import { IProgramRepository, ValidationResult, RepositoryContext, AggregationPipeline } from '@/types/repositories';
import { BaseRepository } from './BaseRepository';
import { ValidationHelpers } from './helpers';

/**
 * Repository for program operations with enhanced validation and caching
 */
export class ProgramRepository extends BaseRepository<IProgram> implements IProgramRepository {
  private static readonly CACHE_TTL = 600; // 10 minutes
  private static readonly PROGRAM_CACHE_TTL = 1800; // 30 minutes for program data
  private static readonly POPULAR_CACHE_TTL = 3600; // 1 hour for popular programs
  private static readonly SCHEDULE_CACHE_TTL = 1200; // 20 minutes for schedule data

  constructor(
    programModel: Model<IProgram>,
    logger: LoggerFacade,
    eventMediator: EventMediator,
    cache?: CacheFacade
  ) {
    super(programModel, logger, eventMediator, cache, 'ProgramRepository');
  }

  /**
   * Find program by name
   */
  public async findByName(name: string): Promise<IProgram | null> {
    const cacheKey = this.cacheHelpers.generateCustomKey('name', { name });
    
    const cached = await this.cacheHelpers.getCustom<IProgram>(cacheKey);
    if (cached) {
      return this.mapToEntity(cached);
    }

    try {
      this.logger.debug('Finding program by name', { name });
      
      const program = await this.crudOps.findOne({
        name: { $regex: new RegExp(`^${name}$`, 'i') }
      });

      if (program && this.cacheHelpers.isEnabled) {
        await this.cacheHelpers.setCustom(cacheKey, program, ProgramRepository.PROGRAM_CACHE_TTL);
        const programId = this.extractId(program);
        if (programId) {
          await this.cacheHelpers.cacheById(programId, program, ProgramRepository.PROGRAM_CACHE_TTL);
        }
      }

      return program ? this.mapToEntity(program) : null;
    } catch (error) {
      this.logger.error('Error finding program by name', error as Error, { name });
      throw error;
    }
  }

  /**
   * Find programs by goal
   */
  public async findByGoal(goal: string): Promise<IProgram[]> {
    const cacheKey = this.cacheHelpers.generateCustomKey('goal', { goal });
    
    const cached = await this.cacheHelpers.getCustom<IProgram[]>(cacheKey);
    if (cached) {
      return cached.map(program => this.mapToEntity(program));
    }

    try {
      this.logger.debug('Finding programs by goal', { goal });
      
      const programs = await this.crudOps.find({
        $or: [
          { goal: goal },
          { subgoals: { $in: [goal] } }
        ]
      }, {
        sort: [{ field: 'name', direction: 'asc' }]
      });

      if (this.cacheHelpers.isEnabled) {
        await this.cacheHelpers.setCustom(cacheKey, programs, ProgramRepository.CACHE_TTL);
      }

      return programs.map(program => this.mapToEntity(program));
    } catch (error) {
      this.logger.error('Error finding programs by goal', error as Error, { goal });
      throw error;
    }
  }

  /**
   * Find programs by duration range
   */
  public async findByDuration(minWeeks: number, maxWeeks: number): Promise<IProgram[]> {
    const cacheKey = this.cacheHelpers.generateCustomKey('duration', { 
      minWeeks, 
      maxWeeks 
    });
    
    const cached = await this.cacheHelpers.getCustom<IProgram[]>(cacheKey);
    if (cached) {
      return cached.map(program => this.mapToEntity(program));
    }

    try {
      this.logger.debug('Finding programs by duration', { minWeeks, maxWeeks });
      
      const programs = await this.crudOps.find({
        durationInWeeks: {
          $gte: minWeeks,
          $lte: maxWeeks
        }
      }, {
        sort: [{ field: 'durationInWeeks', direction: 'asc' }]
      });

      if (this.cacheHelpers.isEnabled) {
        await this.cacheHelpers.setCustom(cacheKey, programs, ProgramRepository.CACHE_TTL);
      }

      return programs.map(program => this.mapToEntity(program));
    } catch (error) {
      this.logger.error('Error finding programs by duration', error as Error, { 
        minWeeks, 
        maxWeeks 
      });
      throw error;
    }
  }

  /**
   * Find programs by organization
   */
  public async findByOrganization(organizationId: Types.ObjectId): Promise<IProgram[]> {
    const cacheKey = this.cacheHelpers.generateCustomKey('organization', { 
      organizationId: organizationId.toString() 
    });
    
    const cached = await this.cacheHelpers.getCustom<IProgram[]>(cacheKey);
    if (cached) {
      return cached.map(program => this.mapToEntity(program));
    }

    try {
      this.logger.debug('Finding programs by organization', { 
        organizationId: organizationId.toString() 
      });
      
      const programs = await this.crudOps.find({
        organization: organizationId
      }, {
        sort: [{ field: 'name', direction: 'asc' }]
      });

      if (this.cacheHelpers.isEnabled) {
        await this.cacheHelpers.setCustom(cacheKey, programs, ProgramRepository.CACHE_TTL);
      }

      return programs.map(program => this.mapToEntity(program));
    } catch (error) {
      this.logger.error('Error finding programs by organization', error as Error, { 
        organizationId: organizationId.toString() 
      });
      throw error;
    }
  }

  /**
   * Find programs by creator
   */
  public async findByCreator(creatorId: Types.ObjectId): Promise<IProgram[]> {
    const cacheKey = this.cacheHelpers.generateCustomKey('creator', { 
      creatorId: creatorId.toString() 
    });
    
    const cached = await this.cacheHelpers.getCustom<IProgram[]>(cacheKey);
    if (cached) {
      return cached.map(program => this.mapToEntity(program));
    }

    try {
      this.logger.debug('Finding programs by creator', { 
        creatorId: creatorId.toString() 
      });
      
      const programs = await this.crudOps.find({
        createdBy: creatorId
      }, {
        sort: [{ field: 'createdAt', direction: 'desc' }]
      });

      if (this.cacheHelpers.isEnabled) {
        await this.cacheHelpers.setCustom(cacheKey, programs, ProgramRepository.CACHE_TTL);
      }

      return programs.map(program => this.mapToEntity(program));
    } catch (error) {
      this.logger.error('Error finding programs by creator', error as Error, { 
        creatorId: creatorId.toString() 
      });
      throw error;
    }
  }

  /**
   * Find template programs
   */
  public async findTemplates(): Promise<IProgram[]> {
    const cacheKey = this.cacheHelpers.generateCustomKey('templates', {});
    
    const cached = await this.cacheHelpers.getCustom<IProgram[]>(cacheKey);
    if (cached) {
      return cached.map(program => this.mapToEntity(program));
    }

    try {
      this.logger.debug('Finding template programs');
      
      const programs = await this.crudOps.find({
        isTemplate: true
      }, {
        sort: [{ field: 'name', direction: 'asc' }]
      });

      if (this.cacheHelpers.isEnabled) {
        await this.cacheHelpers.setCustom(cacheKey, programs, ProgramRepository.CACHE_TTL);
      }

      return programs.map(program => this.mapToEntity(program));
    } catch (error) {
      this.logger.error('Error finding template programs', error as Error);
      throw error;
    }
  }

  /**
   * Find programs by tags
   */
  public async findByTags(tags: string[]): Promise<IProgram[]> {
    const cacheKey = this.cacheHelpers.generateCustomKey('tags', { 
      tags: tags.toSorted((a, b) => a.localeCompare(b))  
    });
    
    const cached = await this.cacheHelpers.getCustom<IProgram[]>(cacheKey);
    if (cached) {
      return cached.map(program => this.mapToEntity(program));
    }

    try {
      this.logger.debug('Finding programs by tags', { tags });
      
      const programs = await this.crudOps.find({
        tags: { $in: tags }
      }, {
        sort: [{ field: 'name', direction: 'asc' }]
      });

      if (this.cacheHelpers.isEnabled) {
        await this.cacheHelpers.setCustom(cacheKey, programs, ProgramRepository.CACHE_TTL);
      }

      return programs.map(program => this.mapToEntity(program));
    } catch (error) {
      this.logger.error('Error finding programs by tags', error as Error, { tags });
      throw error;
    }
  }

  /**
   * Find program schedule
   */
  public async findSchedule(programId: Types.ObjectId): Promise<IProgramScheduleItem[]> {
    const cacheKey = this.cacheHelpers.generateCustomKey('schedule', { 
      programId: programId.toString() 
    });
    
    const cached = await this.cacheHelpers.getCustom<IProgramScheduleItem[]>(cacheKey);
    if (cached) {
      return cached;
    }

    try {
      this.logger.debug('Finding program schedule', { 
        programId: programId.toString() 
      });
      
      // Fixed aggregation pipeline with proper typing
      const pipeline: AggregationPipeline = [
        { 
          $match: { 
            _id: programId
          } 
        },
        {
          $lookup: {
            from: 'programschedules',
            localField: '_id',
            foreignField: 'programId',
            as: 'scheduleItems'
          }
        },
        { 
          $unwind: '$scheduleItems' 
        },
        { 
          $replaceRoot: { 
            newRoot: '$scheduleItems' 
          } 
        },
        { 
          $sort: { 
            week: 1, 
            day: 1 
          } 
        }
      ];

      const scheduleItems = await this.crudOps.aggregate<IProgramScheduleItem>(pipeline);

      if (this.cacheHelpers.isEnabled) {
        await this.cacheHelpers.setCustom(
          cacheKey, 
          scheduleItems, 
          ProgramRepository.SCHEDULE_CACHE_TTL
        );
      }

      return scheduleItems;
    } catch (error) {
      this.logger.error('Error finding program schedule', error as Error, { 
        programId: programId.toString() 
      });
      throw error;
    }
  }

  /**
   * Search programs by name
   */
  public async searchByName(query: string, limit: number = 20): Promise<IProgram[]> {
    try {
      this.logger.debug('Searching programs by name', { query, limit });
      
      const programs = await this.crudOps.find({
        name: { $regex: query, $options: 'i' }
      }, {
        sort: [{ field: 'name', direction: 'asc' }],
        pagination: { limit, offset: 0, page: 1, pageSize: limit }
      });

      return programs.map(program => this.mapToEntity(program));
    } catch (error) {
      this.logger.error('Error searching programs by name', error as Error, { query, limit });
      throw error;
    }
  }

  /**
   * Find popular programs
   */
  public async findPopular(limit: number = 10): Promise<IProgram[]> {
    const cacheKey = this.cacheHelpers.generateCustomKey('popular', { limit });
    
    const cached = await this.cacheHelpers.getCustom<IProgram[]>(cacheKey);
    if (cached) {
      return cached.map(program => this.mapToEntity(program));
    }

    try {
      this.logger.debug('Finding popular programs', { limit });
      
      const programs = await this.crudOps.find({}, {
        sort: [{ field: 'subscribersCount', direction: 'desc' }],
        pagination: { limit, offset: 0, page: 1, pageSize: limit }
      });

      if (this.cacheHelpers.isEnabled) {
        await this.cacheHelpers.setCustom(
          cacheKey, 
          programs, 
          ProgramRepository.POPULAR_CACHE_TTL
        );
      }

      return programs.map(program => this.mapToEntity(program));
    } catch (error) {
      this.logger.error('Error finding popular programs', error as Error, { limit });
      throw error;
    }
  }

  /**
   * Increment subscriber count for program
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
        await this.publishEvent('program.subscriber_count.incremented', {
          programId: id.toString(),
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
   * Find programs by target exercises
   */
  public async findByTargetExercises(exerciseIds: (Types.ObjectId)[]): Promise<IProgram[]> {
    const cacheKey = this.cacheHelpers.generateCustomKey('target_exercises', { 
      exerciseIds: exerciseIds.map(id => id.toString()).sort((a, b) => a.localeCompare(b)) 
    });
    
    const cached = await this.cacheHelpers.getCustom<IProgram[]>(cacheKey);
    if (cached) {
      return cached.map(program => this.mapToEntity(program));
    }

    try {
      this.logger.debug('Finding programs by target exercises', { 
        exerciseCount: exerciseIds.length 
      });
      
      const objectIds = exerciseIds.map(id => id);
      const programs = await this.crudOps.find({
        'targetExercises.exerciseId': { $in: objectIds }
      }, {
        sort: [{ field: 'name', direction: 'asc' }]
      });

      if (this.cacheHelpers.isEnabled) {
        await this.cacheHelpers.setCustom(cacheKey, programs, ProgramRepository.CACHE_TTL);
      }

      return programs.map(program => this.mapToEntity(program));
    } catch (error) {
      this.logger.error('Error finding programs by target exercises', error as Error, { 
        exerciseCount: exerciseIds.length 
      });
      throw error;
    }
  }

  /**
   * Find programs with difficulty assessment
   */
  public async findByComplexity(
    minComplexity: number, 
    maxComplexity: number
  ): Promise<IProgram[]> {
    try {
      this.logger.debug('Finding programs by complexity', { minComplexity, maxComplexity });
      
      // Fixed aggregation pipeline with proper typing
      const pipeline: AggregationPipeline = [
        {
          $addFields: {
            complexityScore: {
              $add: [
                { $multiply: ['$durationInWeeks', 2] },
                { $size: { $ifNull: ['$targetExercises', []] } },
                { $size: { $ifNull: ['$subgoals', []] } }
              ]
            }
          }
        },
        {
          $match: {
            complexityScore: {
              $gte: minComplexity,
              $lte: maxComplexity
            }
          }
        },
        { 
          $sort: { 
            complexityScore: 1 
          } 
        }
      ];

      const programs = await this.crudOps.aggregate<IProgram>(pipeline);

      return programs.map(program => this.mapToEntity(program));
    } catch (error) {
      this.logger.error('Error finding programs by complexity', error as Error, { 
        minComplexity, 
        maxComplexity 
      });
      throw error;
    }
  }

  /**
   * Override create to handle program-specific logic
   */
  public async create(data: Partial<IProgram>, context?: RepositoryContext): Promise<IProgram> {
    // Validate unique name within organization
    if (data.name && data.organization) {
      const existingProgram = await this.crudOps.findOne({
        name: { $regex: new RegExp(`^${data.name}$`, 'i') },
        organization: data.organization
      });
      
      if (existingProgram) {
        throw new Error('Program with this name already exists in the organization');
      }
    }

    // Set default values
    const programData: Partial<IProgram> = {
      ...data,
      tags: data.tags ?? [],
      subgoals: data.subgoals ?? [],
      targetExercises: data.targetExercises ?? [],
      targetMetrics: data.targetMetrics ?? {},
      mediaIds: data.mediaIds ?? [],
      subscribersCount: 0,
      isTemplate: data.isTemplate ?? false,
      shared: data.shared ?? false
    };

    const program = await super.create(programData, context);

    // Publish program creation event
    await this.publishEvent('program.created', {
      programId: program._id.toString(),
      name: program.name,
      organizationId: program.organization.toString(),
      durationInWeeks: program.durationInWeeks,
      targetExerciseCount: program.targetExercises.length,
      isTemplate: program.isTemplate,
      timestamp: new Date()
    });

    return program;
  }

  /**
   * Validate program data - broken down into smaller methods
   */
  protected validateData(data: Partial<IProgram>): ValidationResult {
    const errors: string[] = [];

    // Validate basic fields
    this.validateBasicFields(data, errors);
    
    // Validate numeric fields
    this.validateNumericFields(data, errors);
    
    // Validate array fields
    this.validateArrayFields(data, errors);
    
    // Validate target exercises
    this.validateTargetExercises(data, errors);

    return {
      valid: errors.length === 0,
      errors: errors.length > 0 ? errors : undefined
    };
  }

  /**
   * Validate basic string fields
   */
  private validateBasicFields(data: Partial<IProgram>, errors: string[]): void {
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
  }

  /**
   * Validate numeric fields
   */
  private validateNumericFields(data: Partial<IProgram>, errors: string[]): void {
    // Duration validation
    if (data.durationInWeeks !== undefined) {
      const durationValidation = ValidationHelpers.validateNumericRange(
        data.durationInWeeks, 
        'durationInWeeks', 
        1, 
        104 // 2 years max
      );
      if (!durationValidation.valid) {
        errors.push(...durationValidation.errors);
      }
    }
  }

  /**
   * Validate array fields
   */
  private validateArrayFields(data: Partial<IProgram>, errors: string[]): void {
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

    // Target metrics validation
    if (data.targetMetrics && typeof data.targetMetrics !== 'object') {
      errors.push('Target metrics must be an object');
    }
  }

  /**
   * Validate target exercises
   */
  private validateTargetExercises(data: Partial<IProgram>, errors: string[]): void {
    if (data.targetExercises) {
      if (!Array.isArray(data.targetExercises)) {
        errors.push('Target exercises must be an array');
      } else {
        data.targetExercises.forEach((exercise, index) => {
          if (!exercise.exerciseId) {
            errors.push(`Target exercise at index ${index} must have an exerciseId`);
          }
        });
      }
    }
  }

  /**
   * Map database document to domain entity
   */
  protected mapToEntity(data: any): IProgram {
    return {
      _id: data._id,
      name: data.name,
      description: data.description ?? '',
      durationInWeeks: data.durationInWeeks,
      goal: data.goal,
      subgoals: data.subgoals ?? [],
      targetExercises: data.targetExercises ?? [],
      targetMetrics: data.targetMetrics ?? {},
      tags: data.tags ?? [],
      mediaIds: data.mediaIds ?? [],
      isTemplate: data.isTemplate ?? false,
      subscribersCount: data.subscribersCount ?? 0,
      organization: data.organization,
      createdBy: data.createdBy,
      isArchived: data.isArchived ?? false,
      shared: data.shared ?? false,
      organizationVisibility: data.organizationVisibility,
      createdAt: data.createdAt,
      updatedAt: data.updatedAt
    } as IProgram;
  }

  /**
   * Map domain entity to database document
   */
  protected mapFromEntity(entity: IProgram): any {
    const doc = { ...entity };
    
    // Remove any computed fields
    delete (doc as any).__v;
    
    return doc;
  }
}
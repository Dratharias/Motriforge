import { Types } from 'mongoose';
import { Exercise } from '../entities/Exercise';
import {
  IExerciseRepository,
  IExerciseCreationData,
  IExerciseUpdateData,
  IExerciseSearchCriteria,
  IExerciseQueryOptions,
  IExerciseStatistics
} from '../interfaces/ExerciseInterfaces';
import {
  ExerciseType,
  Difficulty,
  MuscleZone,
} from '../../../types/fitness/enums/exercise';
import { ExerciseCreationService } from './ExerciseCreationService';
import { ExerciseUpdateService } from './ExerciseUpdateService';
import { ExerciseCloneService } from './ExerciseCloneService';
import { ExercisePublishingService } from './ExercisePublishingService';
import { ExerciseCompatibilityService } from './ExerciseCompatibilityService';
import { ExerciseValidatorFacade } from '../validation/ExerciseValidatorFacade';
import { PublishingEngine } from '../publishing/PublishingEngine';
import { PublishingContext } from '../publishing/IPublishingRule';

export class ExerciseServiceFacade {
  private readonly creationService: ExerciseCreationService;
  private readonly updateService: ExerciseUpdateService;
  private readonly cloneService: ExerciseCloneService;
  private readonly publishingService: ExercisePublishingService;
  private readonly compatibilityService: ExerciseCompatibilityService;

  constructor(
    private readonly exerciseRepository: IExerciseRepository,
    validator?: ExerciseValidatorFacade,
    publishingEngine?: PublishingEngine
  ) {
    const exerciseValidator = validator ?? new ExerciseValidatorFacade();
    const exercisePublishingEngine = publishingEngine ?? new PublishingEngine();

    this.creationService = new ExerciseCreationService(exerciseRepository, exerciseValidator);
    this.updateService = new ExerciseUpdateService(exerciseRepository, exerciseValidator);
    this.cloneService = new ExerciseCloneService(exerciseRepository);
    this.publishingService = new ExercisePublishingService(
      exerciseRepository,
      exerciseValidator,
      exercisePublishingEngine
    );
    this.compatibilityService = new ExerciseCompatibilityService(exerciseRepository);
  }

  // Creation methods
  async createExercise(data: IExerciseCreationData, createdBy: Types.ObjectId): Promise<Exercise> {
    return await this.creationService.createExercise(data, createdBy);
  }

  async bulkCreateExercises(
    exercisesData: readonly IExerciseCreationData[],
    createdBy: Types.ObjectId
  ): Promise<readonly Exercise[]> {
    return await this.creationService.bulkCreateExercises(exercisesData, createdBy);
  }

  async createTemplate(name: string, type: string, createdBy: Types.ObjectId): Promise<Exercise> {
    return await this.creationService.createTemplate(name, type, createdBy);
  }

  // Update methods
  async updateExercise(id: Types.ObjectId, updates: IExerciseUpdateData): Promise<Exercise | null> {
    return await this.updateService.updateExercise(id, updates);
  }

  async bulkUpdateExercises(
    updates: ReadonlyArray<{ id: Types.ObjectId; updates: IExerciseUpdateData }>
  ): Promise<readonly Exercise[]> {
    return await this.updateService.bulkUpdateExercises(updates);
  }

  async archiveExercise(id: Types.ObjectId): Promise<boolean> {
    return await this.updateService.archiveExercise(id);
  }

  async restoreExercise(id: Types.ObjectId): Promise<boolean> {
    return await this.updateService.restoreExercise(id);
  }

  async deleteExercise(id: Types.ObjectId): Promise<boolean> {
    return await this.updateService.deleteExercise(id);
  }

  // Clone methods
  async cloneExercise(
    sourceId: Types.ObjectId,
    createdBy: Types.ObjectId,
    modifications?: Partial<IExerciseCreationData>
  ): Promise<Exercise> {
    return await this.cloneService.cloneExercise(sourceId, createdBy, modifications);
  }

  async cloneAsTemplate(
    sourceId: Types.ObjectId,
    templateName: string,
    createdBy: Types.ObjectId
  ): Promise<Exercise> {
    return await this.cloneService.cloneAsTemplate(sourceId, templateName, createdBy);
  }

  async cloneAsVariation(
    sourceId: Types.ObjectId,
    variationName: string,
    createdBy: Types.ObjectId,
    modifications?: any
  ): Promise<Exercise> {
    return await this.cloneService.cloneAsVariation(sourceId, variationName, createdBy, modifications);
  }

  // Publishing methods
  async publishExercise(id: Types.ObjectId, context?: PublishingContext): Promise<Exercise | null> {
    return await this.publishingService.publishExercise(id, context);
  }

  async getPublicationReadiness(id: Types.ObjectId) {
    return await this.publishingService.getPublicationReadiness(id);
  }

  async submitForReview(id: Types.ObjectId, submittedBy: Types.ObjectId, notes?: string) {
    return await this.publishingService.submitForReview(id, submittedBy, notes);
  }

  async approveExercise(id: Types.ObjectId, approvedBy: Types.ObjectId, approverRole: string): Promise<Exercise | null> {
    return await this.publishingService.approveExercise(id, approvedBy, approverRole);
  }

  // Compatibility methods
  async getExercisesForUser(userProfile: any, options?: IExerciseQueryOptions): Promise<readonly Exercise[]> {
    return await this.compatibilityService.getExercisesForUser(userProfile, options);
  }

  async validateExerciseSafety(exerciseId: Types.ObjectId, medicalConditions?: readonly string[]) {
    return await this.compatibilityService.validateExerciseSafety(exerciseId, medicalConditions);
  }

  async findAlternativeExercises(
    originalExerciseId: Types.ObjectId,
    userConditions: readonly string[],
    limit = 5
  ): Promise<readonly Exercise[]> {
    return await this.compatibilityService.findAlternativeExercises(originalExerciseId, userConditions, limit);
  }

  // Query methods
  async getExerciseById(id: Types.ObjectId, options?: IExerciseQueryOptions): Promise<Exercise | null> {
    return await this.exerciseRepository.findById(id, options);
  }

  async searchExercises(
    criteria: IExerciseSearchCriteria,
    options?: IExerciseQueryOptions
  ): Promise<readonly Exercise[]> {
    return await this.exerciseRepository.findByCriteria(criteria, options);
  }

  async getExercisesByType(type: ExerciseType, options?: IExerciseQueryOptions): Promise<readonly Exercise[]> {
    return await this.exerciseRepository.findByType(type, options);
  }

  async getExercisesByDifficulty(difficulty: Difficulty, options?: IExerciseQueryOptions): Promise<readonly Exercise[]> {
    return await this.exerciseRepository.findByDifficulty(difficulty, options);
  }

  async getExercisesByMuscleGroup(muscle: MuscleZone, options?: IExerciseQueryOptions): Promise<readonly Exercise[]> {
    return await this.exerciseRepository.findByMuscleGroup(muscle, options);
  }

  async getPopularExercises(limit = 10, timeframe: 'week' | 'month' | 'year' = 'month'): Promise<readonly Exercise[]> {
    return await this.exerciseRepository.findPopular(limit, timeframe);
  }

  async getRecentExercises(limit = 10, daysBack = 30): Promise<readonly Exercise[]> {
    return await this.exerciseRepository.findRecent(limit, daysBack);
  }

  async getSimilarExercises(exerciseId: Types.ObjectId, limit = 5): Promise<readonly Exercise[]> {
    return await this.exerciseRepository.findSimilar(exerciseId, limit);
  }

  async getExerciseStatistics(): Promise<IExerciseStatistics> {
    return await this.exerciseRepository.getStatistics();
  }

  async getExercisesNeedingReview(): Promise<readonly Exercise[]> {
    return await this.publishingService.getExercisesNeedingReview();
  }

  async getBodyweightExercises(options?: IExerciseQueryOptions): Promise<readonly Exercise[]> {
    return await this.exerciseRepository.findBodyweightExercises(options);
  }

  async getExercisesWithMedia(options?: IExerciseQueryOptions): Promise<readonly Exercise[]> {
    return await this.exerciseRepository.findWithMedia(options);
  }
}
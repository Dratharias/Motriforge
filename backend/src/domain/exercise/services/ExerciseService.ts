import { Types } from 'mongoose';
import { Exercise } from '../entities/Exercise';
import { ExerciseValidator } from '../validation/ExerciseValidator';
import { ExercisePublisher } from '../publishing/ExercisePublisher';
import { ExerciseManagementService, ExerciseCreationData, ExerciseUpdateData } from './ExerciseManagementService';
import { ExerciseAnalysisService, AlternativesOptions } from './ExerciseAnalysisService';
import { ExerciseWorkflowService } from './ExerciseWorkflowService';
import {
  IUserPerformance,
  IRecommendationCriteria,
  IRecommendationResult,
  IPrerequisiteReadiness,
  PrerequisiteAssessment,
  IExerciseRepository
} from '../interfaces/ExerciseInterfaces';

export class ExerciseService {
  private readonly managementService: ExerciseManagementService;
  private readonly analysisService: ExerciseAnalysisService;
  private readonly workflowService: ExerciseWorkflowService;

  constructor(
    private readonly repository: IExerciseRepository,
    validator?: ExerciseValidator,
    publisher?: ExercisePublisher
  ) {
    const exerciseValidator = validator ?? new ExerciseValidator();
    const exercisePublisher = publisher ?? new ExercisePublisher(exerciseValidator);

    this.managementService = new ExerciseManagementService(repository, exerciseValidator);
    this.analysisService = new ExerciseAnalysisService(repository);
    this.workflowService = new ExerciseWorkflowService(repository, exerciseValidator, exercisePublisher);
  }

  // Management Methods
  async createExercise(data: ExerciseCreationData, createdBy: Types.ObjectId): Promise<Exercise> {
    return await this.managementService.createExercise(data, createdBy);
  }

  async updateExercise(id: Types.ObjectId, updates: ExerciseUpdateData): Promise<Exercise | null> {
    return await this.managementService.updateExercise(id, updates);
  }

  async cloneExercise(sourceId: Types.ObjectId, createdBy: Types.ObjectId, modifications?: Partial<ExerciseCreationData>): Promise<Exercise> {
    return await this.managementService.cloneExercise(sourceId, createdBy, modifications);
  }

  async deleteExercise(id: Types.ObjectId): Promise<boolean> {
    return await this.managementService.deleteExercise(id);
  }

  async archiveExercise(id: Types.ObjectId): Promise<boolean> {
    return await this.managementService.archiveExercise(id);
  }

  // Analysis Methods
  async findAlternatives(originalId: Types.ObjectId, options?: AlternativesOptions, limit = 5) {
    return await this.analysisService.findAlternatives(originalId, options, limit);
  }

  assessDifficulty(exercise: Exercise) {
    return this.analysisService.assessDifficulty(exercise);
  }

  calculateProgressionPath(exercise: Exercise, currentDifficulty: any, targetDifficulty: any) {
    return this.analysisService.calculateProgressionPath(exercise, currentDifficulty, targetDifficulty);
  }

  // New Prerequisite-based Methods
  async getRecommendedExercises(
    userPerformances: readonly IUserPerformance[],
    criteria: IRecommendationCriteria,
    options?: { limit?: number; offset?: number }
  ): Promise<IRecommendationResult> {
    return await this.analysisService.getRecommendedExercises(userPerformances, criteria, options);
  }

  async evaluatePrerequisiteReadiness(
    exerciseId: Types.ObjectId,
    userPerformances: readonly IUserPerformance[]
  ): Promise<IPrerequisiteReadiness> {
    const exercise = await this.repository.findById(exerciseId);
    if (!exercise) {
      throw new Error('Exercise not found');
    }
    return this.analysisService.evaluatePrerequisiteReadiness(exercise, userPerformances);
  }

  async assessPrerequisiteFulfillment(
    exerciseId: Types.ObjectId,
    userPerformances: readonly IUserPerformance[]
  ): Promise<PrerequisiteAssessment> {
    const exercise = await this.repository.findById(exerciseId);
    if (!exercise) {
      throw new Error('Exercise not found');
    }
    
    // Use the private method from analysis service by creating a simple assessment
    if (!exercise.hasPrerequisites()) {
      return {
        isMet: true,
        score: 100,
        confidence: 100,
        dataQuality: 'excellent',
        freshness: 'current'
      };
    }

    const overallReadiness = exercise.getPrerequisiteReadiness(userPerformances);
    const isMet = exercise.isRecommendedFor(userPerformances);

    // Calculate average confidence from user performances
    const averageConfidence = userPerformances.length > 0 ? 
      userPerformances.reduce((sum, perf) => {
        const daysSince = perf.lastPerformed ? 
          Math.floor((Date.now() - perf.lastPerformed.getTime()) / (1000 * 60 * 60 * 24)) : 30;
        return sum + Math.max(50, 100 - daysSince * 2);
      }, 0) / userPerformances.length : 50;

      const dataQuality = userPerformances.length >= 3 ? 'fair' : 'poor'

    return {
      isMet,
      score: Math.round(overallReadiness),
      confidence: Math.round(averageConfidence),
      dataQuality: userPerformances.length >= 5 ? 'good' : dataQuality,
      freshness: userPerformances.some(p => p.lastPerformed && 
        (Date.now() - p.lastPerformed.getTime()) < 7 * 24 * 60 * 60 * 1000) ? 'current' : 'recent'
    };
  }

  // Workflow Methods
  async publishExercise(id: Types.ObjectId, context?: any): Promise<Exercise | null> {
    return await this.workflowService.publishExercise(id, context);
  }

  async getPublicationReadiness(id: Types.ObjectId) {
    return await this.workflowService.getPublicationReadiness(id);
  }

  async submitForReview(id: Types.ObjectId, submittedBy: Types.ObjectId, notes?: string) {
    return await this.workflowService.submitForReview(id, submittedBy, notes);
  }

  async validateExerciseSafety(exerciseId: Types.ObjectId, medicalConditions?: readonly string[]) {
    return await this.workflowService.validateExerciseSafety(exerciseId, medicalConditions);
  }

  async getExercisesForUser(userProfile: any, options?: any): Promise<readonly Exercise[]> {
    return await this.workflowService.getExercisesForUser(userProfile, options);
  }

  // Query Methods
  async getExerciseById(id: Types.ObjectId, options?: any): Promise<Exercise | null> {
    return await this.repository.findById(id, options);
  }

  async searchExercises(criteria: any, options?: any): Promise<readonly Exercise[]> {
    return await this.repository.findByCriteria(criteria, options);
  }

  async getPopularExercises(limit = 10, timeframe: 'week' | 'month' | 'year' = 'month'): Promise<readonly Exercise[]> {
    return await this.repository.findPopular(limit, timeframe);
  }

  async getSimilarExercises(exerciseId: Types.ObjectId, limit = 5): Promise<readonly Exercise[]> {
    return await this.repository.findSimilar(exerciseId, limit);
  }

  async getExerciseStatistics() {
    return await this.repository.getStatistics();
  }
}
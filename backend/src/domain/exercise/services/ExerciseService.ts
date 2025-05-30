import { Types } from 'mongoose';
import { Exercise } from '../entities/Exercise';
import { IExerciseRepository } from '../interfaces/ExerciseInterfaces';
import { ExerciseValidator } from '../validation/ExerciseValidator';
import { ExercisePublisher } from '../publishing/ExercisePublisher';
import { ExerciseManagementService, ExerciseCreationData, ExerciseUpdateData } from './ExerciseManagementService';
import { ExerciseAnalysisService, AlternativesOptions } from './ExerciseAnalysisService';
import { ExerciseWorkflowService } from './ExerciseWorkflowService';

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

  // ========== MANAGEMENT OPERATIONS ==========
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

  // ========== ANALYSIS OPERATIONS ==========
  async findAlternatives(originalId: Types.ObjectId, options?: AlternativesOptions, limit = 5) {
    return await this.analysisService.findAlternatives(originalId, options, limit);
  }

  assessDifficulty(exercise: Exercise) {
    return this.analysisService.assessDifficulty(exercise);
  }

  calculateProgressionPath(exercise: Exercise, currentDifficulty: any, targetDifficulty: any) {
    return this.analysisService.calculateProgressionPath(exercise, currentDifficulty, targetDifficulty);
  }

  // ========== WORKFLOW OPERATIONS ==========
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

  // ========== QUERY OPERATIONS ==========
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
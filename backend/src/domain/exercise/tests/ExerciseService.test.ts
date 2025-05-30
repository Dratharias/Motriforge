import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Types } from 'mongoose';
import { ExerciseService } from '../services/ExerciseService';
import { Exercise } from '../entities/Exercise';
import {
  IExerciseRepository,
  IExerciseStatistics
} from '../interfaces/ExerciseInterfaces';
import {
  ExerciseType,
  Difficulty,
  MuscleZone,
  EquipmentCategory
} from '../../../types/fitness/enums/exercise';

type MockedRepository = {
  [K in keyof IExerciseRepository]: ReturnType<typeof vi.fn>;
};

describe('ExerciseService Integration', () => {
  let exerciseService: ExerciseService;
  let mockRepository: MockedRepository;
  let createdBy: Types.ObjectId;

  beforeEach(() => {
    createdBy = new Types.ObjectId();
    
    mockRepository = {
      findById: vi.fn(),
      findByCriteria: vi.fn(),
      findByType: vi.fn(),
      findByDifficulty: vi.fn(),
      findByMuscleGroup: vi.fn(),
      findByMuscleGroups: vi.fn(),
      findByEquipment: vi.fn(),
      findByCreator: vi.fn(),
      findPublished: vi.fn(),
      findDrafts: vi.fn(),
      findSafeForConditions: vi.fn(),
      findVariations: vi.fn(),
      findPrerequisites: vi.fn(),
      searchByText: vi.fn(),
      findByTags: vi.fn(),
      findByDuration: vi.fn(),
      findBodyweightExercises: vi.fn(),
      findWithMedia: vi.fn(),
      findWithProgressions: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      archive: vi.fn(),
      restore: vi.fn(),
      delete: vi.fn(),
      count: vi.fn(),
      getStatistics: vi.fn(),
      isNameAvailable: vi.fn(),
      findSimilar: vi.fn(),
      findPopular: vi.fn(),
      findRecent: vi.fn(),
      findNeedingReview: vi.fn(),
      bulkCreate: vi.fn(),
      bulkUpdate: vi.fn(),
      bulkArchive: vi.fn(),
      findByComplexity: vi.fn(),
      findByEquipmentList: vi.fn(),
      findByPrimaryMuscles: vi.fn(),
      findBySecondaryMuscles: vi.fn(),
      getExercisesByType: vi.fn(),
      getExercisesByDifficulty: vi.fn(),
      getExercisesByMuscleGroup: vi.fn(),
      getAverageDurationByType: vi.fn(),
      getAverageCaloriesByType: vi.fn(),
      validateExerciseData: vi.fn(),
      checkPrerequisiteChain: vi.fn(),
      findCircularPrerequisites: vi.fn()
    };

    exerciseService = new ExerciseService(mockRepository as any);
  });

  describe('Exercise Creation', () => {
    it('should create exercise successfully', async () => {
      const exerciseData = {
        name: 'Test Exercise',
        description: 'A test exercise for unit testing',
        type: ExerciseType.STRENGTH,
        difficulty: Difficulty.BEGINNER_I,
        primaryMuscles: [MuscleZone.CHEST],
        secondaryMuscles: [MuscleZone.TRICEPS],
        equipment: [EquipmentCategory.BODYWEIGHT],
        tags: ['test'],
        estimatedDuration: 10,
        caloriesBurnedPerMinute: 4,
        isDraft: true
      };

      const mockExercise = new Exercise({
        id: new Types.ObjectId(),
        ...exerciseData,
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy,
        isActive: true
      } as any);

      mockRepository.isNameAvailable.mockResolvedValue(true);
      mockRepository.create.mockResolvedValue(mockExercise);

      const result = await exerciseService.createExercise(exerciseData, createdBy);

      expect(result).toBeDefined();
      expect(mockRepository.isNameAvailable).toHaveBeenCalledWith('Test Exercise');
      expect(mockRepository.create).toHaveBeenCalled();
    });

    it('should reject creation with duplicate name', async () => {
      const exerciseData = {
        name: 'Duplicate Exercise',
        description: 'This name already exists',
        type: ExerciseType.STRENGTH,
        difficulty: Difficulty.BEGINNER_I,
        primaryMuscles: [MuscleZone.CHEST]
      };

      mockRepository.isNameAvailable.mockResolvedValue(false);

      await expect(exerciseService.createExercise(exerciseData, createdBy))
        .rejects.toThrow('Exercise name is already taken');
    });
  });

  describe('Exercise Updates', () => {
    let existingExercise: Exercise;

    beforeEach(() => {
      existingExercise = new Exercise({
        id: new Types.ObjectId(),
        name: 'Existing Exercise',
        description: 'An existing exercise for testing updates',
        type: ExerciseType.STRENGTH,
        difficulty: Difficulty.BEGINNER_I,
        primaryMuscles: [MuscleZone.CHEST],
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy,
        isActive: true,
        isDraft: true
      } as any);
    });

    it('should update exercise successfully', async () => {
      const updates = {
        name: 'Updated Exercise Name',
        description: 'Updated description with more details',
        difficulty: Difficulty.BEGINNER_II
      };

      const updatedExercise = new Exercise({
        ...existingExercise,
        ...updates,
        updatedAt: new Date()
      } as any);

      mockRepository.findById.mockResolvedValue(existingExercise);
      mockRepository.isNameAvailable.mockResolvedValue(true);
      mockRepository.update.mockResolvedValue(updatedExercise);

      const result = await exerciseService.updateExercise(existingExercise.id, updates);

      expect(result?.name).toBe('Updated Exercise Name');
      expect(mockRepository.isNameAvailable).toHaveBeenCalledWith('Updated Exercise Name', existingExercise.id);
    });

    it('should archive exercise', async () => {
      mockRepository.findById.mockResolvedValue(existingExercise);
      mockRepository.archive.mockResolvedValue(true);

      const result = await exerciseService.archiveExercise(existingExercise.id);

      expect(result).toBe(true);
      expect(mockRepository.archive).toHaveBeenCalledWith(existingExercise.id);
    });
  });

  describe('Exercise Analysis', () => {
    it('should find alternatives', async () => {
      const originalExercise = new Exercise({
        id: new Types.ObjectId(),
        name: 'Original Exercise',
        type: ExerciseType.STRENGTH,
        primaryMuscles: [MuscleZone.CHEST],
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy,
        isActive: true
      } as any);

      const alternatives = [
        new Exercise({
          id: new Types.ObjectId(),
          name: 'Alternative Exercise',
          type: ExerciseType.STRENGTH,
          primaryMuscles: [MuscleZone.CHEST],
          contraindications: [],
          createdAt: new Date(),
          updatedAt: new Date(),
          createdBy,
          isActive: true
        } as any)
      ];

      mockRepository.findById.mockResolvedValue(originalExercise);
      mockRepository.findByMuscleGroup.mockResolvedValue(alternatives);

      const result = await exerciseService.findAlternatives(originalExercise.id, {
        excludedEquipment: [EquipmentCategory.FREE_WEIGHTS]
      });

      expect(result.alternatives).toHaveLength(1);
      expect(result.reasonForEach).toHaveLength(1);
      expect(result.similarityScores).toHaveLength(1);
    });

    it('should assess difficulty', () => {
      const exercise = new Exercise({
        id: new Types.ObjectId(),
        name: 'Test Exercise',
        type: ExerciseType.STRENGTH,
        difficulty: Difficulty.INTERMEDIATE_I,
        primaryMuscles: [MuscleZone.CHEST],
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy,
        isActive: true
      } as any);

      const assessment = exerciseService.assessDifficulty(exercise);

      expect(assessment.overallScore).toBeGreaterThan(0);
      expect(assessment.suggestedDifficulty).toBeDefined();
      expect(assessment.reasoning.length).toBeGreaterThan(0);
    });
  });

  describe('Exercise Queries', () => {
    it('should search exercises by criteria', async () => {
      const searchCriteria = {
        type: ExerciseType.STRENGTH,
        difficulty: Difficulty.BEGINNER_I,
        primaryMuscles: [MuscleZone.CHEST]
      };

      const mockExercises = [
        new Exercise({
          id: new Types.ObjectId(),
          name: 'Search Result',
          type: ExerciseType.STRENGTH,
          difficulty: Difficulty.BEGINNER_I,
          primaryMuscles: [MuscleZone.CHEST],
          estimatedDuration: 20,
          createdAt: new Date(),
          updatedAt: new Date(),
          createdBy,
          isActive: true
        } as any)
      ];

      mockRepository.findByCriteria.mockResolvedValue(mockExercises);

      const result = await exerciseService.searchExercises(searchCriteria);

      expect(result).toHaveLength(1);
      expect(mockRepository.findByCriteria).toHaveBeenCalledWith(searchCriteria, undefined);
    });

    it('should get exercise statistics', async () => {
      const mockStats: IExerciseStatistics = {
        totalExercises: 100,
        publishedExercises: 80,
        draftExercises: 20,
        exercisesByType: {} as any,
        exercisesByDifficulty: {} as any,
        exercisesByMuscleGroup: {} as any,
        averageDuration: 15,
        averageCaloriesBurn: 5,
        exercisesWithMedia: 50,
        exercisesWithProgressions: 30,
        exercisesWithContraindications: 10
      };

      mockRepository.getStatistics.mockResolvedValue(mockStats);

      const result = await exerciseService.getExerciseStatistics();

      expect(result.totalExercises).toBe(100);
      expect(result.publishedExercises).toBe(80);
    });
  });
});
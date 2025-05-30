import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Types } from 'mongoose';
import { ExerciseServiceFacade } from '../services/ExerciseServiceFacade';
import { Exercise } from '../entities/Exercise';
import {
  IExerciseRepository,
  IExerciseCreationData,
  IExerciseUpdateData
} from '../interfaces/ExerciseInterfaces';
import {
  ExerciseType,
  Difficulty,
  MuscleZone,
  EquipmentCategory
} from '../../../types/fitness/enums/exercise';

// Create a proper mock type for vitest
type MockedRepository = {
  [K in keyof IExerciseRepository]: ReturnType<typeof vi.fn>;
};

describe('ExerciseServiceFacade Integration', () => {
  let serviceFacade: ExerciseServiceFacade;
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

    serviceFacade = new ExerciseServiceFacade(mockRepository as any);
  });

  describe('Exercise Creation', () => {
    it('should create exercise successfully', async () => {
      const exerciseData: IExerciseCreationData = {
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

      const result = await serviceFacade.createExercise(exerciseData, createdBy);

      expect(result).toBeDefined();
      expect(mockRepository.isNameAvailable).toHaveBeenCalledWith('Test Exercise');
      expect(mockRepository.create).toHaveBeenCalled();
    });

    it('should reject creation with duplicate name', async () => {
      const exerciseData: IExerciseCreationData = {
        name: 'Duplicate Exercise',
        description: 'This name already exists',
        type: ExerciseType.STRENGTH,
        difficulty: Difficulty.BEGINNER_I,
        primaryMuscles: [MuscleZone.CHEST]
      };

      mockRepository.isNameAvailable.mockResolvedValue(false);

      await expect(serviceFacade.createExercise(exerciseData, createdBy))
        .rejects.toThrow('Exercise name is already taken');
    });

    it('should create exercise template', async () => {
      const mockTemplate = new Exercise({
        id: new Types.ObjectId(),
        name: 'Push-ups (Template)',
        description: 'Template for Push-ups exercise',
        type: ExerciseType.STRENGTH,
        difficulty: Difficulty.BEGINNER_I,
        primaryMuscles: [MuscleZone.CORE],
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy,
        isActive: true,
        isDraft: true
      } as any);

      mockRepository.isNameAvailable.mockResolvedValue(true);
      mockRepository.create.mockResolvedValue(mockTemplate);

      const result = await serviceFacade.createTemplate('Push-ups', 'STRENGTH', createdBy);

      expect(result.name).toContain('Template');
      expect(result.isDraft).toBe(true);
    });

    it('should bulk create exercises', async () => {
      const exercisesData: IExerciseCreationData[] = [
        {
          name: 'Exercise 1',
          description: 'First test exercise',
          type: ExerciseType.STRENGTH,
          difficulty: Difficulty.BEGINNER_I,
          primaryMuscles: [MuscleZone.CHEST]
        },
        {
          name: 'Exercise 2',
          description: 'Second test exercise',
          type: ExerciseType.CARDIO,
          difficulty: Difficulty.INTERMEDIATE_I,
          primaryMuscles: [MuscleZone.CORE]
        }
      ];

      const mockExercises = exercisesData.map(data => new Exercise({
        id: new Types.ObjectId(),
        ...data,
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy,
        isActive: true,
        isDraft: true
      } as any));

      mockRepository.bulkCreate.mockResolvedValue(mockExercises);

      const result = await serviceFacade.bulkCreateExercises(exercisesData, createdBy);

      expect(result).toHaveLength(2);
      expect(mockRepository.bulkCreate).toHaveBeenCalled();
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
      const updates: IExerciseUpdateData = {
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

      const result = await serviceFacade.updateExercise(existingExercise.id, updates);

      expect(result?.name).toBe('Updated Exercise Name');
      expect(mockRepository.isNameAvailable).toHaveBeenCalledWith('Updated Exercise Name', existingExercise.id);
    });

    it('should archive exercise', async () => {
      mockRepository.findById.mockResolvedValue(existingExercise);
      mockRepository.archive.mockResolvedValue(true);

      const result = await serviceFacade.archiveExercise(existingExercise.id);

      expect(result).toBe(true);
      expect(mockRepository.archive).toHaveBeenCalledWith(existingExercise.id);
    });

    it('should restore archived exercise', async () => {
      mockRepository.restore.mockResolvedValue(true);

      const result = await serviceFacade.restoreExercise(existingExercise.id);

      expect(result).toBe(true);
      expect(mockRepository.restore).toHaveBeenCalledWith(existingExercise.id);
    });
  });

  describe('Exercise Cloning', () => {
    let sourceExercise: Exercise;

    beforeEach(() => {
      sourceExercise = new Exercise({
        id: new Types.ObjectId(),
        name: 'Source Exercise',
        description: 'Original exercise to be cloned',
        type: ExerciseType.STRENGTH,
        difficulty: Difficulty.INTERMEDIATE_I,
        primaryMuscles: [MuscleZone.CHEST, MuscleZone.TRICEPS],
        equipment: [EquipmentCategory.FREE_WEIGHTS],
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy,
        isActive: true,
        isDraft: false
      } as any);
    });

    it('should clone exercise with modifications', async () => {
      const modifications = {
        name: 'Modified Clone',
        difficulty: Difficulty.BEGINNER_I
      };

      const clonedExercise = new Exercise({
        ...sourceExercise,
        ...modifications,
        id: new Types.ObjectId(),
        isDraft: true,
        createdAt: new Date(),
        updatedAt: new Date()
      } as any);

      mockRepository.findById.mockResolvedValue(sourceExercise);
      mockRepository.isNameAvailable.mockResolvedValue(true);
      mockRepository.create.mockResolvedValue(clonedExercise);

      const result = await serviceFacade.cloneExercise(sourceExercise.id, createdBy, modifications);

      expect(result.name).toBe('Modified Clone');
      expect(result.difficulty).toBe(Difficulty.BEGINNER_I);
      expect(result.isDraft).toBe(true);
    });

    it('should clone as template', async () => {
      const template = new Exercise({
        id: new Types.ObjectId(),
        name: 'Template Exercise',
        description: 'Template based on Source Exercise',
        type: sourceExercise.type,
        difficulty: sourceExercise.difficulty,
        primaryMuscles: sourceExercise.primaryMuscles,
        instructions: [],
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy,
        isActive: true,
        isDraft: true
      } as any);

      mockRepository.findById.mockResolvedValue(sourceExercise);
      mockRepository.create.mockResolvedValue(template);

      const result = await serviceFacade.cloneAsTemplate(sourceExercise.id, 'Template Exercise', createdBy);

      expect(result.name).toBe('Template Exercise');
      expect(result.instructions).toHaveLength(0);
      expect(result.isDraft).toBe(true);
    });

    it('should clone as variation', async () => {
      const variation = new Exercise({
        id: new Types.ObjectId(),
        name: 'Variation Exercise',
        description: 'Variation of Source Exercise: modified version',
        type: sourceExercise.type,
        difficulty: Difficulty.BEGINNER_II,
        primaryMuscles: [MuscleZone.CHEST],
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy,
        isActive: true,
        isDraft: true
      } as any);

      mockRepository.findById
        .mockResolvedValueOnce(sourceExercise)
        .mockResolvedValueOnce(sourceExercise);
      mockRepository.create.mockResolvedValue(variation);
      mockRepository.update.mockResolvedValue(sourceExercise);

      const result = await serviceFacade.cloneAsVariation(
        sourceExercise.id,
        'Variation Exercise',
        createdBy,
        { difficulty: Difficulty.BEGINNER_II }
      );

      expect(result.name).toBe('Variation Exercise');
      expect(result.difficulty).toBe(Difficulty.BEGINNER_II);
    });
  });

  describe('Exercise Publishing', () => {
    let publishableExercise: Exercise;

    beforeEach(() => {
      publishableExercise = new Exercise({
        id: new Types.ObjectId(),
        name: 'Publishable Exercise',
        description: 'An exercise ready for publication',
        type: ExerciseType.STRENGTH,
        difficulty: Difficulty.BEGINNER_I,
        primaryMuscles: [MuscleZone.CHEST],
        instructions: [],
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy,
        isActive: true,
        isDraft: true
      } as any);
    });

    it('should get publication readiness assessment', async () => {
      mockRepository.findById.mockResolvedValue(publishableExercise);

      const readiness = await serviceFacade.getPublicationReadiness(publishableExercise.id);

      expect(readiness.isReady).toBeDefined();
      expect(readiness.validationScore).toBeGreaterThanOrEqual(0);
      expect(readiness.publicationScore).toBeGreaterThanOrEqual(0);
    });

    it('should submit exercise for review', async () => {
      mockRepository.findById.mockResolvedValue(publishableExercise);

      const reviewResult = await serviceFacade.submitForReview(
        publishableExercise.id,
        createdBy,
        'Please review this exercise'
      );

      expect(reviewResult.submitted).toBe(true);
      expect(reviewResult.requiredApprovers).toBeDefined();
      expect(reviewResult.estimatedReviewTime).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Exercise Compatibility', () => {
    it('should find exercises for user profile', async () => {
      const userProfile = {
        fitnessLevel: Difficulty.BEGINNER_II,
        availableEquipment: [EquipmentCategory.BODYWEIGHT],
        preferredMuscles: [MuscleZone.CHEST, MuscleZone.CORE],
        timeAvailable: 30
      };

      const mockExercises = [
        new Exercise({
          id: new Types.ObjectId(),
          name: 'Suitable Exercise',
          description: 'Perfect for user profile',
          type: ExerciseType.STRENGTH,
          difficulty: Difficulty.BEGINNER_I,
          primaryMuscles: [MuscleZone.CHEST],
          equipment: [EquipmentCategory.BODYWEIGHT],
          estimatedDuration: 20,
          createdAt: new Date(),
          updatedAt: new Date(),
          createdBy,
          isActive: true
        } as any)
      ];

      mockRepository.findPublished.mockResolvedValue(mockExercises);

      const result = await serviceFacade.getExercisesForUser(userProfile);

      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('Suitable Exercise');
    });

    it('should validate exercise safety for user', async () => {
      const exercise = new Exercise({
        id: new Types.ObjectId(),
        name: 'Safety Test Exercise',
        type: ExerciseType.STRENGTH,
        difficulty: Difficulty.INTERMEDIATE_I,
        primaryMuscles: [MuscleZone.BACK],
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy,
        isActive: true
      } as any);

      mockRepository.findById.mockResolvedValue(exercise);

      const safetyResult = await serviceFacade.validateExerciseSafety(
        exercise.id,
        ['back pain', 'arthritis']
      );

      expect(safetyResult.isSafe).toBeDefined();
      expect(safetyResult.warnings).toBeDefined();
      expect(safetyResult.recommendations).toBeDefined();
    });

    it('should find alternative exercises', async () => {
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

      const result = await serviceFacade.findAlternativeExercises(
        originalExercise.id,
        ['shoulder injury'],
        5
      );

      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('Alternative Exercise');
    });
  });

  describe('Exercise Queries', () => {
    it('should search exercises by criteria', async () => {
      const searchCriteria = {
        type: ExerciseType.STRENGTH,
        difficulty: Difficulty.BEGINNER_I,
        primaryMuscles: [MuscleZone.CHEST],
        durationMax: 30
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

      const result = await serviceFacade.searchExercises(searchCriteria);

      expect(result).toHaveLength(1);
      expect(mockRepository.findByCriteria).toHaveBeenCalledWith(searchCriteria, undefined);
    });

    it('should get popular exercises', async () => {
      const popularExercises = [
        new Exercise({
          id: new Types.ObjectId(),
          name: 'Popular Exercise',
          createdAt: new Date(),
          updatedAt: new Date(),
          createdBy,
          isActive: true
        } as any)
      ];

      mockRepository.findPopular.mockResolvedValue(popularExercises);

      const result = await serviceFacade.getPopularExercises(10, 'month');

      expect(result).toHaveLength(1);
      expect(mockRepository.findPopular).toHaveBeenCalledWith(10, 'month');
    });

    it('should get exercise statistics', async () => {
      const mockStats = {
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

      const result = await serviceFacade.getExerciseStatistics();

      expect(result.totalExercises).toBe(100);
      expect(result.publishedExercises).toBe(80);
    });
  });
});
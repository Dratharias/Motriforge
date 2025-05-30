import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Types } from 'mongoose';
import { ExerciseAnalysisService } from '../services/ExerciseAnalysisService';
import { Exercise } from '../entities/Exercise';
import {
  IExerciseRepository,
  IUserPerformance,
  IRecommendationCriteria,
  IExercisePrerequisite,
  PrerequisiteCategory
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

describe('ExerciseAnalysisService with Prerequisites', () => {
  let analysisService: ExerciseAnalysisService;
  let mockRepository: MockedRepository;
  let testExercise: Exercise;
  let userPerformances: IUserPerformance[];
  let createdBy: Types.ObjectId;

  beforeEach(() => {
    createdBy = new Types.ObjectId();
    const now = new Date();

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
      findWithPrerequisites: vi.fn(),
      findAccessibleTo: vi.fn(),
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

    analysisService = new ExerciseAnalysisService(mockRepository as any);

    // Create test exercise with prerequisites
    const prerequisite: IExercisePrerequisite = {
      id: new Types.ObjectId(),
      exerciseId: new Types.ObjectId(),
      exerciseName: 'Regular Push-ups',
      category: PrerequisiteCategory.REPS,
      minRecommended: 20,
      description: 'Complete 20 consecutive push-ups',
      isRequired: false
    };

    testExercise = new Exercise({
      id: new Types.ObjectId(),
      name: 'Advanced Push-ups',
      description: 'Advanced push-up variation',
      type: ExerciseType.STRENGTH,
      difficulty: Difficulty.INTERMEDIATE_I,
      primaryMuscles: [MuscleZone.CHEST, MuscleZone.TRICEPS],
      secondaryMuscles: [MuscleZone.CORE],
      equipment: [EquipmentCategory.BODYWEIGHT],
      prerequisites: [prerequisite],
      estimatedDuration: 15,
      createdAt: now,
      updatedAt: now,
      createdBy,
      isActive: true,
      isDraft: false,
      publishedAt: now
    });

    userPerformances = [
      {
        exerciseId: prerequisite.exerciseId,
        bestReps: 15,
        bestSets: 3,
        bestDuration: 60,
        bestHoldTime: 30,
        formQuality: 8,
        totalSessions: 5,
        lastPerformed: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000), // 5 days ago
        averageRating: 4.2
      }
    ];
  });

  describe('Difficulty Assessment with Prerequisites', () => {
    it('should include prerequisite complexity in difficulty assessment', () => {
      const assessment = analysisService.assessDifficulty(testExercise);
      
      expect(assessment.overallScore).toBeGreaterThan(0);
      expect(assessment.suggestedDifficulty).toBeDefined();
      expect(assessment.reasoning).toContain('Significant prerequisite requirements increase complexity');
    });

    it('should assess exercises without prerequisites', () => {
      const simpleExercise = new Exercise({
        id: new Types.ObjectId(),
        name: 'Simple Exercise',
        description: 'Basic exercise',
        type: ExerciseType.STRENGTH,
        difficulty: Difficulty.BEGINNER_I,
        primaryMuscles: [MuscleZone.CHEST],
        prerequisites: [],
        estimatedDuration: 10,
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy,
        isActive: true,
        isDraft: false
      });

      const assessment = analysisService.assessDifficulty(simpleExercise);
      expect(assessment.reasoning).not.toContain('prerequisite');
    });
  });

  describe('Recommended Exercises', () => {
    it('should get recommended exercises based on user performance', async () => {
      const criteria: IRecommendationCriteria = {
        fitnessLevel: Difficulty.INTERMEDIATE_I,
        availableTime: 20,
        preferredMuscles: [MuscleZone.CHEST],
        prerequisiteMode: 'recommended'
      };

      mockRepository.findPublished.mockResolvedValue([testExercise]);

      const result = await analysisService.getRecommendedExercises(userPerformances, criteria);

      expect(result.recommended).toBeDefined();
      expect(result.nearlyReady).toBeDefined();
      expect(result.futureGoals).toBeDefined();
      expect(result.scores).toBeDefined();
      expect(result.reasons).toBeDefined();
      expect(result.prerequisiteGaps).toBeDefined();
    });

    it('should filter exercises by strict prerequisite mode', async () => {
      const criteria: IRecommendationCriteria = {
        prerequisiteMode: 'strict',
        readinessThreshold: 90
      };

      mockRepository.findPublished.mockResolvedValue([testExercise]);

      const result = await analysisService.getRecommendedExercises(userPerformances, criteria);

      expect(mockRepository.findPublished).toHaveBeenCalled();
      expect(Array.isArray(result.recommended)).toBe(true);
    });

    it('should generate progression suggestions', async () => {
      const criteria: IRecommendationCriteria = {
        prerequisiteMode: 'recommended'
      };

      mockRepository.findPublished.mockResolvedValue([testExercise]);

      const result = await analysisService.getRecommendedExercises(userPerformances, criteria);

      expect(result.progressionSuggestions).toBeDefined();
      expect(Array.isArray(result.progressionSuggestions)).toBe(true);
    });
  });

  describe('Prerequisite Readiness Evaluation', () => {
    it('should evaluate exercise with prerequisites', () => {
      const readiness = analysisService.evaluatePrerequisiteReadiness(testExercise, userPerformances);

      expect(readiness.exerciseId).toEqual(testExercise.id);
      expect(readiness.overallReadiness).toBeGreaterThanOrEqual(0);
      expect(readiness.overallReadiness).toBeLessThanOrEqual(100);
      expect(readiness.categoryReadiness).toBeDefined();
      expect(readiness.readyPrerequisites).toBeDefined();
      expect(readiness.nearlyReadyPrerequisites).toBeDefined();
      expect(readiness.missingPrerequisites).toBeDefined();
      expect(readiness.improvementPlan).toBeDefined();
    });

    it('should handle exercises without prerequisites', () => {
      const simpleExercise = new Exercise({
        id: new Types.ObjectId(),
        name: 'Simple Exercise',
        description: 'Basic exercise',
        type: ExerciseType.STRENGTH,
        difficulty: Difficulty.BEGINNER_I,
        primaryMuscles: [MuscleZone.CHEST],
        prerequisites: [],
        estimatedDuration: 10,
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy,
        isActive: true,
        isDraft: false
      });

      const readiness = analysisService.evaluatePrerequisiteReadiness(simpleExercise, userPerformances);

      expect(readiness.overallReadiness).toBe(100);
      expect(readiness.readyPrerequisites).toHaveLength(0);
      expect(readiness.missingPrerequisites).toHaveLength(0);
      expect(readiness.improvementPlan).toHaveLength(0);
    });

    it('should categorize prerequisites by readiness level', () => {
      // Create a performance that meets some but not all requirements
      const partialPerformances: IUserPerformance[] = [
        {
          exerciseId: testExercise.prerequisites[0].exerciseId,
          bestReps: 25, // Exceeds requirement of 20
          formQuality: 9,
          totalSessions: 10,
          lastPerformed: new Date()
        }
      ];

      const readiness = analysisService.evaluatePrerequisiteReadiness(testExercise, partialPerformances);

      expect(readiness.categoryReadiness[PrerequisiteCategory.REPS]).toBeGreaterThan(0);
      expect(readiness.readyPrerequisites.length + readiness.nearlyReadyPrerequisites.length + readiness.missingPrerequisites.length).toBeGreaterThanOrEqual(0);
    });

    it('should generate improvement plan for missing prerequisites', () => {
      const readiness = analysisService.evaluatePrerequisiteReadiness(testExercise, userPerformances);

      if (readiness.improvementPlan.length > 0) {
        const plan = readiness.improvementPlan[0];
        expect(plan.category).toBeDefined();
        expect(plan.targetExercises).toBeDefined();
        expect(plan.estimatedDays).toBeGreaterThan(0);
        expect(plan.priority).toBeGreaterThan(0);
      }
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle empty user performance data', async () => {
      const criteria: IRecommendationCriteria = {
        prerequisiteMode: 'recommended'
      };

      mockRepository.findPublished.mockResolvedValue([testExercise]);

      const result = await analysisService.getRecommendedExercises([], criteria);

      expect(result.recommended).toBeDefined();
      expect(result.futureGoals.length).toBeGreaterThanOrEqual(0);
    });

    it('should handle exercises with no published exercises', async () => {
      const criteria: IRecommendationCriteria = {
        prerequisiteMode: 'recommended'
      };

      mockRepository.findPublished.mockResolvedValue([]);

      const result = await analysisService.getRecommendedExercises(userPerformances, criteria);

      expect(result.recommended).toHaveLength(0);
      expect(result.nearlyReady).toHaveLength(0);
      expect(result.futureGoals).toHaveLength(0);
    });

    it('should handle multiple prerequisite categories', () => {
      const multiPrereqExercise = new Exercise({
        id: new Types.ObjectId(),
        name: 'Multi-Prerequisite Exercise',
        description: 'Exercise with multiple prerequisites',
        type: ExerciseType.STRENGTH,
        difficulty: Difficulty.ADVANCED_I,
        primaryMuscles: [MuscleZone.CHEST],
        prerequisites: [
          {
            id: new Types.ObjectId(),
            exerciseId: new Types.ObjectId(),
            category: PrerequisiteCategory.REPS,
            minRecommended: 20
          },
          {
            id: new Types.ObjectId(),
            exerciseId: new Types.ObjectId(),
            category: PrerequisiteCategory.HOLD_TIME,
            minRecommended: 30
          },
          {
            id: new Types.ObjectId(),
            exerciseId: new Types.ObjectId(),
            category: PrerequisiteCategory.FORM,
            minRecommended: 8
          }
        ],
        estimatedDuration: 20,
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy,
        isActive: true,
        isDraft: false
      });

      const readiness = analysisService.evaluatePrerequisiteReadiness(multiPrereqExercise, userPerformances);

      expect(readiness.categoryReadiness[PrerequisiteCategory.REPS]).toBeDefined();
      expect(readiness.categoryReadiness[PrerequisiteCategory.HOLD_TIME]).toBeDefined();
      expect(readiness.categoryReadiness[PrerequisiteCategory.FORM]).toBeDefined();
    });

    it('should calculate realistic readiness days', async () => {
      const criteria: IRecommendationCriteria = {
        prerequisiteMode: 'recommended'
      };

      mockRepository.findPublished.mockResolvedValue([testExercise]);

      const result = await analysisService.getRecommendedExercises(userPerformances, criteria);

      result.estimatedReadinessDays.forEach(days => {
        expect(days).toBeGreaterThanOrEqual(0);
        expect(days).toBeLessThanOrEqual(180); // Should be capped at 6 months
      });
    });
  });
});
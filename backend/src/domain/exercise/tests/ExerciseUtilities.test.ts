import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Types } from 'mongoose';
import { ExerciseBuilder } from '../utils/ExerciseBuilder';
import { ProgressionCalculator } from '../utils/ProgressionCalculator';
import { DifficultyAssessor } from '../utils/DifficultyAssessor';
import { AlternativesFinder } from '../utils/AlternativesFinder';
import { Exercise } from '../entities/Exercise';
import { ExerciseProgression } from '../entities/ExerciseProgression';
import {
  ExerciseType,
  Difficulty,
  MuscleZone,
  EquipmentCategory
} from '../../../types/fitness/enums/exercise';
import { MediaType } from '../../../types/fitness/enums/media';
import { ContraindicationType, ContraindicationSeverity } from '../interfaces/ExerciseInterfaces';

describe('Exercise Utilities', () => {
  let createdBy: Types.ObjectId;

  beforeEach(() => {
    createdBy = new Types.ObjectId();
  });

  describe('ExerciseBuilder', () => {
    it('should build basic exercise', () => {
      const exercise = new ExerciseBuilder('Test Exercise', createdBy)
        .withDescription('A test exercise for builder pattern')
        .withType(ExerciseType.STRENGTH)
        .withDifficulty(Difficulty.BEGINNER_I)
        .withPrimaryMuscles(MuscleZone.CHEST, MuscleZone.TRICEPS)
        .withSecondaryMuscles(MuscleZone.SHOULDER)
        .withDuration(15)
        .withCaloriesBurn(5)
        .build();

      expect(exercise.name).toBe('Test Exercise');
      expect(exercise.type).toBe(ExerciseType.STRENGTH);
      expect(exercise.primaryMuscles).toContain(MuscleZone.CHEST);
      expect(exercise.primaryMuscles).toContain(MuscleZone.TRICEPS);
      expect(exercise.estimatedDuration).toBe(15);
      expect(exercise.caloriesBurnedPerMinute).toBe(5);
    });

    it('should build exercise with instructions', () => {
      const exercise = new ExerciseBuilder('Instruction Exercise', createdBy)
        .withDescription('Exercise with detailed instructions')
        .withPrimaryMuscles(MuscleZone.CORE)
        .addInstruction(1, 'Setup', 'Get into starting position')
        .addInstruction(2, 'Execute', 'Perform the movement', {
          duration: 30,
          tips: ['Keep core tight', 'Breathe steadily']
        })
        .addWarmupInstruction('Light cardio for 5 minutes', 5)
        .build();

      expect(exercise.instructions).toHaveLength(3);
      expect(exercise.instructions[0].title).toBe('Setup');
      expect(exercise.instructions[1].tips).toContain('Keep core tight');
    });

    it('should build exercise with progressions', () => {
      const exercise = new ExerciseBuilder('Progressive Exercise', createdBy)
        .withDescription('Exercise with progression path')
        .withDifficulty(Difficulty.BEGINNER_I)
        .withPrimaryMuscles(MuscleZone.CHEST)
        .addProgression(
          Difficulty.BEGINNER_I,
          Difficulty.BEGINNER_II,
          'Increase Reps',
          'Add more repetitions',
          ['Complete 10 reps with good form'],
          ['Increase to 15 reps']
        )
        .addDifficultyProgression(Difficulty.INTERMEDIATE_I, ['Add weight', 'Increase sets'])
        .build();

      expect(exercise.progressions).toHaveLength(2);
      expect(exercise.progressions[0].title).toBe('Increase Reps');
      expect(exercise.progressions[1].toDifficulty).toBe(Difficulty.INTERMEDIATE_I);
    });

    it('should build exercise with contraindications', () => {
      const exercise = new ExerciseBuilder('Safety Exercise', createdBy)
        .withDescription('Exercise with safety considerations')
        .withPrimaryMuscles(MuscleZone.BACK)
        .addMedicalContraindication(['herniated disc', 'acute back pain'], 'May worsen back conditions')
        .addInjuryContraindication(['recent back surgery'], 'Wait for medical clearance')
        .build();

      expect(exercise.contraindications).toHaveLength(2);
      expect(exercise.contraindications[0].type).toBe(ContraindicationType.MEDICAL);
      expect(exercise.contraindications[1].severity).toBe(ContraindicationSeverity.ABSOLUTE);
    });

    it('should build exercise with media', () => {
      const exercise = new ExerciseBuilder('Media Exercise', createdBy)
        .withDescription('Exercise with media content')
        .withPrimaryMuscles(MuscleZone.CHEST)
        .withImage('https://example.com/demo.jpg')
        .withVideo('https://example.com/demo.mp4')
        .build();

      expect(exercise.mediaUrls).toContain('https://example.com/demo.jpg');
      expect(exercise.mediaUrls).toContain('https://example.com/demo.mp4');
      expect(exercise.mediaTypes).toContain(MediaType.IMAGE);
      expect(exercise.mediaTypes).toContain(MediaType.VIDEO);
    });

    it('should validate before building', () => {
      expect(() => {
        new ExerciseBuilder('', createdBy)
          .build();
      }).toThrow();

      expect(() => {
        new ExerciseBuilder('Valid Name', createdBy)
          .withDescription('')
          .build();
      }).toThrow();
    });

    it('should build draft even with validation errors', () => {
      const draft = new ExerciseBuilder('Draft Exercise', createdBy)
        .withDescription('Short')
        .buildDraft();

      expect(draft.isDraft).toBe(true);
      expect(draft.name).toBe('Draft Exercise');
    });

    it('should use preset builders', () => {
      const strengthExercise = ExerciseBuilder.beginnerStrengthExercise('Push-ups', createdBy)
        .withPrimaryMuscles(MuscleZone.CHEST)
        .build();

      expect(strengthExercise.type).toBe(ExerciseType.STRENGTH);
      expect(strengthExercise.difficulty).toBe(Difficulty.BEGINNER_I);
      expect(strengthExercise.tags).toContain('strength');

      const cardioExercise = ExerciseBuilder.cardioExercise('Running', createdBy)
        .withPrimaryMuscles(MuscleZone.CORE)
        .build();

      expect(cardioExercise.type).toBe(ExerciseType.CARDIO);
      expect(cardioExercise.caloriesBurnedPerMinute).toBe(8);

      const rehabExercise = ExerciseBuilder.rehabExercise('Shoulder Rehab', createdBy)
        .withPrimaryMuscles(MuscleZone.SHOULDER)
        .build();

      expect(rehabExercise.type).toBe(ExerciseType.REHABILITATION);
      expect(rehabExercise.contraindications.length).toBeGreaterThan(0);
    });
  });

  describe('ProgressionCalculator', () => {
    let exercise: Exercise;
    let progression: ExerciseProgression;

    beforeEach(() => {
      progression = new ExerciseProgression({
        id: new Types.ObjectId(),
        exerciseId: new Types.ObjectId(),
        fromDifficulty: Difficulty.BEGINNER_I,
        toDifficulty: Difficulty.BEGINNER_II,
        title: 'Test Progression',
        description: 'A test progression',
        criteria: ['Complete current level', 'Good form'],
        modifications: ['Increase reps', 'Add resistance'],
        estimatedTimeToAchieve: 14,
        order: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy,
        isActive: true
      });

      exercise = new Exercise({
        id: new Types.ObjectId(),
        name: 'Test Exercise',
        description: 'Exercise for progression testing',
        type: ExerciseType.STRENGTH,
        difficulty: Difficulty.BEGINNER_I,
        primaryMuscles: [MuscleZone.CHEST],
        progressions: [progression],
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy,
        isActive: true
      } as any);
    });

    it('should calculate progression path', () => {
      const path = ProgressionCalculator.calculateProgressionPath(
        exercise,
        Difficulty.BEGINNER_I,
        Difficulty.BEGINNER_II
      );

      expect(path.isValid).toBe(true);
      expect(path.path).toHaveLength(1);
      expect(path.totalEstimatedDays).toBe(14);
      expect(path.missingSteps).toHaveLength(0);
    });

    it('should calculate progression difficulty scores', () => {
      const scores = ProgressionCalculator.calculateProgressionDifficulty(progression);

      expect(scores.difficultyScore).toBeGreaterThan(0);
      expect(scores.safetyScore).toBeGreaterThan(0);
      expect(scores.timeScore).toBeGreaterThan(0);
      expect(scores.overallScore).toBeGreaterThan(0);
    });

    it('should suggest progression improvements', () => {
      const suggestions = ProgressionCalculator.suggestProgressionImprovements(exercise);

      expect(suggestions.missingProgressions).toBeDefined();
      expect(suggestions.improvementSuggestions).toBeDefined();
    });

    it('should calculate progression readiness', () => {
      const userPerformance = {
        completedReps: 12,
        targetReps: 10,
        formQuality: 8,
        consistencyDays: 7,
        targetConsistencyDays: 5,
        lastPerformanceDate: new Date()
      };

      const readiness = ProgressionCalculator.calculateProgressionReadiness(
        userPerformance,
        progression
      );

      expect(readiness.readinessPercentage).toBeGreaterThan(50);
      expect(readiness.isReady).toBe(true);
      expect(readiness.metCriteria.length).toBeGreaterThan(0);
    });
  });

  describe('DifficultyAssessor', () => {
    let exercise: Exercise;

    beforeEach(() => {
      exercise = new Exercise({
        id: new Types.ObjectId(),
        name: 'Difficulty Test Exercise',
        description: 'Exercise for difficulty assessment',
        type: ExerciseType.STRENGTH,
        difficulty: Difficulty.INTERMEDIATE_I,
        primaryMuscles: [MuscleZone.CHEST, MuscleZone.TRICEPS],
        secondaryMuscles: [MuscleZone.SHOULDER],
        equipment: [EquipmentCategory.FREE_WEIGHTS],
        instructions: [],
        contraindications: [],
        prerequisites: [],
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy,
        isActive: true
      } as any);
    });

    it('should assess exercise difficulty', () => {
      const assessment = DifficultyAssessor.assessDifficulty(exercise);

      expect(assessment.overallScore).toBeGreaterThan(0);
      expect(assessment.suggestedDifficulty).toBeDefined();
      expect(assessment.components.baseDifficulty).toBeGreaterThan(0);
      expect(assessment.reasoning.length).toBeGreaterThan(0);
    });

    it('should suggest difficulty adjustments', () => {
      const adjustments = DifficultyAssessor.suggestDifficultyAdjustments(
        exercise,
        Difficulty.ADVANCED_I
      );

      expect(adjustments.currentScore).toBeGreaterThan(0);
      expect(adjustments.targetScore).toBeGreaterThan(0);
      expect(adjustments.adjustments).toBeDefined();
      expect(adjustments.feasible).toBeDefined();
    });

    it('should compare exercise difficulties', () => {
      const easierExercise = new Exercise({
        ...exercise,
        id: new Types.ObjectId(),
        difficulty: Difficulty.BEGINNER_I,
        primaryMuscles: [MuscleZone.CHEST],
        equipment: [EquipmentCategory.BODYWEIGHT]
      } as any);

      const comparison = DifficultyAssessor.compareDifficulty(exercise, easierExercise);

      expect(comparison.comparison).toBe('harder');
      expect(comparison.scoreDifference).toBeGreaterThan(0);
      expect(comparison.significantDifferences.length).toBeGreaterThanOrEqual(0);
    });
  });

  describe('AlternativesFinder', () => {
    let mockRepository: any;
    let alternativesFinder: AlternativesFinder;
    let originalExercise: Exercise;

    beforeEach(() => {
      mockRepository = {
        findById: vi.fn(),
        findByMuscleGroup: vi.fn(),
        findByMuscleGroups: vi.fn(),
        findByDifficulty: vi.fn(),
        findBodyweightExercises: vi.fn(),
        findByDuration: vi.fn(),
        findByEquipmentList: vi.fn(),
        findSimilar: vi.fn()
      };

      alternativesFinder = new AlternativesFinder(mockRepository);

      originalExercise = new Exercise({
        id: new Types.ObjectId(),
        name: 'Original Exercise',
        description: 'Exercise to find alternatives for',
        type: ExerciseType.STRENGTH,
        difficulty: Difficulty.INTERMEDIATE_I,
        primaryMuscles: [MuscleZone.CHEST],
        equipment: [EquipmentCategory.FREE_WEIGHTS],
        estimatedDuration: 20,
        contraindications: [],
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy,
        isActive: true
      } as any);
    });

    it('should find alternatives for limitations', async () => {
      const limitations = {
        excludedEquipment: [EquipmentCategory.FREE_WEIGHTS],
        maxDifficulty: Difficulty.BEGINNER_II,
        availableTime: 15
      };

      const alternatives = [
        new Exercise({
          id: new Types.ObjectId(),
          name: 'Bodyweight Alternative',
          type: ExerciseType.STRENGTH,
          difficulty: Difficulty.BEGINNER_I,
          primaryMuscles: [MuscleZone.CHEST],
          equipment: [EquipmentCategory.BODYWEIGHT],
          estimatedDuration: 10,
          contraindications: [],
          createdAt: new Date(),
          updatedAt: new Date(),
          createdBy,
          isActive: true
        } as any)
      ];

      mockRepository.findById.mockResolvedValue(originalExercise);
      mockRepository.findByMuscleGroup.mockResolvedValue(alternatives);

      const result = await alternativesFinder.findAlternativesForLimitations(
        originalExercise.id,
        limitations,
        3
      );

      expect(result.alternatives).toHaveLength(1);
      expect(result.reasonForEach).toHaveLength(1);
      expect(result.similarityScores).toHaveLength(1);
    });

    it('should find easier alternatives', async () => {
      const alternatives = [
        new Exercise({
          id: new Types.ObjectId(),
          name: 'Easier Alternative',
          difficulty: Difficulty.BEGINNER_I,
          primaryMuscles: [MuscleZone.CHEST],
          createdAt: new Date(),
          updatedAt: new Date(),
          createdBy,
          isActive: true
        } as any)
      ];

      mockRepository.findById.mockResolvedValue(originalExercise);
      mockRepository.findByMuscleGroups.mockResolvedValue(alternatives);

      const result = await alternativesFinder.findEasierAlternatives(originalExercise.id);

      expect(result).toHaveLength(1);
      expect(result[0].difficulty).toBe(Difficulty.BEGINNER_I);
    });

    it('should find bodyweight alternatives', async () => {
      const bodyweightAlternatives = [
        new Exercise({
          id: new Types.ObjectId(),
          name: 'Bodyweight Version',
          primaryMuscles: [MuscleZone.CHEST],
          equipment: [EquipmentCategory.BODYWEIGHT],
          createdAt: new Date(),
          updatedAt: new Date(),
          createdBy,
          isActive: true
        } as any)
      ];

      mockRepository.findById.mockResolvedValue(originalExercise);
      mockRepository.findBodyweightExercises.mockResolvedValue(bodyweightAlternatives);

      const result = await alternativesFinder.findBodyweightAlternatives(originalExercise.id);

      expect(result).toHaveLength(1);
      expect(result[0].equipment).toContain(EquipmentCategory.BODYWEIGHT);
    });

    it('should find quick alternatives', async () => {
      const quickAlternatives = [
        new Exercise({
          id: new Types.ObjectId(),
          name: 'Quick Version',
          primaryMuscles: [MuscleZone.CHEST],
          estimatedDuration: 10,
          createdAt: new Date(),
          updatedAt: new Date(),
          createdBy,
          isActive: true
        } as any)
      ];

      mockRepository.findById.mockResolvedValue(originalExercise);
      mockRepository.findByDuration.mockResolvedValue(quickAlternatives);

      const result = await alternativesFinder.findQuickAlternatives(originalExercise.id, 15);

      expect(result).toHaveLength(1);
      expect(result[0].estimatedDuration).toBeLessThanOrEqual(15);
    });

    it('should find progressive alternatives', async () => {
      const progressiveAlternatives = [
        new Exercise({
          id: new Types.ObjectId(),
          name: 'Progressive Alternative',
          difficulty: Difficulty.ADVANCED_I,
          primaryMuscles: [MuscleZone.CHEST],
          createdAt: new Date(),
          updatedAt: new Date(),
          createdBy,
          isActive: true
        } as any)
      ];

      mockRepository.findById.mockResolvedValue(originalExercise);
      mockRepository.findByDifficulty.mockResolvedValue(progressiveAlternatives);

      const result = await alternativesFinder.findProgressiveAlternatives(
        originalExercise.id,
        'harder',
        1
      );

      expect(result).toHaveLength(1);
      expect(result[0].difficulty).toBe(Difficulty.ADVANCED_I);
    });
  });
});
import { describe, it, expect, beforeEach } from 'vitest';
import { Types } from 'mongoose';
import { Exercise } from '../entities/Exercise';
import { ExerciseInstruction } from '../entities/ExerciseInstruction';
import {
  ExerciseType,
  Difficulty,
  MuscleZone,
  EquipmentCategory
} from '../../../types/fitness/enums/exercise';
import {
  IExercisePrerequisite,
  IUserPerformance,
  IRecommendationCriteria,
  PrerequisiteCategory
} from '../interfaces/ExerciseInterfaces';

describe('Exercise Prerequisites System', () => {
  let baseExercise: Exercise;
  let prerequisiteExerciseId: Types.ObjectId;
  let userPerformance: IUserPerformance;
  let createdBy: Types.ObjectId;

  beforeEach(() => {
    createdBy = new Types.ObjectId();
    prerequisiteExerciseId = new Types.ObjectId();
    const now = new Date();

    baseExercise = new Exercise({
      id: new Types.ObjectId(),
      name: 'Advanced Push-ups',
      description: 'An advanced push-up variation requiring prerequisite exercises',
      type: ExerciseType.STRENGTH,
      difficulty: Difficulty.INTERMEDIATE_I,
      primaryMuscles: [MuscleZone.CHEST, MuscleZone.TRICEPS],
      secondaryMuscles: [MuscleZone.CORE],
      equipment: [EquipmentCategory.BODYWEIGHT],
      tags: ['bodyweight', 'upper-body'],
      estimatedDuration: 15,
      createdAt: now,
      updatedAt: now,
      createdBy,
      isActive: true,
      isDraft: false,
      publishedAt: now
    });

    userPerformance = {
      exerciseId: prerequisiteExerciseId,
      bestReps: 15,
      bestSets: 3,
      bestDuration: 60,
      bestWeight: 0,
      bestHoldTime: 30,
      consistentDays: 7,
      lastPerformed: now,
      formQuality: 8,
      averageRating: 4.2
    };
  });

  describe('Prerequisites Management', () => {
    it('should start with no prerequisites', () => {
      expect(baseExercise.hasPrerequisites()).toBe(false);
      expect(baseExercise.prerequisites).toHaveLength(0);
    });

    it('should add prerequisite successfully', () => {
      const prerequisite: IExercisePrerequisite = {
        id: new Types.ObjectId(),
        exerciseId: prerequisiteExerciseId,
        exerciseName: 'Regular Push-ups',
        category: PrerequisiteCategory.REPS,
        minRecommended: 20,
        description: 'Complete 20 consecutive push-ups with good form',
        isRequired: false
      };

      const updatedExercise = baseExercise.addPrerequisite(prerequisite);
      
      expect(updatedExercise.hasPrerequisites()).toBe(true);
      expect(updatedExercise.prerequisites).toHaveLength(1);
      expect(updatedExercise.prerequisites[0]).toBe(prerequisite);
    });

    it('should remove prerequisite successfully', () => {
      const prerequisite: IExercisePrerequisite = {
        id: new Types.ObjectId(),
        exerciseId: prerequisiteExerciseId,
        category: PrerequisiteCategory.REPS,
        minRecommended: 20
      };

      const withPrerequisite = baseExercise.addPrerequisite(prerequisite);
      const withoutPrerequisite = withPrerequisite.removePrerequisite(prerequisite.id);
      
      expect(withoutPrerequisite.hasPrerequisites()).toBe(false);
      expect(withoutPrerequisite.prerequisites).toHaveLength(0);
    });

    it('should handle multiple prerequisites', () => {
      const repsPrerequisite: IExercisePrerequisite = {
        id: new Types.ObjectId(),
        exerciseId: prerequisiteExerciseId,
        category: PrerequisiteCategory.REPS,
        minRecommended: 20
      };

      const holdPrerequisite: IExercisePrerequisite = {
        id: new Types.ObjectId(),
        exerciseId: new Types.ObjectId(),
        category: PrerequisiteCategory.HOLD_TIME,
        minRecommended: 60
      };

      const updatedExercise = baseExercise
        .addPrerequisite(repsPrerequisite)
        .addPrerequisite(holdPrerequisite);
      
      expect(updatedExercise.prerequisites).toHaveLength(2);
    });
  });

  describe('Prerequisite Evaluation', () => {
    it('should evaluate reps prerequisite correctly', () => {
      const prerequisite: IExercisePrerequisite = {
        id: new Types.ObjectId(),
        exerciseId: prerequisiteExerciseId,
        category: PrerequisiteCategory.REPS,
        minRecommended: 20
      };

      const exerciseWithPrereq = baseExercise.addPrerequisite(prerequisite);
      const statuses = exerciseWithPrereq.checkPrerequisites([userPerformance]);
      
      expect(statuses).toHaveLength(1);
      expect(statuses[0].isMet).toBe(false); // User has 15 reps, needs 20
      expect(statuses[0].progress).toBe(75); // 15/20 * 100 = 75%
      expect(statuses[0].missingRequirements).toContain('Need 5 more reps');
    });

    it('should evaluate hold time prerequisite correctly', () => {
      const prerequisite: IExercisePrerequisite = {
        id: new Types.ObjectId(),
        exerciseId: prerequisiteExerciseId,
        category: PrerequisiteCategory.HOLD_TIME,
        minRecommended: 25
      };

      const exerciseWithPrereq = baseExercise.addPrerequisite(prerequisite);
      const statuses = exerciseWithPrereq.checkPrerequisites([userPerformance]);
      
      expect(statuses[0].isMet).toBe(true); // User has 30 seconds, needs 25
      expect(statuses[0].progress).toBe(100);
      expect(statuses[0].missingRequirements).toHaveLength(0);
    });

    it('should evaluate form quality prerequisite correctly', () => {
      const prerequisite: IExercisePrerequisite = {
        id: new Types.ObjectId(),
        exerciseId: prerequisiteExerciseId,
        category: PrerequisiteCategory.FORM,
        minRecommended: 9
      };

      const exerciseWithPrereq = baseExercise.addPrerequisite(prerequisite);
      const statuses = exerciseWithPrereq.checkPrerequisites([userPerformance]);
      
      expect(statuses[0].isMet).toBe(false); // User has 8 form quality, needs 9
      expect(statuses[0].progress).toBe(88); // 8/9 * 100 ≈ 88%
    });

    it('should handle missing user performance data', () => {
      const prerequisite: IExercisePrerequisite = {
        id: new Types.ObjectId(),
        exerciseId: new Types.ObjectId(), // Different exercise ID
        category: PrerequisiteCategory.REPS,
        minRecommended: 20
      };

      const exerciseWithPrereq = baseExercise.addPrerequisite(prerequisite);
      const statuses = exerciseWithPrereq.checkPrerequisites([userPerformance]);
      
      expect(statuses[0].isMet).toBe(false);
      expect(statuses[0].progress).toBe(0);
      expect(statuses[0].missingRequirements).toContain('No performance data available');
    });
  });

  describe('Recommendation Logic', () => {
    it('should recommend exercise with no prerequisites', () => {
      expect(baseExercise.isRecommendedFor([userPerformance])).toBe(true);
    });

    it('should recommend when prerequisites are met', () => {
      const prerequisite: IExercisePrerequisite = {
        id: new Types.ObjectId(),
        exerciseId: prerequisiteExerciseId,
        category: PrerequisiteCategory.REPS,
        minRecommended: 10, // User has 15 reps
        isRequired: false
      };

      const exerciseWithPrereq = baseExercise.addPrerequisite(prerequisite);
      expect(exerciseWithPrereq.isRecommendedFor([userPerformance])).toBe(true);
    });

    it('should not recommend when required prerequisites are not met', () => {
      const prerequisite: IExercisePrerequisite = {
        id: new Types.ObjectId(),
        exerciseId: prerequisiteExerciseId,
        category: PrerequisiteCategory.REPS,
        minRecommended: 25, // User has only 15 reps
        isRequired: true
      };

      const exerciseWithPrereq = baseExercise.addPrerequisite(prerequisite);
      expect(exerciseWithPrereq.isRecommendedFor([userPerformance])).toBe(false);
    });

    it('should recommend when majority of optional prerequisites are met', () => {
      const prerequisite1: IExercisePrerequisite = {
        id: new Types.ObjectId(),
        exerciseId: prerequisiteExerciseId,
        category: PrerequisiteCategory.REPS,
        minRecommended: 10, // Met
        isRequired: false
      };

      const prerequisite2: IExercisePrerequisite = {
        id: new Types.ObjectId(),
        exerciseId: prerequisiteExerciseId,
        category: PrerequisiteCategory.HOLD_TIME,
        minRecommended: 20, // Met
        isRequired: false
      };

      const prerequisite3: IExercisePrerequisite = {
        id: new Types.ObjectId(),
        exerciseId: prerequisiteExerciseId,
        category: PrerequisiteCategory.FORM,
        minRecommended: 9, // Not met (user has 8)
        isRequired: false
      };

      const exerciseWithPrereqs = baseExercise
        .addPrerequisite(prerequisite1)
        .addPrerequisite(prerequisite2)
        .addPrerequisite(prerequisite3);
      
      // 2 out of 3 prerequisites met (66% > 60% threshold)
      expect(exerciseWithPrereqs.isRecommendedFor([userPerformance])).toBe(true);
    });
  });

  describe('Readiness Scoring', () => {
    it('should return 100% readiness for exercise with no prerequisites', () => {
      expect(baseExercise.getPrerequisiteReadiness([userPerformance])).toBe(100);
    });

    it('should calculate readiness based on prerequisite progress', () => {
      const prerequisite1: IExercisePrerequisite = {
        id: new Types.ObjectId(),
        exerciseId: prerequisiteExerciseId,
        category: PrerequisiteCategory.REPS,
        minRecommended: 20, // User has 15, so 75% progress
      };

      const prerequisite2: IExercisePrerequisite = {
        id: new Types.ObjectId(),
        exerciseId: prerequisiteExerciseId,
        category: PrerequisiteCategory.HOLD_TIME,
        minRecommended: 25, // User has 30, so 100% progress
      };

      const exerciseWithPrereqs = baseExercise
        .addPrerequisite(prerequisite1)
        .addPrerequisite(prerequisite2);
      
      const readiness = exerciseWithPrereqs.getPrerequisiteReadiness([userPerformance]);
      expect(readiness).toBe(88); // (75 + 100) / 2 = 87.5, rounded to 88
    });

    it('should calculate recommendation score incorporating readiness', () => {
      const prerequisite: IExercisePrerequisite = {
        id: new Types.ObjectId(),
        exerciseId: prerequisiteExerciseId,
        category: PrerequisiteCategory.REPS,
        minRecommended: 20,
        isRequired: false
      };

      const exerciseWithPrereq = baseExercise.addPrerequisite(prerequisite);
      const score = exerciseWithPrereq.getRecommendationScore([userPerformance]);
      
      expect(score).toBeGreaterThan(50); // Should be above base score
      expect(score).toBeLessThan(100); // But not perfect due to unmet prerequisite
    });

    it('should calculate recommendation score with criteria', () => {
      const criteria: IRecommendationCriteria = {
        fitnessLevel: Difficulty.INTERMEDIATE_I,
        availableTime: 20,
        preferredMuscles: [MuscleZone.CHEST],
        excludedEquipment: [EquipmentCategory.FREE_WEIGHTS]
      };

      const score = baseExercise.getRecommendationScore([userPerformance], criteria);
      
      expect(score).toBeGreaterThan(50);
      expect(typeof score).toBe('number');
    });
  });

  describe('User Access Control', () => {
    it('should always allow user attempts regardless of prerequisites', () => {
      const prerequisite: IExercisePrerequisite = {
        id: new Types.ObjectId(),
        exerciseId: prerequisiteExerciseId,
        category: PrerequisiteCategory.REPS,
        minRecommended: 100, // Very high requirement
        isRequired: true
      };

      const exerciseWithPrereq = baseExercise.addPrerequisite(prerequisite);
      
      // Users can always attempt exercises, prerequisites are only for recommendations
      expect(exerciseWithPrereq.canUserAttempt([userPerformance])).toBe(true);
    });
  });

  describe('Validation Integration', () => {
    it('should validate exercise with prerequisites for publication', () => {
      const instruction = new ExerciseInstruction({
        id: new Types.ObjectId(),
        exerciseId: baseExercise.id,
        stepNumber: 1,
        title: 'Setup',
        description: 'Get into starting position',
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy,
        isActive: true,
        isDraft: false
      });

      const prerequisite: IExercisePrerequisite = {
        id: new Types.ObjectId(),
        exerciseId: prerequisiteExerciseId,
        category: PrerequisiteCategory.REPS,
        minRecommended: 20
      };

      const completeExercise = baseExercise
        .addInstruction(instruction)
        .addPrerequisite(prerequisite);
      
      const validation = completeExercise.validateForPublication();
      expect(validation.isValid).toBe(true);
    });
  });

  describe('Complexity Scoring', () => {
    it('should increase complexity score with prerequisites', () => {
      const baseComplexity = baseExercise.getComplexityScore();
      
      const prerequisite: IExercisePrerequisite = {
        id: new Types.ObjectId(),
        exerciseId: prerequisiteExerciseId,
        category: PrerequisiteCategory.REPS,
        minRecommended: 20
      };

      const exerciseWithPrereq = baseExercise.addPrerequisite(prerequisite);
      const complexityWithPrereq = exerciseWithPrereq.getComplexityScore();
      
      expect(complexityWithPrereq).toBeGreaterThan(baseComplexity);
    });
  });

  describe('Edge Cases', () => {
    it('should handle all prerequisite categories', () => {
      const categories = [
        PrerequisiteCategory.REPS,
        PrerequisiteCategory.HOLD_TIME,
        PrerequisiteCategory.FORM,
        PrerequisiteCategory.DURATION,
        PrerequisiteCategory.WEIGHT,
        PrerequisiteCategory.CONSISTENCY
      ];

      categories.forEach((category) => {
        const prerequisite: IExercisePrerequisite = {
          id: new Types.ObjectId(),
          exerciseId: prerequisiteExerciseId,
          category,
          minRecommended: 10
        };

        const exerciseWithPrereq = baseExercise.addPrerequisite(prerequisite);
        const statuses = exerciseWithPrereq.checkPrerequisites([userPerformance]);
        
        expect(statuses).toHaveLength(1);
        expect(statuses[0].prerequisite.category).toBe(category);
      });
    });

    it('should handle empty user performance array', () => {
      const prerequisite: IExercisePrerequisite = {
        id: new Types.ObjectId(),
        exerciseId: prerequisiteExerciseId,
        category: PrerequisiteCategory.REPS,
        minRecommended: 20
      };

      const exerciseWithPrereq = baseExercise.addPrerequisite(prerequisite);
      
      expect(exerciseWithPrereq.isRecommendedFor([])).toBe(false);
      expect(exerciseWithPrereq.getPrerequisiteReadiness([])).toBe(0);
    });

    it('should estimate time to meet prerequisites', () => {
      const prerequisite: IExercisePrerequisite = {
        id: new Types.ObjectId(),
        exerciseId: prerequisiteExerciseId,
        category: PrerequisiteCategory.REPS,
        minRecommended: 25 // User needs 10 more reps
      };

      const exerciseWithPrereq = baseExercise.addPrerequisite(prerequisite);
      const statuses = exerciseWithPrereq.checkPrerequisites([userPerformance]);
      
      expect(statuses[0].estimatedTimeToMeet).toBeGreaterThan(0);
      expect(typeof statuses[0].estimatedTimeToMeet).toBe('number');
    });
  });
});
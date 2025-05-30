import { describe, it, expect, beforeEach } from 'vitest';
import { Types } from 'mongoose';
import { IExerciseVariant, IExerciseOrder, IExerciseProgression } from '../entities/ExerciseVariant';
import { ExerciseType, MuscleZone } from '../../../types/fitness/enums/exercise';

describe('Exercise Variants System', () => {
  let pushUpsVariant: IExerciseVariant;
  let exerciseOrder: IExerciseOrder;
  let exerciseProgression: IExerciseProgression;
  let createdBy: Types.ObjectId;

  beforeEach(() => {
    createdBy = new Types.ObjectId();
    const now = new Date();

    exerciseOrder = {
      exerciseId: new Types.ObjectId(),
      difficultyOrder: 3,
      verified: true,
      createdAt: now,
      createdBy
    };

    pushUpsVariant = {
      id: new Types.ObjectId(),
      category: 'push-ups',
      description: 'Progressive push-up variations targeting chest, triceps, and core',
      primaryMuscles: [MuscleZone.CHEST, MuscleZone.TRICEPS],
      exerciseType: ExerciseType.STRENGTH,
      exercises: [
        {
          exerciseId: new Types.ObjectId(),
          difficultyOrder: 1,
          verified: true,
          createdAt: now,
          createdBy
        },
        {
          exerciseId: new Types.ObjectId(),
          difficultyOrder: 2,
          verified: true,
          createdAt: now,
          createdBy
        },
        exerciseOrder,
        {
          exerciseId: new Types.ObjectId(),
          difficultyOrder: 4,
          verified: false,
          createdAt: now,
          createdBy
        }
      ],
      verified: true,
      createdAt: now,
      updatedAt: now,
      createdBy
    };

    exerciseProgression = {
      exerciseId: exerciseOrder.exerciseId,
      difficultyOrder: 3,
      regressions: [
        {
          exerciseId: new Types.ObjectId(),
          difficultyOrder: 1,
          verified: true,
          createdAt: now,
          createdBy
        },
        {
          exerciseId: new Types.ObjectId(),
          difficultyOrder: 2,
          verified: true,
          createdAt: now,
          createdBy
        }
      ],
      progressions: [
        {
          exerciseId: new Types.ObjectId(),
          difficultyOrder: 4,
          verified: true,
          createdAt: now,
          createdBy
        },
        {
          exerciseId: new Types.ObjectId(),
          difficultyOrder: 5,
          verified: false,
          createdAt: now,
          createdBy
        }
      ],
      alternatives: [
        new Types.ObjectId(),
        new Types.ObjectId()
      ],
      lastUpdated: now
    };
  });

  describe('Exercise Variant Structure', () => {
    it('should have proper variant structure', () => {
      expect(pushUpsVariant.id).toBeDefined();
      expect(pushUpsVariant.category).toBe('push-ups');
      expect(pushUpsVariant.exerciseType).toBe(ExerciseType.STRENGTH);
      expect(pushUpsVariant.primaryMuscles).toContain(MuscleZone.CHEST);
      expect(pushUpsVariant.primaryMuscles).toContain(MuscleZone.TRICEPS);
      expect(pushUpsVariant.exercises).toHaveLength(4);
      expect(pushUpsVariant.verified).toBe(true);
    });

    it('should maintain exercise ordering', () => {
      const exercises = pushUpsVariant.exercises;
      const sortedExercises = [...exercises].sort((a, b) => a.difficultyOrder - b.difficultyOrder);
      
      expect(sortedExercises[0].difficultyOrder).toBe(1);
      expect(sortedExercises[1].difficultyOrder).toBe(2);
      expect(sortedExercises[2].difficultyOrder).toBe(3);
      expect(sortedExercises[3].difficultyOrder).toBe(4);
    });

    it('should track verification status', () => {
      const verifiedExercises = pushUpsVariant.exercises.filter(e => e.verified);
      const unverifiedExercises = pushUpsVariant.exercises.filter(e => !e.verified);

      expect(verifiedExercises).toHaveLength(3);
      expect(unverifiedExercises).toHaveLength(1);
      expect(unverifiedExercises[0].difficultyOrder).toBe(4);
    });

    it('should have valid metadata', () => {
      expect(pushUpsVariant.description).toBeTruthy();
      expect(pushUpsVariant.description.length).toBeGreaterThan(10);
      expect(pushUpsVariant.createdAt).toBeInstanceOf(Date);
      expect(pushUpsVariant.updatedAt).toBeInstanceOf(Date);
      expect(pushUpsVariant.createdBy).toBeInstanceOf(Types.ObjectId);
    });

    it('should enforce muscle group consistency', () => {
      expect(pushUpsVariant.primaryMuscles.length).toBeGreaterThan(0);
      expect(pushUpsVariant.primaryMuscles.length).toBeLessThanOrEqual(3);
      
      // All muscle groups should be valid
      const validMuscles = Object.values(MuscleZone);
      pushUpsVariant.primaryMuscles.forEach(muscle => {
        expect(validMuscles).toContain(muscle);
      });
    });
  });

  describe('Exercise Order Structure', () => {
    it('should have proper order structure', () => {
      expect(exerciseOrder.exerciseId).toBeDefined();
      expect(exerciseOrder.difficultyOrder).toBe(3);
      expect(exerciseOrder.verified).toBe(true);
      expect(exerciseOrder.createdAt).toBeDefined();
      expect(exerciseOrder.createdBy).toBe(createdBy);
    });

    it('should reference a valid exercise', () => {
      expect(exerciseOrder.exerciseId).toBeInstanceOf(Types.ObjectId);
    });

    it('should have valid difficulty order', () => {
      expect(exerciseOrder.difficultyOrder).toBeGreaterThan(0);
      expect(exerciseOrder.difficultyOrder).toBeLessThanOrEqual(10);
      expect(Number.isInteger(exerciseOrder.difficultyOrder)).toBe(true);
    });

    it('should track verification properly', () => {
      expect(typeof exerciseOrder.verified).toBe('boolean');
    });
  });

  describe('Exercise Progression Structure', () => {
    it('should have proper progression structure', () => {
      expect(exerciseProgression.exerciseId).toBeDefined();
      expect(exerciseProgression.difficultyOrder).toBe(3);
      expect(exerciseProgression.regressions).toHaveLength(2);
      expect(exerciseProgression.progressions).toHaveLength(2);
      expect(exerciseProgression.alternatives).toHaveLength(2);
      expect(exerciseProgression.lastUpdated).toBeDefined();
    });

    it('should maintain regression order', () => {
      const regressions = exerciseProgression.regressions;
      
      expect(regressions[0].difficultyOrder).toBe(1);
      expect(regressions[1].difficultyOrder).toBe(2);
      
      regressions.forEach(regression => {
        expect(regression.difficultyOrder).toBeLessThan(exerciseProgression.difficultyOrder);
      });
    });

    it('should maintain progression order', () => {
      const progressions = exerciseProgression.progressions;
      
      expect(progressions[0].difficultyOrder).toBe(4);
      expect(progressions[1].difficultyOrder).toBe(5);
      
      progressions.forEach(progression => {
        expect(progression.difficultyOrder).toBeGreaterThan(exerciseProgression.difficultyOrder);
      });
    });

    it('should reference alternative exercises', () => {
      expect(exerciseProgression.alternatives).toHaveLength(2);
      exerciseProgression.alternatives.forEach(alternative => {
        expect(alternative).toBeInstanceOf(Types.ObjectId);
      });
    });

    it('should have proper progression path structure', () => {
      // Ensure regressions are in ascending order
      const regressionOrders = exerciseProgression.regressions.map(r => r.difficultyOrder);
      const sortedRegressions = [...regressionOrders].sort((a, b) => a - b);
      expect(regressionOrders).toEqual(sortedRegressions);

      // Ensure progressions are in ascending order
      const progressionOrders = exerciseProgression.progressions.map(p => p.difficultyOrder);
      const sortedProgressions = [...progressionOrders].sort((a, b) => a - b);
      expect(progressionOrders).toEqual(sortedProgressions);
    });
  });

  describe('Variant Validation Logic', () => {
    it('should validate variant category naming', () => {
      expect(pushUpsVariant.category).toMatch(/^[a-z-]+$/);
      expect(pushUpsVariant.category.length).toBeGreaterThan(2);
    });

    it('should ensure muscle groups align with exercise type', () => {
      if (pushUpsVariant.exerciseType === ExerciseType.STRENGTH) {
        expect(pushUpsVariant.primaryMuscles.length).toBeGreaterThan(0);
      }
    });

    it('should maintain logical difficulty progression', () => {
      const exercises = [...pushUpsVariant.exercises].sort((a, b) => a.difficultyOrder - b.difficultyOrder);
      
      for (let i = 0; i < exercises.length - 1; i++) {
        expect(exercises[i + 1].difficultyOrder).toBeGreaterThan(exercises[i].difficultyOrder);
      }
    });

    it('should validate unique difficulty orders', () => {
      const difficultyOrders = pushUpsVariant.exercises.map(e => e.difficultyOrder);
      const uniqueOrders = new Set(difficultyOrders);
      
      expect(uniqueOrders.size).toBe(difficultyOrders.length);
    });

    it('should validate exercise type consistency', () => {
      const validTypes = Object.values(ExerciseType);
      expect(validTypes).toContain(pushUpsVariant.exerciseType);
    });
  });

  describe('Future Implementation Scenarios', () => {
    it('should support variant categorization', () => {
      const categories = ['push-ups', 'upper-body', 'chest-focused'];
      expect(categories).toContain(pushUpsVariant.category);
    });

    it('should support difficulty range queries', () => {
      const minDifficulty = 2;
      const maxDifficulty = 4;
      
      const exercisesInRange = pushUpsVariant.exercises.filter(e =>
        e.difficultyOrder >= minDifficulty && e.difficultyOrder <= maxDifficulty
      );
      
      expect(exercisesInRange).toHaveLength(3);
    });

    it('should support progression path generation', () => {
      const startOrder = 1;
      const targetOrder = 4;
      
      const pathExercises = pushUpsVariant.exercises.filter(e =>
        e.difficultyOrder >= startOrder && e.difficultyOrder <= targetOrder
      );
      
      expect(pathExercises).toHaveLength(4);
    });

    it('should support variant comparison', () => {
      const anotherVariant: Partial<IExerciseVariant> = {
        category: 'bench-press',
        primaryMuscles: [MuscleZone.CHEST, MuscleZone.TRICEPS],
        exerciseType: ExerciseType.STRENGTH
      };

      const commonMuscles = pushUpsVariant.primaryMuscles.filter(muscle =>
        anotherVariant.primaryMuscles?.includes(muscle)
      );

      expect(commonMuscles).toHaveLength(2);
      expect(pushUpsVariant.exerciseType).toBe(anotherVariant.exerciseType);
    });

    it('should support verified exercise filtering', () => {
      const verifiedExercises = pushUpsVariant.exercises.filter(e => e.verified);
      const unverifiedExercises = pushUpsVariant.exercises.filter(e => !e.verified);

      expect(verifiedExercises.length + unverifiedExercises.length).toBe(pushUpsVariant.exercises.length);
      expect(verifiedExercises.length).toBeGreaterThan(0);
    });

    it('should support progression navigation', () => {
      const currentOrder = exerciseProgression.difficultyOrder;
      
      // Find next progression
      const nextProgression = exerciseProgression.progressions
        .find(p => p.difficultyOrder === currentOrder + 1);
      expect(nextProgression).toBeDefined();
      expect(nextProgression?.difficultyOrder).toBe(4);

      // Find previous regression
      const previousRegression = exerciseProgression.regressions
        .find(r => r.difficultyOrder === currentOrder - 1);
      expect(previousRegression).toBeDefined();
      expect(previousRegression?.difficultyOrder).toBe(2);
    });
  });

  describe('Data Integrity', () => {
    it('should maintain referential integrity', () => {
      const allReferencedIds = [
        exerciseProgression.exerciseId,
        ...exerciseProgression.regressions.map(r => r.exerciseId),
        ...exerciseProgression.progressions.map(p => p.exerciseId),
        ...exerciseProgression.alternatives
      ];

      allReferencedIds.forEach(id => {
        expect(id).toBeInstanceOf(Types.ObjectId);
      });
    });

    it('should track creation metadata', () => {
      expect(pushUpsVariant.createdAt).toBeInstanceOf(Date);
      expect(pushUpsVariant.updatedAt).toBeInstanceOf(Date);
      expect(pushUpsVariant.createdBy).toBeInstanceOf(Types.ObjectId);

      pushUpsVariant.exercises.forEach(exercise => {
        expect(exercise.createdAt).toBeInstanceOf(Date);
        expect(exercise.createdBy).toBeInstanceOf(Types.ObjectId);
      });
    });

    it('should enforce data consistency', () => {
      // Variant should have at least one exercise
      expect(pushUpsVariant.exercises.length).toBeGreaterThan(0);

      // All exercises should have positive difficulty order
      pushUpsVariant.exercises.forEach(exercise => {
        expect(exercise.difficultyOrder).toBeGreaterThan(0);
      });

      // Progression should reference the same exercise
      expect(exerciseProgression.exerciseId).toEqual(exerciseOrder.exerciseId);
    });

    it('should validate timestamps', () => {
      expect(pushUpsVariant.createdAt.getTime()).toBeLessThanOrEqual(pushUpsVariant.updatedAt.getTime());
      expect(exerciseProgression.lastUpdated).toBeInstanceOf(Date);

      // All exercise orders should have valid timestamps
      pushUpsVariant.exercises.forEach(exercise => {
        expect(exercise.createdAt).toBeInstanceOf(Date);
        expect(exercise.createdAt.getTime()).toBeLessThanOrEqual(Date.now());
      });
    });

    it('should validate progression consistency', () => {
      // All regressions should have lower difficulty order
      exerciseProgression.regressions.forEach(regression => {
        expect(regression.difficultyOrder).toBeLessThan(exerciseProgression.difficultyOrder);
      });

      // All progressions should have higher difficulty order
      exerciseProgression.progressions.forEach(progression => {
        expect(progression.difficultyOrder).toBeGreaterThan(exerciseProgression.difficultyOrder);
      });
    });

    it('should handle edge cases', () => {
      // Empty alternatives should be valid
      const progressionWithNoAlternatives: IExerciseProgression = {
        ...exerciseProgression,
        alternatives: []
      };
      expect(progressionWithNoAlternatives.alternatives).toHaveLength(0);

      // Single exercise variant should be valid
      const singleExerciseVariant: IExerciseVariant = {
        ...pushUpsVariant,
        exercises: [exerciseOrder]
      };
      expect(singleExerciseVariant.exercises).toHaveLength(1);
    });
  });

  describe('Variant System Integration', () => {
    it('should support cross-variant relationships', () => {
      const relatedVariant: IExerciseVariant = {
        id: new Types.ObjectId(),
        category: 'incline-push-ups',
        description: 'Incline push-up variations for beginners',
        primaryMuscles: [MuscleZone.CHEST, MuscleZone.TRICEPS],
        exerciseType: ExerciseType.STRENGTH,
        exercises: [
          {
            exerciseId: new Types.ObjectId(),
            difficultyOrder: 1,
            verified: true,
            createdAt: new Date(),
            createdBy
          }
        ],
        verified: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy
      };

      // Variants with common muscle groups should be relatable
      const commonMuscles = pushUpsVariant.primaryMuscles.filter(muscle =>
        relatedVariant.primaryMuscles.includes(muscle)
      );
      expect(commonMuscles.length).toBeGreaterThan(0);
    });

    it('should support variant ordering validation', () => {
      const exerciseIds = pushUpsVariant.exercises.map(e => e.exerciseId);
      const uniqueIds = new Set(exerciseIds.map(id => id.toString()));
      
      // All exercise IDs should be unique
      expect(uniqueIds.size).toBe(exerciseIds.length);
    });

    it('should validate progression path completeness', () => {
      const currentOrder = exerciseProgression.difficultyOrder;
      const hasRegressions = exerciseProgression.regressions.length > 0;
      const hasProgressions = exerciseProgression.progressions.length > 0;

      // Middle-tier exercises should have both regressions and progressions
      if (currentOrder > 1 && currentOrder < 5) {
        expect(hasRegressions || hasProgressions).toBe(true);
      }
    });
  });
});
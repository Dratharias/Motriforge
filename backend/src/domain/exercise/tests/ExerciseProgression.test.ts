import { describe, it, expect, beforeEach } from 'vitest';
import { Types } from 'mongoose';
import { ExerciseProgression } from '../entities/ExerciseProgression';
import { Difficulty } from '../../../types/fitness/enums/exercise';

describe('ExerciseProgression Entity', () => {
  let progressionData: any;
  let progression: ExerciseProgression;

  beforeEach(() => {
    progressionData = {
      id: new Types.ObjectId(),
      exerciseId: new Types.ObjectId(),
      fromDifficulty: Difficulty.BEGINNER_I,
      toDifficulty: Difficulty.BEGINNER_II,
      title: 'Increase Repetitions',
      description: 'Progress from 10 to 15 repetitions',
      criteria: ['Complete 10 reps with perfect form', 'No fatigue after exercise'],
      modifications: ['Increase to 15 reps', 'Maintain same rest periods'],
      estimatedTimeToAchieve: 14,
      order: 1,
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: new Types.ObjectId(),
      isActive: true
    };
    progression = new ExerciseProgression(progressionData);
  });

  describe('Creation and Properties', () => {
    it('should create progression with all properties', () => {
      expect(progression.id).toBe(progressionData.id);
      expect(progression.fromDifficulty).toBe(Difficulty.BEGINNER_I);
      expect(progression.toDifficulty).toBe(Difficulty.BEGINNER_II);
      expect(progression.title).toBe('Increase Repetitions');
      expect(progression.criteria).toHaveLength(2);
      expect(progression.modifications).toHaveLength(2);
      expect(progression.estimatedTimeToAchieve).toBe(14);
      expect(progression.order).toBe(1);
    });

    it('should set default values for optional properties', () => {
      const minimalData = {
        id: new Types.ObjectId(),
        exerciseId: new Types.ObjectId(),
        fromDifficulty: Difficulty.INTERMEDIATE_I,
        toDifficulty: Difficulty.INTERMEDIATE_II,
        title: 'Test Progression',
        description: 'Test description',
        criteria: ['Test criteria'],
        modifications: ['Test modification'],
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: new Types.ObjectId(),
        isActive: true
      };

      const minimalProgression = new ExerciseProgression(minimalData);
      
      expect(minimalProgression.estimatedTimeToAchieve).toBe(14);
      expect(minimalProgression.order).toBe(1);
      expect(minimalProgression.targetExerciseId).toBeUndefined();
    });
  });

  describe('Progression Analysis', () => {
    it('should identify exercise transitions', () => {
      expect(progression.isExerciseTransition()).toBe(false);
      
      const transitionProgression = new ExerciseProgression({
        ...progressionData,
        targetExerciseId: new Types.ObjectId()
      });
      expect(transitionProgression.isExerciseTransition()).toBe(true);
    });

    it('should identify major progressions', () => {
      expect(progression.isMajorProgression()).toBe(false);
      
      const majorProgression = new ExerciseProgression({
        ...progressionData,
        fromDifficulty: Difficulty.BEGINNER_I,
        toDifficulty: Difficulty.INTERMEDIATE_I
      });
      expect(majorProgression.isMajorProgression()).toBe(true);
    });

    it('should calculate difficulty increase', () => {
      expect(progression.getDifficultyIncrease()).toBe(1);
      
      const majorProgression = new ExerciseProgression({
        ...progressionData,
        fromDifficulty: Difficulty.BEGINNER_I,
        toDifficulty: Difficulty.INTERMEDIATE_I
      });
      expect(majorProgression.getDifficultyIncrease()).toBe(3);
    });
  });

  describe('Update Operations', () => {
    it('should update progression properties', () => {
      const updates = {
        title: 'Updated Progression',
        estimatedTimeToAchieve: 21,
        order: 2
      };

      const updatedProgression = progression.update(updates);
      
      expect(updatedProgression.title).toBe('Updated Progression');
      expect(updatedProgression.estimatedTimeToAchieve).toBe(21);
      expect(updatedProgression.order).toBe(2);
      expect(updatedProgression.description).toBe(progression.description); // Unchanged
      expect(updatedProgression.updatedAt).not.toBe(progression.updatedAt);
    });

    it('should add criteria to progression', () => {
      const newCriteria = 'Demonstrate proper breathing technique';
      const updatedProgression = progression.addCriteria(newCriteria);
      
      expect(updatedProgression.criteria).toHaveLength(3);
      expect(updatedProgression.criteria).toContain(newCriteria);
    });

    it('should not add duplicate criteria', () => {
      const existingCriteria = progression.criteria[0];
      const updatedProgression = progression.addCriteria(existingCriteria);
      
      expect(updatedProgression.criteria).toHaveLength(2);
      expect(updatedProgression).toBe(progression); // No change
    });

    it('should add modification to progression', () => {
      const newModification = 'Reduce rest time between sets';
      const updatedProgression = progression.addModification(newModification);
      
      expect(updatedProgression.modifications).toHaveLength(3);
      expect(updatedProgression.modifications).toContain(newModification);
    });

    it('should not add duplicate modification', () => {
      const existingModification = progression.modifications[0];
      const updatedProgression = progression.addModification(existingModification);
      
      expect(updatedProgression.modifications).toHaveLength(2);
      expect(updatedProgression).toBe(progression); // No change
    });
  });
});


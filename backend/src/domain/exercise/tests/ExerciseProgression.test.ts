import { describe, it, expect, beforeEach } from 'vitest';
import { Types } from 'mongoose';
import { ExerciseProgression } from '../entities/ExerciseProgression';
import { Difficulty } from '../../../types/fitness/enums/exercise';

describe('ExerciseProgression Entity', () => {
  let progression: ExerciseProgression;
  let exerciseId: Types.ObjectId;
  let createdBy: Types.ObjectId;

  beforeEach(() => {
    exerciseId = new Types.ObjectId();
    createdBy = new Types.ObjectId();
    const now = new Date();

    progression = new ExerciseProgression({
      id: new Types.ObjectId(),
      exerciseId,
      fromDifficulty: Difficulty.BEGINNER_I,
      toDifficulty: Difficulty.BEGINNER_II,
      title: 'Increase Repetitions',
      description: 'Progress by adding more repetitions to the exercise',
      criteria: ['Complete current level with good form', 'Maintain consistency for 1 week'],
      modifications: ['Add 5 more repetitions', 'Increase sets if needed'],
      estimatedTimeToAchieve: 14,
      order: 1,
      createdAt: now,
      updatedAt: now,
      createdBy,
      isActive: true
    });
  });

  describe('Creation and Properties', () => {
    it('should create progression with all properties', () => {
      expect(progression.id).toBeDefined();
      expect(progression.exerciseId).toBe(exerciseId);
      expect(progression.fromDifficulty).toBe(Difficulty.BEGINNER_I);
      expect(progression.toDifficulty).toBe(Difficulty.BEGINNER_II);
      expect(progression.title).toBe('Increase Repetitions');
      expect(progression.description).toBe('Progress by adding more repetitions to the exercise');
      expect(progression.criteria).toHaveLength(2);
      expect(progression.modifications).toHaveLength(2);
      expect(progression.estimatedTimeToAchieve).toBe(14);
      expect(progression.order).toBe(1);
    });

    it('should set default values for optional properties', () => {
      const minimalProgression = new ExerciseProgression({
        id: new Types.ObjectId(),
        exerciseId,
        fromDifficulty: Difficulty.BEGINNER_I,
        toDifficulty: Difficulty.BEGINNER_II,
        title: 'Test Progression',
        description: 'Test description',
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy,
        isActive: true
      });

      expect(minimalProgression.criteria).toEqual([]);
      expect(minimalProgression.modifications).toEqual([]);
      expect(minimalProgression.estimatedTimeToAchieve).toBe(14);
      expect(minimalProgression.order).toBe(1);
    });
  });

  describe('Progression Analysis', () => {
    it('should calculate difficulty increase', () => {
      expect(progression.getDifficultyIncrease()).toBe(1);

      const bigJump = new ExerciseProgression({
        ...progression,
        fromDifficulty: Difficulty.BEGINNER_I,
        toDifficulty: Difficulty.INTERMEDIATE_I
      });
      expect(bigJump.getDifficultyIncrease()).toBe(3);
    });

    it('should identify major progressions', () => {
      expect(progression.isMajorProgression()).toBe(false);

      const majorProgression = new ExerciseProgression({
        ...progression,
        fromDifficulty: Difficulty.BEGINNER_I,
        toDifficulty: Difficulty.BEGINNER_III
      });
      expect(majorProgression.isMajorProgression()).toBe(true);
    });

    it('should identify exercise transitions', () => {
      expect(progression.isExerciseTransition()).toBe(false);

      const transitionProgression = new ExerciseProgression({
        ...progression,
        targetExerciseId: new Types.ObjectId()
      });
      expect(transitionProgression.isExerciseTransition()).toBe(true);
    });
  });

  describe('Update Operations', () => {
    it('should update progression properties', () => {
      const updates = {
        title: 'Updated Progression',
        description: 'Updated description for progression',
        estimatedTimeToAchieve: 21
      };

      const updatedProgression = progression.update(updates);

      expect(updatedProgression.title).toBe('Updated Progression');
      expect(updatedProgression.description).toBe('Updated description for progression');
      expect(updatedProgression.estimatedTimeToAchieve).toBe(21);
      expect(updatedProgression.id).toBe(progression.id);
      expect(updatedProgression.updatedAt).not.toBe(progression.updatedAt);
    });

    it('should add criteria to progression', () => {
      const newCriteria = 'Demonstrate proper breathing technique';
      const updatedProgression = progression.addCriteria(newCriteria);

      expect(updatedProgression.criteria).toHaveLength(3);
      expect(updatedProgression.criteria).toContain(newCriteria);
      expect(updatedProgression.criteria).toContain('Complete current level with good form');
      expect(updatedProgression.criteria).toContain('Maintain consistency for 1 week');
    });

    it('should not add duplicate criteria', () => {
      const existingCriteria = progression.criteria[0];
      const updatedProgression = progression.addCriteria(existingCriteria);

      expect(updatedProgression.criteria).toHaveLength(2);
      expect(updatedProgression).toBe(progression); // Should return same instance
    });

    it('should add modification to progression', () => {
      const newModification = 'Reduce rest time between sets';
      const updatedProgression = progression.addModification(newModification);

      expect(updatedProgression.modifications).toHaveLength(3);
      expect(updatedProgression.modifications).toContain(newModification);
      expect(updatedProgression.modifications).toContain('Add 5 more repetitions');
      expect(updatedProgression.modifications).toContain('Increase sets if needed');
    });

    it('should not add duplicate modification', () => {
      const existingModification = progression.modifications[0];
      const updatedProgression = progression.addModification(existingModification);

      expect(updatedProgression.modifications).toHaveLength(2);
      expect(updatedProgression).toBe(progression); // Should return same instance
    });

    it('should remove criteria from progression', () => {
      const criteriaToRemove = progression.criteria[0];
      const updatedProgression = progression.removeCriteria(criteriaToRemove);

      expect(updatedProgression.criteria).toHaveLength(1);
      expect(updatedProgression.criteria).not.toContain(criteriaToRemove);
    });

    it('should remove modification from progression', () => {
      const modificationToRemove = progression.modifications[0];
      const updatedProgression = progression.removeModification(modificationToRemove);

      expect(updatedProgression.modifications).toHaveLength(1);
      expect(updatedProgression.modifications).not.toContain(modificationToRemove);
    });
  });

  describe('Validation', () => {
    it('should validate complete progression successfully', () => {
      const validation = progression.validate();
      expect(validation.isValid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });

    it('should fail validation without title', () => {
      const invalidProgression = new ExerciseProgression({
        ...progression,
        title: ''
      });

      const validation = invalidProgression.validate();
      expect(validation.isValid).toBe(false);
      expect(validation.errors).toContain('Progression title is required');
    });

    it('should fail validation with short description', () => {
      const invalidProgression = new ExerciseProgression({
        ...progression,
        description: 'Short'
      });

      const validation = invalidProgression.validate();
      expect(validation.isValid).toBe(false);
      expect(validation.errors).toContain('Progression description must be at least 10 characters');
    });

    it('should fail validation with no difficulty increase', () => {
      const invalidProgression = new ExerciseProgression({
        ...progression,
        fromDifficulty: Difficulty.BEGINNER_I,
        toDifficulty: Difficulty.BEGINNER_I
      });

      const validation = invalidProgression.validate();
      expect(validation.isValid).toBe(false);
      expect(validation.errors).toContain('Progression must increase difficulty level');
    });

    it('should fail validation with too short time estimate', () => {
      const invalidProgression = new ExerciseProgression({
        ...progression,
        estimatedTimeToAchieve: 2
      });

      const validation = invalidProgression.validate();
      expect(validation.isValid).toBe(false);
      expect(validation.errors).toContain('Progression time must be at least 3 days');
    });

    it('should generate warnings for missing criteria', () => {
      const noCriteriaProgression = new ExerciseProgression({
        ...progression,
        criteria: []
      });

      const validation = noCriteriaProgression.validate();
      expect(validation.isValid).toBe(true);
      expect(validation.warnings).toContain('Progression lacks completion criteria');
    });
  });

  describe('Utility Methods', () => {
    it('should clone progression with new ID', () => {
      const cloned = progression.clone();
      
      expect(cloned.id).not.toBe(progression.id);
      expect(cloned.title).toBe(progression.title);
      expect(cloned.description).toBe(progression.description);
      expect(cloned.exerciseId).toBe(progression.exerciseId);
    });

    it('should calculate complexity score', () => {
      const complexity = progression.getComplexityScore();
      expect(complexity).toBeGreaterThan(0);
      expect(typeof complexity).toBe('number');
    });

    it('should assess reasonable difficulty', () => {
      expect(progression.isReasonableDifficulty()).toBe(true);

      const unreasonableProgression = new ExerciseProgression({
        ...progression,
        fromDifficulty: Difficulty.BEGINNER_I,
        toDifficulty: Difficulty.ADVANCED_I
      });
      expect(unreasonableProgression.isReasonableDifficulty()).toBe(false);
    });

    it('should assess reasonable timeframe', () => {
      expect(progression.isReasonableTimeframe()).toBe(true);

      const unreasonableTime = new ExerciseProgression({
        ...progression,
        estimatedTimeToAchieve: 1
      });
      expect(unreasonableTime.isReasonableTimeframe()).toBe(false);
    });

    it('should assess safety risk', () => {
      expect(progression.getSafetyRisk()).toBe('low');

      const highRiskProgression = new ExerciseProgression({
        ...progression,
        fromDifficulty: Difficulty.BEGINNER_I,
        toDifficulty: Difficulty.ADVANCED_I,
        estimatedTimeToAchieve: 7
      });
      expect(highRiskProgression.getSafetyRisk()).toBe('high');
    });

    it('should categorize progression type', () => {
      expect(progression.getProgressionType()).toBe('parameter');

      const techniqueProgression = new ExerciseProgression({
        ...progression,
        modifications: ['Improve form', 'Focus on technique']
      });
      expect(techniqueProgression.getProgressionType()).toBe('technique');

      const exerciseProgression = new ExerciseProgression({
        ...progression,
        targetExerciseId: new Types.ObjectId()
      });
      expect(exerciseProgression.getProgressionType()).toBe('exercise');
    });
  });
});
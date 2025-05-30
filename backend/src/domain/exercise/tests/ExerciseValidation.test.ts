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
import { ExerciseValidator } from '../validation/ExerciseValidator';

describe('Exercise Validation System', () => {
  let baseExerciseData: any;
  let createdBy: Types.ObjectId;
  let validator: ExerciseValidator;

  beforeEach(() => {
    createdBy = new Types.ObjectId();
    validator = new ExerciseValidator();
    const now = new Date();

    baseExerciseData = {
      id: new Types.ObjectId(),
      name: 'Test Exercise',
      description: 'A comprehensive test exercise for validation testing',
      type: ExerciseType.STRENGTH,
      difficulty: Difficulty.BEGINNER_I,
      primaryMuscles: [MuscleZone.CHEST],
      secondaryMuscles: [MuscleZone.TRICEPS],
      equipment: [EquipmentCategory.BODYWEIGHT],
      tags: ['test', 'validation'],
      estimatedDuration: 10,
      caloriesBurnedPerMinute: 4,
      createdAt: now,
      updatedAt: now,
      createdBy,
      isActive: true,
      isDraft: true
    };
  });

  describe('ExerciseValidator', () => {
    it('should validate complete exercise successfully', () => {
      // Add an instruction to make it actually valid
      const instruction = new ExerciseInstruction({
        id: new Types.ObjectId(),
        exerciseId: baseExerciseData.id,
        stepNumber: 1,
        title: 'Setup',
        description: 'Get into proper starting position',
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy,
        isActive: true,
        isDraft: true
      });
    
      const exercise = new Exercise({
        ...baseExerciseData,
        isDraft: false,
        instructions: [instruction]
      });
    
      const result = validator.validateForPublication(exercise);
      expect(result.isValid).toBe(true);
      expect(result.errors.length).toBe(0);
    });

    it('should reject exercise without name', () => {
      const exercise = new Exercise({
        ...baseExerciseData,
        name: ''
      });
      const result = validator.validateForPublication(exercise);
      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.field === 'name' && e.code === 'required')).toBe(true);
    });

    it('should reject exercise with short description', () => {
      const exercise = new Exercise({
        ...baseExerciseData,
        description: 'Too short'
      });
      const result = validator.validateForPublication(exercise);
      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.field === 'description')).toBe(true);
    });

    it('should reject exercise without primary muscles', () => {
      const exercise = new Exercise({
        ...baseExerciseData,
        primaryMuscles: []
      });
      const result = validator.validateForPublication(exercise);
      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.field === 'primaryMuscles')).toBe(true);
    });

    it('should validate drafts with lenient rules', () => {
      const incompleteExercise = new Exercise({
        ...baseExerciseData,
        description: 'Short',
        isDraft: true
      });
      const draftResult = validator.validateForDraft(incompleteExercise);
      const publishResult = validator.validateForPublication(incompleteExercise);

      expect(draftResult.canSaveDraft()).toBe(true);
      expect(publishResult.canPublish()).toBe(false);
    });

    it('should require instructions for published exercises', () => {
      const exercise = new Exercise({
        ...baseExerciseData,
        isDraft: false,
        instructions: []
      });
      const result = validator.validateForPublication(exercise);
      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.field === 'instructions')).toBe(true);
    });

    it('should detect duplicate step numbers', () => {
      const instruction1 = new ExerciseInstruction({
        id: new Types.ObjectId(),
        exerciseId: baseExerciseData.id,
        stepNumber: 1,
        title: 'Step 1',
        description: 'First instruction with proper length',
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy,
        isActive: true,
        isDraft: true
      });

      const instruction2 = new ExerciseInstruction({
        id: new Types.ObjectId(),
        exerciseId: baseExerciseData.id,
        stepNumber: 1, // Same step number
        title: 'Step 1 Again',
        description: 'Second instruction with same step number',
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy,
        isActive: true,
        isDraft: true
      });

      const exercise = new Exercise({
        ...baseExerciseData,
        isDraft: false,
        instructions: [instruction1, instruction2]
      });

      const result = validator.validateForPublication(exercise);
      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.code === 'duplicate_steps')).toBe(true);
    });

    it('should provide validation summary', () => {
      const exercise = new Exercise(baseExerciseData);
      const summary = validator.getValidationSummary(exercise);
      
      expect(summary.overallScore).toBeGreaterThanOrEqual(0);
      expect(summary.readinessPercentage).toBeGreaterThanOrEqual(0);
      expect(Array.isArray(summary.missingRequirements)).toBe(true);
    });

    it('should handle complex validation scenarios', () => {
      const complexExercise = new Exercise({
        ...baseExerciseData,
        name: 'Complex Advanced Exercise',
        description: 'A very detailed description of a complex exercise that requires multiple muscle groups and advanced coordination',
        type: ExerciseType.SPORTS_SPECIFIC,
        difficulty: Difficulty.ADVANCED_II,
        primaryMuscles: [MuscleZone.CORE, MuscleZone.SHOULDER, MuscleZone.BACK],
        equipment: [EquipmentCategory.MACHINES, EquipmentCategory.FREE_WEIGHTS],
        isDraft: false,
        instructions: [],
        contraindications: []
      });

      const result = validator.validateForPublication(complexExercise);
      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.field === 'instructions')).toBe(true);
      expect(result.warnings.length).toBeGreaterThan(0);
    });
  });
});
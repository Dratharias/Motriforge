import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Types } from 'mongoose';
import { Exercise } from '../entities/Exercise';
import { ExerciseInstruction } from '../entities/ExerciseInstruction';
import {
  ExerciseType,
  Difficulty,
  MuscleZone,
  EquipmentCategory
} from '../../../types/fitness/enums/exercise';
import { MediaType } from '../../../types/fitness/enums/media';
import { BasicInfoValidator } from '../validation/BasicInfoValidator';
import { InstructionValidator } from '../validation/InstructionValidator';
import { SafetyValidator } from '../validation/SafetyValidator';
import { MediaValidator } from '../validation/MediaValidator';
import { ProgressionValidator } from '../validation/ProgressionValidator';
import { ExerciseValidatorFacade } from '../validation/ExerciseValidatorFacade';

describe('Exercise Validation System', () => {
  let baseExerciseData: any;
  let createdBy: Types.ObjectId;

  beforeEach(() => {
    createdBy = new Types.ObjectId();
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

  describe('BasicInfoValidator', () => {
    let validator: BasicInfoValidator;

    beforeEach(() => {
      validator = new BasicInfoValidator();
    });

    it('should validate complete exercise successfully', () => {
      const exercise = new Exercise(baseExerciseData);
      const result = validator.validate(exercise);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject exercise without name', () => {
      const exercise = new Exercise({
        ...baseExerciseData,
        name: ''
      });

      const result = validator.validate(exercise);

      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.field === 'name' && e.code === 'required')).toBe(true);
    });

    it('should reject exercise with short description', () => {
      const exercise = new Exercise({
        ...baseExerciseData,
        description: 'Too short'
      });

      const result = validator.validate(exercise);

      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.field === 'description')).toBe(true);
    });

    it('should reject exercise without primary muscles', () => {
      const exercise = new Exercise({
        ...baseExerciseData,
        primaryMuscles: []
      });

      const result = validator.validate(exercise);

      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.field === 'primaryMuscles')).toBe(true);
    });

    it('should generate warnings for short descriptions', () => {
      const exercise = new Exercise({
        ...baseExerciseData,
        description: 'Short but valid description for test'
      });

      const result = validator.validate(exercise);

      expect(result.isValid).toBe(true);
      expect(result.warnings.some(w => w.field === 'description')).toBe(true);
    });

    it('should detect inappropriate content', () => {
      const exercise = new Exercise({
        ...baseExerciseData,
        name: 'Fucking awesome exercise'
      });

      const result = validator.validate(exercise);

      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.code === 'inappropriate_content')).toBe(true);
    });
  });

  describe('InstructionValidator', () => {
    let validator: InstructionValidator;

    beforeEach(() => {
      validator = new InstructionValidator();
    });

    it('should not validate draft exercises', () => {
      const exercise = new Exercise({
        ...baseExerciseData,
        isDraft: true
      });

      expect(validator.shouldValidate(exercise)).toBe(false);
    });

    it('should require instructions for published exercises', () => {
      const exercise = new Exercise({
        ...baseExerciseData,
        isDraft: false,
        instructions: []
      });

      const result = validator.validate(exercise);

      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.field === 'instructions')).toBe(true);
    });

    it('should validate instruction quality', () => {
      const shortInstruction = new ExerciseInstruction({
        id: new Types.ObjectId(),
        exerciseId: baseExerciseData.id,
        stepNumber: 1,
        title: 'Step 1',
        description: 'Short',
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy,
        isActive: true,
        isDraft: true
      });

      const exercise = new Exercise({
        ...baseExerciseData,
        isDraft: false,
        instructions: [shortInstruction]
      });

      const result = validator.validate(exercise);

      expect(result.isValid).toBe(true);
      expect(result.warnings.some(w => w.field === 'instructions')).toBe(true);
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
        stepNumber: 1,
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

      const result = validator.validate(exercise);

      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.code === 'duplicate_steps')).toBe(true);
    });
  });

  describe('SafetyValidator', () => {
    let validator: SafetyValidator;

    beforeEach(() => {
      validator = new SafetyValidator();
    });

    it('should always validate exercises', () => {
      const exercise = new Exercise(baseExerciseData);
      expect(validator.shouldValidate(exercise)).toBe(true);
    });

    it('should flag high-risk exercise types', () => {
      const exercise = new Exercise({
        ...baseExerciseData,
        type: ExerciseType.REHABILITATION
      });

      const result = validator.validate(exercise);

      expect(result.warnings.some(w => w.field === 'type')).toBe(true);
    });

    it('should warn about advanced difficulty exercises', () => {
      const exercise = new Exercise({
        ...baseExerciseData,
        difficulty: Difficulty.MASTER
      });

      const result = validator.validate(exercise);

      expect(result.warnings.some(w => w.field === 'difficulty')).toBe(true);
    });

    it('should suggest contraindications for advanced exercises', () => {
      const exercise = new Exercise({
        ...baseExerciseData,
        difficulty: Difficulty.ADVANCED_I,
        contraindications: []
      });

      const result = validator.validate(exercise);

      expect(result.warnings.some(w => w.field === 'contraindications')).toBe(true);
    });
  });

  describe('MediaValidator', () => {
    let validator: MediaValidator;

    beforeEach(() => {
      validator = new MediaValidator();
    });

    it('should only validate exercises with media', () => {
      const exerciseWithoutMedia = new Exercise(baseExerciseData);
      expect(validator.shouldValidate(exerciseWithoutMedia)).toBe(false);

      const exerciseWithMedia = new Exercise({
        ...baseExerciseData,
        mediaUrls: ['https://example.com/video.mp4']
      });
      expect(validator.shouldValidate(exerciseWithMedia)).toBe(true);
    });

    it('should validate URL formats', () => {
      const exercise = new Exercise({
        ...baseExerciseData,
        mediaUrls: ['invalid-url', 'https://example.com/valid.mp4'],
        mediaTypes: [MediaType.VIDEO, MediaType.VIDEO]
      });

      const result = validator.validate(exercise);

      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.code === 'invalid_format')).toBe(true);
    });

    it('should suggest thumbnails for videos', () => {
      const videoInstruction = new ExerciseInstruction({
        id: new Types.ObjectId(),
        exerciseId: baseExerciseData.id,
        stepNumber: 1,
        title: 'Video Step',
        description: 'Step with video content',
        mediaUrl: 'https://example.com/video.mp4',
        mediaType: MediaType.VIDEO,
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy,
        isActive: true,
        isDraft: true
      });

      const exercise = new Exercise({
        ...baseExerciseData,
        instructions: [videoInstruction]
      });

      const result = validator.validate(exercise);

      expect(result.warnings.some(w => w.message.includes('thumbnails'))).toBe(true);
    });
  });

  describe('ProgressionValidator', () => {
    let validator: ProgressionValidator;

    beforeEach(() => {
      validator = new ProgressionValidator();
    });

    it('should only validate exercises with progressions', () => {
      const exerciseWithoutProgressions = new Exercise(baseExerciseData);
      expect(validator.shouldValidate(exerciseWithoutProgressions)).toBe(false);

      const exerciseWithProgressions = new Exercise({
        ...baseExerciseData,
        progressions: []
      });
      expect(validator.shouldValidate(exerciseWithProgressions)).toBe(false);
    });
  });

  describe('ExerciseValidatorFacade', () => {
    let facade: ExerciseValidatorFacade;

    beforeEach(() => {
      facade = new ExerciseValidatorFacade();
    });

    it('should run all applicable validators', () => {
      const exercise = new Exercise({
        ...baseExerciseData,
        isDraft: false,
        mediaUrls: ['https://example.com/image.jpg'],
        mediaTypes: [MediaType.IMAGE]
      });

      const result = facade.validateExercise(exercise);

      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should provide validation summary', () => {
      const exercise = new Exercise(baseExerciseData);
      const summary = facade.getValidationSummary(exercise);

      expect(summary.overallScore).toBeGreaterThan(0);
      expect(summary.validatorResults.length).toBeGreaterThan(0);
      expect(summary.readinessPercentage).toBeGreaterThan(0);
    });

    it('should validate drafts with lenient rules', () => {
      const incompleteExercise = new Exercise({
        ...baseExerciseData,
        description: 'Short',
        isDraft: true
      });

      const draftResult = facade.validateForDraft(incompleteExercise);
      const publishResult = facade.validateForPublication(incompleteExercise);

      expect(draftResult.canSaveDraft()).toBe(true);
      expect(publishResult.canPublish()).toBe(false);
    });
  });

  describe('Validation Rule Combinations', () => {
    let facade: ExerciseValidatorFacade;

    beforeEach(() => {
      facade = new ExerciseValidatorFacade();
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
        mediaUrls: ['https://example.com/demo.mp4'],
        mediaTypes: [MediaType.VIDEO],
        instructions: [],
        contraindications: []
      });

      const result = facade.validateExercise(complexExercise);

      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.field === 'instructions')).toBe(true);
      expect(result.warnings.some(w => w.field === 'type')).toBe(true);
      expect(result.warnings.some(w => w.field === 'contraindications')).toBe(true);
    });

    it('should validate progressive difficulty alignment', () => {
      const mismatchedExercise = new Exercise({
        ...baseExerciseData,
        difficulty: Difficulty.BEGINNER_I,
        type: ExerciseType.SPORTS_SPECIFIC,
        primaryMuscles: [MuscleZone.CORE, MuscleZone.SHOULDER, MuscleZone.BACK],
        equipment: [EquipmentCategory.MACHINES]
      });

      const result = facade.validateExercise(mismatchedExercise);

      expect(result.warnings.length).toBeGreaterThan(0);
    });

    it('should handle rehabilitation exercise validation', () => {
      const rehabExercise = new Exercise({
        ...baseExerciseData,
        name: 'Shoulder Rehabilitation Exercise',
        type: ExerciseType.REHABILITATION,
        difficulty: Difficulty.BEGINNER_I,
        primaryMuscles: [MuscleZone.SHOULDER],
        isDraft: false,
        contraindications: [],
        instructions: []
      });

      const result = facade.validateExercise(rehabExercise);

      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.field === 'instructions')).toBe(true);
      expect(result.warnings.some(w => w.field === 'type')).toBe(true);
    });
  });

  describe('Validator Priority and Ordering', () => {
    it('should respect validator priorities', () => {
      const validators = [
        new BasicInfoValidator(),
        new SafetyValidator(),
        new InstructionValidator(),
        new ProgressionValidator(),
        new MediaValidator()
      ];

      const sortedValidators = validators.sort((a, b) => b.priority - a.priority);

      expect(sortedValidators[0].name).toBe('BasicInfoValidator');
      expect(sortedValidators[1].name).toBe('SafetyValidator');
    });

    it('should run validators in priority order', () => {
      const facade = new ExerciseValidatorFacade();
      const exercise = new Exercise(baseExerciseData);
      const executionOrder: string[] = [];

      const mockValidators = [
        {
          name: 'MockValidator1',
          priority: 100,
          shouldValidate: () => true,
          validate: () => {
            executionOrder.push('MockValidator1');
            return {
              isValid: true,
              errors: [],
              warnings: [],
              isDraftValid: true,
              requiredForPublication: [],
              canSaveDraft: () => true,
              canPublish: () => true
            };
          }
        },
        {
          name: 'MockValidator2',
          priority: 50,
          shouldValidate: () => true,
          validate: () => {
            executionOrder.push('MockValidator2');
            return {
              isValid: true,
              errors: [],
              warnings: [],
              isDraftValid: true,
              requiredForPublication: [],
              canSaveDraft: () => true,
              canPublish: () => true
            };
          }
        }
      ];

      const customFacade = new ExerciseValidatorFacade(mockValidators as any);
      customFacade.validateExercise(exercise);

      expect(executionOrder).toEqual(['MockValidator1', 'MockValidator2']);
    });
  });
});


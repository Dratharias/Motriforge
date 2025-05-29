import { describe, it, expect, beforeEach } from 'vitest';
import { Types } from 'mongoose';
import { Exercise } from '../entities/Exercise';
import { ExerciseInstruction } from '../entities/ExerciseInstruction';
import { 
  ExerciseType, 
  Difficulty, 
  MuscleZone 
} from '../../../types/fitness/enums/exercise';

describe('Exercise Draft/Publish Workflow', () => {
  let draftExercise: Exercise;
  let createdBy: Types.ObjectId;

  beforeEach(() => {
    createdBy = new Types.ObjectId();
    const now = new Date();

    draftExercise = new Exercise({
      id: new Types.ObjectId(),
      name: 'New Exercise',
      description: 'A newly created exercise',
      type: ExerciseType.STRENGTH,
      difficulty: Difficulty.BEGINNER_I,
      primaryMuscles: [MuscleZone.CHEST],
      createdAt: now,
      updatedAt: now,
      createdBy,
      isActive: true,
      isDraft: true
    });
  });

  describe('Draft State', () => {
    it('should start as draft', () => {
      expect(draftExercise.isDraft).toBe(true);
      expect(draftExercise.isPublished()).toBe(false);
      expect(draftExercise.needsReview()).toBe(false);
    });

    it('should allow saving draft with incomplete data', () => {
      const savedDraft = draftExercise.saveDraft();
      expect(savedDraft.isDraft).toBe(true);
      expect(savedDraft.updatedAt).not.toBe(draftExercise.updatedAt);
    });

    it('should validate draft with lenient rules', () => {
      const validation = draftExercise.validateDraft();
      expect(validation.isDraftValid).toBe(true);
      expect(validation.canSaveDraft()).toBe(true);
    });

    it('should prevent publishing incomplete draft', () => {
      expect(draftExercise.canBePublished()).toBe(false);
      expect(() => draftExercise.publish()).toThrow();
    });
  });

  describe('Draft Completion Process', () => {
    it('should track completion progress', () => {
      const preview = draftExercise.getDraftPreview();
      expect(preview.completionPercentage).toBeLessThan(100);
      expect(preview.missingRequiredFields).toContain('instructions');
    });

    it('should update completion as fields are added', () => {
      const instruction = new ExerciseInstruction({
        id: new Types.ObjectId(),
        exerciseId: draftExercise.id,
        stepNumber: 1,
        title: 'Step 1',
        description: 'First step',
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy,
        isActive: true
      });

      const updatedExercise = draftExercise.addInstruction(instruction);
      const preview = updatedExercise.getDraftPreview();
      
      expect(preview.completionPercentage).toBeGreaterThan(draftExercise.getDraftPreview().completionPercentage);
      expect(preview.missingRequiredFields).not.toContain('instructions');
    });
  });

  describe('Publication Process', () => {
    it('should publish complete exercise', () => {
      const instruction = new ExerciseInstruction({
        id: new Types.ObjectId(),
        exerciseId: draftExercise.id,
        stepNumber: 1,
        title: 'Complete Step',
        description: 'A complete instruction step',
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy,
        isActive: true
      });

      const completeExercise = draftExercise.addInstruction(instruction);
      expect(completeExercise.canBePublished()).toBe(true);

      const publishedExercise = completeExercise.publish();
      expect(publishedExercise.isDraft).toBe(false);
      expect(publishedExercise.publishedAt).toBeDefined();
      expect(publishedExercise.isPublished()).toBe(true);
    });

    it('should require review after publication', () => {
      const instruction = new ExerciseInstruction({
        id: new Types.ObjectId(),
        exerciseId: draftExercise.id,
        stepNumber: 1,
        title: 'Complete Step',
        description: 'A complete instruction step',
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy,
        isActive: true
      });

      const publishedExercise = draftExercise.addInstruction(instruction).publish();
      expect(publishedExercise.needsReview()).toBe(true);
      expect(publishedExercise.reviewedBy).toBeUndefined();
    });
  });

  describe('Draft Validation Edge Cases', () => {
    it('should handle empty collections gracefully', () => {
      const emptyExercise = new Exercise({
        id: new Types.ObjectId(),
        name: '',
        description: '',
        type: ExerciseType.STRENGTH,
        difficulty: Difficulty.BEGINNER_I,
        primaryMuscles: [],
        instructions: [],
        progressions: [],
        contraindications: [],
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy,
        isActive: true,
        isDraft: true
      });

      const validation = emptyExercise.validateForPublication();
      expect(validation.isValid).toBe(false);
      expect(validation.errors.length).toBeGreaterThan(0);
    });

    it('should validate name length constraints', () => {
      const longNameExercise = new Exercise({
        ...draftExercise,
        name: 'a'.repeat(150) // Exceeds max length
      });

      const validation = longNameExercise.validateDraft();
      expect(validation.isValid).toBe(false);
      expect(validation.errors.some(e => e.field === 'name')).toBe(true);
    });

    it('should validate description requirements', () => {
      const shortDescExercise = new Exercise({
        ...draftExercise,
        description: 'Too short'
      });

      const validation = shortDescExercise.validateForPublication();
      expect(validation.isValid).toBe(false);
      expect(validation.errors.some(e => e.field === 'description')).toBe(true);
    });
  });

  describe('Draft Preview Accuracy', () => {
    it('should calculate completion percentage accurately', () => {
      // Test with minimal exercise
      let preview = draftExercise.getDraftPreview();
      const initialPercentage = preview.completionPercentage;

      // Add instruction
      const instruction = new ExerciseInstruction({
        id: new Types.ObjectId(),
        exerciseId: draftExercise.id,
        stepNumber: 1,
        title: 'Step 1',
        description: 'First step',
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy,
        isActive: true
      });

      const withInstruction = draftExercise.addInstruction(instruction);
      preview = withInstruction.getDraftPreview();
      
      expect(preview.completionPercentage).toBeGreaterThan(initialPercentage);
    });

    it('should estimate time to complete accurately', () => {
      const preview = draftExercise.getDraftPreview();
      const expectedTime = preview.missingRequiredFields.length * 5; // 5 minutes per field
      
      expect(preview.estimatedTimeToComplete).toBe(expectedTime);
    });
  });
});
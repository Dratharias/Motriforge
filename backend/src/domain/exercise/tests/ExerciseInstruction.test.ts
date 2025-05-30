import { describe, it, expect, beforeEach } from 'vitest';
import { Types } from 'mongoose';
import { ExerciseInstruction } from '../entities/ExerciseInstruction';
import { MediaType } from '../../../types/fitness/enums/media';

describe('ExerciseInstruction Entity', () => {
  let instruction: ExerciseInstruction;
  let exerciseId: Types.ObjectId;
  let createdBy: Types.ObjectId;

  beforeEach(() => {
    exerciseId = new Types.ObjectId();
    createdBy = new Types.ObjectId();
    const now = new Date();

    instruction = new ExerciseInstruction({
      id: new Types.ObjectId(),
      exerciseId,
      stepNumber: 1,
      title: 'Starting Position',
      description: 'Get into the proper starting position for the exercise',
      duration: 30,
      mediaUrl: 'https://example.com/instruction.jpg',
      mediaType: MediaType.IMAGE,
      tips: ['Keep your core tight', 'Breathe steadily'],
      commonMistakes: ['Arching back', 'Holding breath'],
      isOptional: false,
      createdAt: now,
      updatedAt: now,
      createdBy,
      isActive: true,
      isDraft: true
    });
  });

  describe('Creation and Properties', () => {
    it('should create instruction with all properties', () => {
      expect(instruction.id).toBeDefined();
      expect(instruction.exerciseId).toBe(exerciseId);
      expect(instruction.stepNumber).toBe(1);
      expect(instruction.title).toBe('Starting Position');
      expect(instruction.description).toBe('Get into the proper starting position for the exercise');
      expect(instruction.duration).toBe(30);
      expect(instruction.mediaUrl).toBe('https://example.com/instruction.jpg');
      expect(instruction.mediaType).toBe(MediaType.IMAGE);
      expect(instruction.tips).toHaveLength(2);
      expect(instruction.commonMistakes).toHaveLength(2);
      expect(instruction.isOptional).toBe(false);
    });

    it('should set default values for optional properties', () => {
      const minimalInstruction = new ExerciseInstruction({
        id: new Types.ObjectId(),
        exerciseId,
        stepNumber: 1,
        title: 'Test',
        description: 'Test description',
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy,
        isActive: true,
        isDraft: true
      });

      expect(minimalInstruction.tips).toEqual([]);
      expect(minimalInstruction.commonMistakes).toEqual([]);
      expect(minimalInstruction.isOptional).toBe(false);
      expect(minimalInstruction.duration).toBeUndefined();
    });
  });

  describe('Media Methods', () => {
    it('should detect if instruction has media', () => {
      expect(instruction.hasMedia()).toBe(true);

      const noMediaInstruction = new ExerciseInstruction({
        id: new Types.ObjectId(),
        exerciseId,
        stepNumber: 1,
        title: 'Test',
        description: 'Test description',
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy,
        isActive: true,
        isDraft: true
      });

      expect(noMediaInstruction.hasMedia()).toBe(false);
    });
  });

  describe('Duration Formatting', () => {
    it('should format duration in seconds', () => {
      const shortInstruction = new ExerciseInstruction({
        id: new Types.ObjectId(),
        exerciseId,
        stepNumber: 1,
        title: 'Quick Step',
        description: 'A quick instruction step',
        duration: 45,
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy,
        isActive: true,
        isDraft: true
      });
      expect(shortInstruction.getFormattedDuration()).toBe('45s');
    });

    it('should format duration in minutes and seconds', () => {
      const longInstruction = new ExerciseInstruction({
        ...instruction,
        duration: 90
      });
      expect(longInstruction.getFormattedDuration()).toBe('1m 30s');
    });

    it('should format duration in minutes only', () => {
      const minuteInstruction = new ExerciseInstruction({
        ...instruction,
        duration: 120
      });
      expect(minuteInstruction.getFormattedDuration()).toBe('2m');
    });

    it('should return null for no duration', () => {
      const noDurationInstruction = new ExerciseInstruction({
        ...instruction,
        duration: undefined
      });
      expect(noDurationInstruction.getFormattedDuration()).toBeNull();
    });
  });

  describe('Update Operations', () => {
    it('should update instruction properties', () => {
      const updates = {
        title: 'Updated Position',
        description: 'Updated description for the exercise position',
        stepNumber: 2
      };

      const updatedInstruction = instruction.update(updates);

      expect(updatedInstruction.title).toBe('Updated Position');
      expect(updatedInstruction.description).toBe('Updated description for the exercise position');
      expect(updatedInstruction.stepNumber).toBe(2);
      expect(updatedInstruction.id).toBe(instruction.id);
      expect(updatedInstruction.updatedAt).not.toBe(instruction.updatedAt);
    });

    it('should add tip to instruction', () => {
      const newTip = 'Focus on breathing';
      const updatedInstruction = instruction.addTip(newTip);

      expect(updatedInstruction.tips).toHaveLength(3);
      expect(updatedInstruction.tips).toContain(newTip);
      expect(updatedInstruction.tips).toContain('Keep your core tight');
      expect(updatedInstruction.tips).toContain('Breathe steadily');
    });

    it('should not add duplicate tip', () => {
      const existingTip = instruction.tips[0];
      const updatedInstruction = instruction.addTip(existingTip);

      expect(updatedInstruction.tips).toHaveLength(2);
      expect(updatedInstruction).toBe(instruction); // Should return same instance
    });

    it('should add common mistake to instruction', () => {
      const newMistake = 'Holding breath';
      const updatedInstruction = instruction.addCommonMistake(newMistake);

      expect(updatedInstruction.commonMistakes).toHaveLength(2);
      expect(updatedInstruction.commonMistakes).toContain(newMistake);
      expect(updatedInstruction.commonMistakes).toContain('Arching back');
      expect(updatedInstruction.commonMistakes).toContain('Holding breath');
    });

    it('should not add duplicate common mistake', () => {
      const existingMistake = instruction.commonMistakes[0];
      const updatedInstruction = instruction.addCommonMistake(existingMistake);

      expect(updatedInstruction.commonMistakes).toHaveLength(2);
      expect(updatedInstruction).toBe(instruction); // Should return same instance
    });

    it('should remove tip from instruction', () => {
      const tipToRemove = instruction.tips[0];
      const updatedInstruction = instruction.removeTip(tipToRemove);

      expect(updatedInstruction.tips).toHaveLength(1);
      expect(updatedInstruction.tips).not.toContain(tipToRemove);
    });

    it('should remove common mistake from instruction', () => {
      const mistakeToRemove = instruction.commonMistakes[0];
      const updatedInstruction = instruction.removeCommonMistake(mistakeToRemove);

      expect(updatedInstruction.commonMistakes).toHaveLength(1);
      expect(updatedInstruction.commonMistakes).not.toContain(mistakeToRemove);
    });
  });

  describe('Validation', () => {
    it('should validate complete instruction successfully', () => {
      const validation = instruction.validate();
      expect(validation.isValid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });

    it('should fail validation without title', () => {
      const invalidInstruction = new ExerciseInstruction({
        ...instruction,
        title: ''
      });

      const validation = invalidInstruction.validate();
      expect(validation.isValid).toBe(false);
      expect(validation.errors).toContain('Instruction title is required');
    });

    it('should fail validation with short description', () => {
      const invalidInstruction = new ExerciseInstruction({
        ...instruction,
        description: 'Short'
      });

      const validation = invalidInstruction.validate();
      expect(validation.isValid).toBe(false);
      expect(validation.errors).toContain('Instruction description must be at least 10 characters');
    });

    it('should generate warnings for short descriptions', () => {
      const shortDescInstruction = new ExerciseInstruction({
        ...instruction,
        description: 'Valid but short'
      });

      const validation = shortDescInstruction.validate();
      expect(validation.isValid).toBe(true);
      expect(validation.warnings).toContain('Description is quite short - consider adding more detail');
    });
  });

  describe('Utility Methods', () => {
    it('should clone instruction with new ID', () => {
      const cloned = instruction.clone();
      
      expect(cloned.id).not.toBe(instruction.id);
      expect(cloned.title).toBe(instruction.title);
      expect(cloned.description).toBe(instruction.description);
      expect(cloned.exerciseId).toBe(instruction.exerciseId);
    });

    it('should calculate complexity score', () => {
      const complexity = instruction.getComplexityScore();
      expect(complexity).toBeGreaterThan(0);
      expect(typeof complexity).toBe('number');
    });

    it('should identify if media is required', () => {
      const formInstruction = new ExerciseInstruction({
        ...instruction,
        title: 'Proper Form'
      });
      expect(formInstruction.isMediaRequired()).toBe(true);

      const positionInstruction = new ExerciseInstruction({
        ...instruction,
        title: 'Starting Position'
      });
      expect(positionInstruction.isMediaRequired()).toBe(true);

      const stepOneInstruction = new ExerciseInstruction({
        ...instruction,
        stepNumber: 1
      });
      expect(stepOneInstruction.isMediaRequired()).toBe(true);
    });
  });
});
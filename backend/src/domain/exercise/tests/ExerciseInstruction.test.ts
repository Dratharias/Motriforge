import { describe, it, expect, beforeEach } from 'vitest';
import { Types } from 'mongoose';
import { ExerciseInstruction } from '../entities/ExerciseInstruction';
import { MediaType } from '../../../types/fitness/enums/media';

describe('ExerciseInstruction Entity', () => {
  let instructionData: any;
  let instruction: ExerciseInstruction;

  beforeEach(() => {
    instructionData = {
      id: new Types.ObjectId(),
      exerciseId: new Types.ObjectId(),
      stepNumber: 1,
      title: 'Starting Position',
      description: 'Get into a plank position with hands shoulder-width apart',
      duration: 30,
      mediaUrl: 'https://example.com/video.mp4',
      mediaType: MediaType.VIDEO,
      tips: ['Keep your core tight', 'Maintain straight line from head to heels'],
      commonMistakes: ['Sagging hips', 'Hands too wide'],
      isOptional: false,
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: new Types.ObjectId(),
      isActive: true
    };
    instruction = new ExerciseInstruction(instructionData);
  });

  describe('Creation and Properties', () => {
    it('should create instruction with all properties', () => {
      expect(instruction.id).toBe(instructionData.id);
      expect(instruction.stepNumber).toBe(1);
      expect(instruction.title).toBe('Starting Position');
      expect(instruction.description).toBe(instructionData.description);
      expect(instruction.duration).toBe(30);
      expect(instruction.tips).toHaveLength(2);
      expect(instruction.commonMistakes).toHaveLength(2);
      expect(instruction.isOptional).toBe(false);
    });

    it('should set default values for optional properties', () => {
      const minimalData = {
        id: new Types.ObjectId(),
        exerciseId: new Types.ObjectId(),
        stepNumber: 1,
        title: 'Test Step',
        description: 'Test description',
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: new Types.ObjectId(),
        isActive: true
      };

      const minimalInstruction = new ExerciseInstruction(minimalData);
      
      expect(minimalInstruction.tips).toEqual([]);
      expect(minimalInstruction.commonMistakes).toEqual([]);
      expect(minimalInstruction.isOptional).toBe(false);
      expect(minimalInstruction.duration).toBeUndefined();
    });
  });

  describe('Media Methods', () => {
    it('should check if instruction has media', () => {
      expect(instruction.hasMedia()).toBe(true);
      
      const noMediaInstruction = new ExerciseInstruction({
        ...instructionData,
        mediaUrl: undefined,
        mediaType: undefined
      });
      expect(noMediaInstruction.hasMedia()).toBe(false);
    });
  });

  describe('Duration Formatting', () => {
    it('should format duration in seconds', () => {
      const shortInstruction = new ExerciseInstruction({
        ...instructionData,
        duration: 45
      });
      expect(shortInstruction.getFormattedDuration()).toBe('45s');
    });

    it('should format duration in minutes and seconds', () => {
      const longInstruction = new ExerciseInstruction({
        ...instructionData,
        duration: 90
      });
      expect(longInstruction.getFormattedDuration()).toBe('1m 30s');
    });

    it('should format duration in minutes only', () => {
      const minuteInstruction = new ExerciseInstruction({
        ...instructionData,
        duration: 120
      });
      expect(minuteInstruction.getFormattedDuration()).toBe('2m');
    });

    it('should return null for no duration', () => {
      const noDurationInstruction = new ExerciseInstruction({
        ...instructionData,
        duration: undefined
      });
      expect(noDurationInstruction.getFormattedDuration()).toBeNull();
    });
  });

  describe('Update Operations', () => {
    it('should update instruction properties', () => {
      const updates = {
        title: 'Updated Position',
        description: 'Updated description',
        duration: 60
      };

      const updatedInstruction = instruction.update(updates);
      
      expect(updatedInstruction.title).toBe('Updated Position');
      expect(updatedInstruction.description).toBe('Updated description');
      expect(updatedInstruction.duration).toBe(60);
      expect(updatedInstruction.stepNumber).toBe(instruction.stepNumber); // Unchanged
      expect(updatedInstruction.updatedAt).not.toBe(instruction.updatedAt);
    });

    it('should add tip to instruction', () => {
      const newTip = 'Focus on breathing';
      const updatedInstruction = instruction.addTip(newTip);
      
      expect(updatedInstruction.tips).toHaveLength(3);
      expect(updatedInstruction.tips).toContain(newTip);
    });

    it('should not add duplicate tip', () => {
      const existingTip = instruction.tips[0];
      const updatedInstruction = instruction.addTip(existingTip);
      
      expect(updatedInstruction.tips).toHaveLength(2);
      expect(updatedInstruction).toBe(instruction); // No change
    });

    it('should add common mistake to instruction', () => {
      const newMistake = 'Holding breath';
      const updatedInstruction = instruction.addCommonMistake(newMistake);
      
      expect(updatedInstruction.commonMistakes).toHaveLength(3);
      expect(updatedInstruction.commonMistakes).toContain(newMistake);
    });

    it('should not add duplicate common mistake', () => {
      const existingMistake = instruction.commonMistakes[0];
      const updatedInstruction = instruction.addCommonMistake(existingMistake);
      
      expect(updatedInstruction.commonMistakes).toHaveLength(2);
      expect(updatedInstruction).toBe(instruction); // No change
    });
  });
});


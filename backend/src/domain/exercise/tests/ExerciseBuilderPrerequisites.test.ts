import { describe, it, expect, beforeEach } from 'vitest';
import { Types } from 'mongoose';
import { ExerciseBuilder } from '../utils/ExerciseBuilder';
import {
  ExerciseType,
  Difficulty,
  MuscleZone
} from '../../../types/fitness/enums/exercise';
import { MediaType } from '../../../types/fitness/enums/media';
import { PrerequisiteCategory } from '../interfaces/ExerciseInterfaces';

describe('ExerciseBuilder Prerequisites Extension', () => {
  let createdBy: Types.ObjectId;
  let prerequisiteExerciseId: Types.ObjectId;

  beforeEach(() => {
    createdBy = new Types.ObjectId();
    prerequisiteExerciseId = new Types.ObjectId();
  });

  describe('Prerequisite Builder Methods', () => {
    it('should add performance prerequisite', () => {
      const exercise = new ExerciseBuilder('Test Exercise', createdBy)
        .withDescription('Exercise with performance prerequisite')
        .withPrimaryMuscles(MuscleZone.CHEST)
        .addPerformancePrerequisite(
          prerequisiteExerciseId,
          PrerequisiteCategory.REPS,
          20,
          'Complete 20 reps with good form',
          true
        )
        .buildDraft();

      expect(exercise.prerequisites).toHaveLength(1);
      expect(exercise.prerequisites[0].category).toBe(PrerequisiteCategory.REPS);
      expect(exercise.prerequisites[0].minRecommended).toBe(20);
      expect(exercise.prerequisites[0].isRequired).toBe(true);
    });

    it('should add stability prerequisite', () => {
      const exercise = new ExerciseBuilder('Advanced Exercise', createdBy)
        .withDescription('Exercise requiring stability')
        .withPrimaryMuscles(MuscleZone.CORE)
        .addStabilityPrerequisite(prerequisiteExerciseId, 30, 'Hold plank for 30 seconds')
        .buildDraft();

      expect(exercise.prerequisites).toHaveLength(1);
      expect(exercise.prerequisites[0].category).toBe(PrerequisiteCategory.HOLD_TIME);
      expect(exercise.prerequisites[0].minRecommended).toBe(30);
      expect(exercise.prerequisites[0].description).toBe('Hold plank for 30 seconds');
    });

    it('should add multiple prerequisite types', () => {
      const exercise = new ExerciseBuilder('Complex Exercise', createdBy)
        .withDescription('Exercise with multiple prerequisites')
        .withPrimaryMuscles(MuscleZone.CHEST, MuscleZone.TRICEPS)
        .addRepsPrerequisite(prerequisiteExerciseId, 15, 'Complete 15 push-ups')
        .addHoldTimePrerequisite(new Types.ObjectId(), 45, 'Hold plank for 45 seconds')
        .addFormPrerequisite(new Types.ObjectId(), 8, 'Achieve form score of 8/10')
        .addDurationPrerequisite(new Types.ObjectId(), 120, 'Exercise for 2 minutes')
        .addWeightPrerequisite(new Types.ObjectId(), 50, 'Handle 50kg resistance')
        .addConsistencyPrerequisite(new Types.ObjectId(), 14, 'Train consistently for 2 weeks')
        .buildDraft();

      expect(exercise.prerequisites).toHaveLength(6);
      
      const categories = exercise.prerequisites.map(p => p.category);
      expect(categories).toContain(PrerequisiteCategory.REPS);
      expect(categories).toContain(PrerequisiteCategory.HOLD_TIME);
      expect(categories).toContain(PrerequisiteCategory.FORM);
      expect(categories).toContain(PrerequisiteCategory.DURATION);
      expect(categories).toContain(PrerequisiteCategory.WEIGHT);
      expect(categories).toContain(PrerequisiteCategory.CONSISTENCY);
    });

    it('should handle media types correctly', () => {
      const exercise = new ExerciseBuilder('Media Exercise', createdBy)
        .withDescription('Exercise with media content')
        .withPrimaryMuscles(MuscleZone.CHEST)
        .withImage('https://example.com/demo.jpg')
        .withVideo('https://example.com/demo.mp4')
        .buildDraft();

      expect(exercise.mediaUrls).toContain('https://example.com/demo.jpg');
      expect(exercise.mediaUrls).toContain('https://example.com/demo.mp4');
      expect(exercise.mediaTypes).toContain(MediaType.IMAGE);
      expect(exercise.mediaTypes).toContain(MediaType.VIDEO);
      expect(exercise.mediaUrls).toHaveLength(2);
      expect(exercise.mediaTypes).toHaveLength(2);
    });

    it('should validate prerequisite limits', () => {
      const builder = new ExerciseBuilder('Over-prerequisite Exercise', createdBy)
        .withDescription('Exercise with too many prerequisites')
        .withPrimaryMuscles(MuscleZone.CHEST);

      // Add more than max prerequisites (10)
      for (let i = 0; i < 12; i++) {
        builder.addRepsPrerequisite(new Types.ObjectId(), 10 + i);
      }

      const validation = builder.validate();
      expect(validation.isValid).toBe(false);
      expect(validation.errors).toContain('Maximum 10 prerequisites allowed');
    });

    it('should build exercise with preset and prerequisites', () => {
      const exercise = ExerciseBuilder.beginnerStrengthExercise('Beginner Push-ups', createdBy)
        .withPrimaryMuscles(MuscleZone.CHEST)
        .addRepsPrerequisite(prerequisiteExerciseId, 5, 'Complete 5 wall push-ups')
        .addFormPrerequisite(prerequisiteExerciseId, 7, 'Maintain good form')
        .build();

      expect(exercise.type).toBe(ExerciseType.STRENGTH);
      expect(exercise.difficulty).toBe(Difficulty.BEGINNER_I);
      expect(exercise.prerequisites).toHaveLength(2);
      expect(exercise.tags).toContain('strength');
      expect(exercise.tags).toContain('beginner');
    });

    it('should allow chaining prerequisite methods', () => {
      const exercise = new ExerciseBuilder('Chained Prerequisites', createdBy)
        .withDescription('Testing method chaining')
        .withPrimaryMuscles(MuscleZone.CORE)
        .addRepsPrerequisite(prerequisiteExerciseId, 10)
        .addHoldTimePrerequisite(prerequisiteExerciseId, 20)
        .addStabilityPrerequisite(prerequisiteExerciseId, 15)
        .buildDraft();

      expect(exercise.prerequisites).toHaveLength(3);
      expect(exercise.name).toBe('Chained Prerequisites');
      expect(exercise.primaryMuscles).toContain(MuscleZone.CORE);
    });

    it('should handle empty media arrays correctly', () => {
      const exercise = new ExerciseBuilder('No Media Exercise', createdBy)
        .withDescription('Exercise without media')
        .withPrimaryMuscles(MuscleZone.CHEST)
        .buildDraft();

      expect(exercise.mediaUrls).toEqual([]);
      expect(exercise.mediaTypes).toEqual([]);
    });

    it('should preserve order of prerequisites', () => {
      const firstId = new Types.ObjectId();
      const secondId = new Types.ObjectId();
      const thirdId = new Types.ObjectId();

      const exercise = new ExerciseBuilder('Ordered Prerequisites', createdBy)
        .withDescription('Testing prerequisite order')
        .withPrimaryMuscles(MuscleZone.CHEST)
        .addRepsPrerequisite(firstId, 5, 'First prerequisite')
        .addHoldTimePrerequisite(secondId, 10, 'Second prerequisite')
        .addFormPrerequisite(thirdId, 7, 'Third prerequisite')
        .buildDraft();

      expect(exercise.prerequisites).toHaveLength(3);
      expect(exercise.prerequisites[0].exerciseId).toEqual(firstId);
      expect(exercise.prerequisites[1].exerciseId).toEqual(secondId);
      expect(exercise.prerequisites[2].exerciseId).toEqual(thirdId);
    });
  });
});
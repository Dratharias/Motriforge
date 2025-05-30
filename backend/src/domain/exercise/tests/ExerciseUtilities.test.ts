import { describe, it, expect, beforeEach } from 'vitest';
import { Types } from 'mongoose';
import { ExerciseBuilder } from '../utils/ExerciseBuilder';
import {
  ExerciseType,
  Difficulty,
  MuscleZone
} from '../../../types/fitness/enums/exercise';
import { MediaType } from '../../../types/fitness/enums/media';
import { ContraindicationType, ContraindicationSeverity } from '../interfaces/ExerciseInterfaces';

describe('Exercise Utilities', () => {
  let createdBy: Types.ObjectId;

  beforeEach(() => {
    createdBy = new Types.ObjectId();
  });

  describe('ExerciseBuilder', () => {
    it('should build basic exercise', () => {
      const exercise = new ExerciseBuilder('Test Exercise', createdBy)
        .withDescription('A test exercise for builder pattern')
        .withType(ExerciseType.STRENGTH)
        .withDifficulty(Difficulty.BEGINNER_I)
        .withPrimaryMuscles(MuscleZone.CHEST, MuscleZone.TRICEPS)
        .withSecondaryMuscles(MuscleZone.SHOULDER)
        .withDuration(15)
        .withCaloriesBurn(5)
        .build();

      expect(exercise.name).toBe('Test Exercise');
      expect(exercise.type).toBe(ExerciseType.STRENGTH);
      expect(exercise.primaryMuscles).toContain(MuscleZone.CHEST);
      expect(exercise.primaryMuscles).toContain(MuscleZone.TRICEPS);
      expect(exercise.estimatedDuration).toBe(15);
      expect(exercise.caloriesBurnedPerMinute).toBe(5);
    });

    it('should build exercise with instructions', () => {
      const exercise = new ExerciseBuilder('Instruction Exercise', createdBy)
        .withDescription('Exercise with detailed instructions')
        .withPrimaryMuscles(MuscleZone.CORE)
        .addInstruction(1, 'Setup', 'Get into starting position')
        .addInstruction(2, 'Execute', 'Perform the movement', {
          duration: 30,
          tips: ['Keep core tight', 'Breathe steadily']
        })
        .addWarmupInstruction('Light cardio for 5 minutes', 5)
        .build();

      expect(exercise.instructions).toHaveLength(3);
      expect(exercise.instructions[0].title).toBe('Setup');
      expect(exercise.instructions[1].tips).toContain('Keep core tight');
    });

    it('should build exercise with progressions', () => {
      const exercise = new ExerciseBuilder('Progressive Exercise', createdBy)
        .withDescription('Exercise with progression path')
        .withDifficulty(Difficulty.BEGINNER_I)
        .withPrimaryMuscles(MuscleZone.CHEST)
        .addProgression(
          Difficulty.BEGINNER_I,
          Difficulty.BEGINNER_II,
          'Increase Reps',
          'Add more repetitions',
          ['Complete 10 reps with good form'],
          ['Increase to 15 reps']
        )
        .addDifficultyProgression(Difficulty.INTERMEDIATE_I, ['Add weight', 'Increase sets'])
        .build();

      expect(exercise.progressions).toHaveLength(2);
      expect(exercise.progressions[0].title).toBe('Increase Reps');
      expect(exercise.progressions[1].toDifficulty).toBe(Difficulty.INTERMEDIATE_I);
    });

    it('should build exercise with contraindications', () => {
      const exercise = new ExerciseBuilder('Safety Exercise', createdBy)
        .withDescription('Exercise with safety considerations')
        .withPrimaryMuscles(MuscleZone.BACK)
        .addMedicalContraindication(['herniated disc', 'acute back pain'], 'May worsen back conditions')
        .addInjuryContraindication(['recent back surgery'], 'Wait for medical clearance')
        .build();

      expect(exercise.contraindications).toHaveLength(2);
      expect(exercise.contraindications[0].type).toBe(ContraindicationType.MEDICAL);
      expect(exercise.contraindications[1].severity).toBe(ContraindicationSeverity.ABSOLUTE);
    });

    it('should build exercise with media', () => {
      const exercise = new ExerciseBuilder('Media Exercise', createdBy)
        .withDescription('Exercise with media content')
        .withPrimaryMuscles(MuscleZone.CHEST)
        .withImage('https://example.com/demo.jpg')
        .withVideo('https://example.com/demo.mp4')
        .build();

      expect(exercise.mediaUrls).toContain('https://example.com/demo.jpg');
      expect(exercise.mediaUrls).toContain('https://example.com/demo.mp4');
      expect(exercise.mediaTypes).toContain(MediaType.IMAGE);
      expect(exercise.mediaTypes).toContain(MediaType.VIDEO);
    });

    it('should validate before building', () => {
      expect(() => {
        new ExerciseBuilder('', createdBy).build();
      }).toThrow();

      expect(() => {
        new ExerciseBuilder('Valid Name', createdBy)
          .withDescription('')
          .build();
      }).toThrow();
    });

    it('should build draft even with validation errors', () => {
      const draft = new ExerciseBuilder('Draft Exercise', createdBy)
        .withDescription('Short')
        .buildDraft();

      expect(draft.isDraft).toBe(true);
      expect(draft.name).toBe('Draft Exercise');
    });

    it('should use preset builders', () => {
      const strengthExercise = ExerciseBuilder.beginnerStrengthExercise('Push-ups', createdBy)
        .withPrimaryMuscles(MuscleZone.CHEST)
        .build();

      expect(strengthExercise.type).toBe(ExerciseType.STRENGTH);
      expect(strengthExercise.difficulty).toBe(Difficulty.BEGINNER_I);
      expect(strengthExercise.tags).toContain('strength');

      const cardioExercise = ExerciseBuilder.cardioExercise('Running', createdBy)
        .withPrimaryMuscles(MuscleZone.CORE)
        .build();

      expect(cardioExercise.type).toBe(ExerciseType.CARDIO);
      expect(cardioExercise.caloriesBurnedPerMinute).toBe(8);

      const rehabExercise = ExerciseBuilder.rehabExercise('Shoulder Rehab', createdBy)
        .withPrimaryMuscles(MuscleZone.SHOULDER)
        .build();

      expect(rehabExercise.type).toBe(ExerciseType.REHABILITATION);
      expect(rehabExercise.contraindications.length).toBeGreaterThan(0);
    });
  });
});
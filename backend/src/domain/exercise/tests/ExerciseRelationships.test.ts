import { describe, it, expect, beforeEach } from 'vitest';
import { Types } from 'mongoose';
import { Exercise } from '../entities/Exercise';
import { ExerciseInstruction } from '../entities/ExerciseInstruction';
import { ExerciseProgression } from '../entities/ExerciseProgression';
import { 
  ExerciseType, 
  Difficulty, 
  MuscleZone
} from '../../../types/fitness/enums/exercise';
import { ContraindicationType, ContraindicationSeverity } from '../interfaces/ExerciseInterfaces';

describe('Exercise Entity Relationships', () => {
  let exercise: Exercise;
  let instruction1: ExerciseInstruction;
  let instruction2: ExerciseInstruction;
  let progression1: ExerciseProgression;
  let progression2: ExerciseProgression;

  beforeEach(() => {
    const exerciseId = new Types.ObjectId();
    const createdBy = new Types.ObjectId();
    const now = new Date();

    exercise = new Exercise({
      id: exerciseId,
      name: 'Push-ups',
      description: 'Classic bodyweight exercise',
      type: ExerciseType.STRENGTH,
      difficulty: Difficulty.BEGINNER_I,
      primaryMuscles: [MuscleZone.CHEST],
      createdAt: now,
      updatedAt: now,
      createdBy,
      isActive: true,
      isDraft: true
    });

    instruction1 = new ExerciseInstruction({
      id: new Types.ObjectId(),
      exerciseId,
      stepNumber: 1,
      title: 'Starting Position',
      description: 'Get into plank position',
      createdAt: now,
      updatedAt: now,
      createdBy,
      isActive: true
    });

    instruction2 = new ExerciseInstruction({
      id: new Types.ObjectId(),
      exerciseId,
      stepNumber: 2,
      title: 'Execute Movement',
      description: 'Lower body and push back up',
      createdAt: now,
      updatedAt: now,
      createdBy,
      isActive: true
    });

    progression1 = new ExerciseProgression({
      id: new Types.ObjectId(),
      exerciseId,
      fromDifficulty: Difficulty.BEGINNER_I,
      toDifficulty: Difficulty.BEGINNER_II,
      title: 'Increase Reps',
      description: 'Add more repetitions',
      criteria: ['Complete current level'],
      modifications: ['Add 5 more reps'],
      createdAt: now,
      updatedAt: now,
      createdBy,
      isActive: true
    });

    progression2 = new ExerciseProgression({
      id: new Types.ObjectId(),
      exerciseId,
      fromDifficulty: Difficulty.BEGINNER_II,
      toDifficulty: Difficulty.INTERMEDIATE_I,
      title: 'Add Complexity',
      description: 'Make exercise more challenging',
      criteria: ['Master previous level'],
      modifications: ['Add elevation', 'Increase tempo'],
      createdAt: now,
      updatedAt: now,
      createdBy,
      isActive: true
    });
  });

  describe('Exercise with Instructions', () => {
    it('should maintain instruction relationships', () => {
      const exerciseWithInstructions = exercise.addInstruction(instruction1).addInstruction(instruction2);
      
      expect(exerciseWithInstructions.instructions).toHaveLength(2);
      expect(exerciseWithInstructions.instructions[0].exerciseId).toBe(exercise.id);
      expect(exerciseWithInstructions.instructions[1].exerciseId).toBe(exercise.id);
    });

    it('should validate exercise with instructions for publication', () => {
      const exerciseWithInstructions = exercise.addInstruction(instruction1);
      const validation = exerciseWithInstructions.validateForPublication();
      
      expect(validation.isValid).toBe(true);
      expect(validation.canPublish()).toBe(true);
    });
  });

  describe('Exercise with Progressions', () => {
    it('should maintain progression relationships', () => {
      const exerciseWithProgressions = exercise.addProgression(progression1).addProgression(progression2);
      
      expect(exerciseWithProgressions.progressions).toHaveLength(2);
      expect(exerciseWithProgressions.progressions[0].exerciseId).toBe(exercise.id);
      expect(exerciseWithProgressions.progressions[1].exerciseId).toBe(exercise.id);
    });

    it('should create logical progression chains', () => {
      const exerciseWithProgressions = exercise.addProgression(progression1).addProgression(progression2);
      
      // First progression: BEGINNER_I -> BEGINNER_II
      expect(exerciseWithProgressions.progressions[0].fromDifficulty).toBe(Difficulty.BEGINNER_I);
      expect(exerciseWithProgressions.progressions[0].toDifficulty).toBe(Difficulty.BEGINNER_II);
      
      // Second progression: BEGINNER_II -> INTERMEDIATE_I
      expect(exerciseWithProgressions.progressions[1].fromDifficulty).toBe(Difficulty.BEGINNER_II);
      expect(exerciseWithProgressions.progressions[1].toDifficulty).toBe(Difficulty.INTERMEDIATE_I);
    });
  });

  describe('Exercise with Contraindications', () => {
    it('should handle contraindications properly', () => {
      const contraindication = {
        id: new Types.ObjectId(),
        type: ContraindicationType.INJURY,
        severity: ContraindicationSeverity.RELATIVE,
        conditions: ['shoulder injury', 'wrist pain'],
        description: 'May aggravate existing conditions',
        alternatives: []
      };

      const exerciseWithContraindications = exercise.addContraindication(contraindication);
      
      expect(exerciseWithContraindications.contraindications).toHaveLength(1);
      expect(exerciseWithContraindications.hasContraindicationsFor(['shoulder injury'])).toBe(true);
    });
  });

  describe('Complete Exercise Entity', () => {
    it('should create complete exercise with all relationships', () => {
      const contraindication = {
        id: new Types.ObjectId(),
        type: ContraindicationType.MEDICAL,
        severity: ContraindicationSeverity.PRECAUTION,
        conditions: ['heart conditions'],
        description: 'Moderate intensity may require monitoring',
        alternatives: []
      };

      const completeExercise = exercise
        .addInstruction(instruction1)
        .addInstruction(instruction2)
        .addProgression(progression1)
        .addProgression(progression2)
        .addContraindication(contraindication);

      expect(completeExercise.instructions).toHaveLength(2);
      expect(completeExercise.progressions).toHaveLength(2);
      expect(completeExercise.contraindications).toHaveLength(1);
      
      const validation = completeExercise.validateForPublication();
      expect(validation.isValid).toBe(true);
    });

    it('should maintain referential integrity across relationships', () => {
      const completeExercise = exercise
        .addInstruction(instruction1)
        .addProgression(progression1);

      // All related entities should reference the same exercise ID
      expect(completeExercise.instructions[0].exerciseId).toBe(completeExercise.id);
      expect(completeExercise.progressions[0].exerciseId).toBe(completeExercise.id);
    });
  });
});


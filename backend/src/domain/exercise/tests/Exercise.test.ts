import { describe, it, expect, beforeEach } from 'vitest';
import { Types } from 'mongoose';
import { Exercise } from '../entities/Exercise';
import { ExerciseInstruction } from '../entities/ExerciseInstruction';
import { ExerciseProgression } from '../entities/ExerciseProgression';
import { 
  ExerciseType, 
  Difficulty, 
  MuscleZone, 
  EquipmentCategory 
} from '../../../types/fitness/enums/exercise';
import { MediaType } from '../../../types/fitness/enums/media';
import { Role } from '../../../types/core/enums';
import { ContraindicationType, ContraindicationSeverity } from '../interfaces/ExerciseInterfaces';

describe('Exercise Entity', () => {
  let exerciseData: any;
  let exercise: Exercise;

  beforeEach(() => {
    exerciseData = {
      id: new Types.ObjectId(),
      name: 'Push-ups',
      description: 'A classic bodyweight exercise targeting chest, shoulders, and triceps',
      type: ExerciseType.STRENGTH,
      difficulty: Difficulty.BEGINNER_I,
      primaryMuscles: [MuscleZone.CHEST, MuscleZone.TRICEPS],
      secondaryMuscles: [MuscleZone.SHOULDER, MuscleZone.CORE],
      equipment: [EquipmentCategory.BODYWEIGHT],
      tags: ['bodyweight', 'upper-body', 'beginner'],
      estimatedDuration: 5,
      caloriesBurnedPerMinute: 4,
      minimumAge: 13,
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: new Types.ObjectId(),
      isActive: true,
      isDraft: true
    };
    exercise = new Exercise(exerciseData);
  });

  describe('Creation and Basic Properties', () => {
    it('should create exercise with all properties', () => {
      expect(exercise.id).toBe(exerciseData.id);
      expect(exercise.name).toBe(exerciseData.name);
      expect(exercise.description).toBe(exerciseData.description);
      expect(exercise.type).toBe(ExerciseType.STRENGTH);
      expect(exercise.difficulty).toBe(Difficulty.BEGINNER_I);
      expect(exercise.primaryMuscles).toEqual([MuscleZone.CHEST, MuscleZone.TRICEPS]);
      expect(exercise.isDraft).toBe(true);
    });

    it('should set default values for optional properties', () => {
      const minimalData = {
        id: new Types.ObjectId(),
        name: 'Test Exercise',
        description: 'Test description',
        type: ExerciseType.CARDIO,
        difficulty: Difficulty.INTERMEDIATE_I,
        primaryMuscles: [MuscleZone.CHEST],
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: new Types.ObjectId(),
        isActive: true
      };

      const minimalExercise = new Exercise(minimalData);
      
      expect(minimalExercise.secondaryMuscles).toEqual([]);
      expect(minimalExercise.equipment).toEqual([]);
      expect(minimalExercise.tags).toEqual([]);
      expect(minimalExercise.estimatedDuration).toBe(5);
      expect(minimalExercise.caloriesBurnedPerMinute).toBe(3);
      expect(minimalExercise.minimumAge).toBe(13);
      expect(minimalExercise.isDraft).toBe(false);
    });
  });

  describe('ICloneable Implementation', () => {
    it('should clone exercise with new ID and draft status', () => {
      const clonedExercise = exercise.clone();
      
      expect(clonedExercise.id).not.toBe(exercise.id);
      expect(clonedExercise.name).toBe(exercise.name);
      expect(clonedExercise.description).toBe(exercise.description);
      expect(clonedExercise.isDraft).toBe(true);
      expect(clonedExercise.publishedAt).toBeUndefined();
      expect(clonedExercise.reviewedBy).toBeUndefined();
    });

    it('should clone with modifications', () => {
      const modifications = {
        name: 'Modified Push-ups',
        difficulty: Difficulty.INTERMEDIATE_I
      };
      
      const clonedExercise = exercise.cloneWithModifications(modifications);
      
      expect(clonedExercise.name).toBe('Modified Push-ups');
      expect(clonedExercise.difficulty).toBe(Difficulty.INTERMEDIATE_I);
      expect(clonedExercise.description).toBe(exercise.description);
      expect(clonedExercise.isDraft).toBe(true);
    });
  });

  describe('IShareable Implementation', () => {
    it('should allow sharing for active published exercises', () => {
      const publishedExercise = new Exercise({
        ...exerciseData,
        isDraft: false,
        publishedAt: new Date()
      });

      const mockUser = {
        id: new Types.ObjectId(),
        email: 'test@example.com',
        role: Role.CLIENT,
        status: 'ACTIVE',
        organization: new Types.ObjectId(),
        createdAt: new Date()
      };

      expect(publishedExercise.canBeSharedWith(mockUser)).toBe(true);
    });

    it('should not allow sharing for draft exercises', () => {
      const mockUser = {
        id: new Types.ObjectId(),
        email: 'test@example.com',
        role: Role.CLIENT,
        status: 'ACTIVE',
        organization: new Types.ObjectId(),
        createdAt: new Date()
      };

      expect(exercise.canBeSharedWith(mockUser)).toBe(false);
    });
  });

  describe('IDraftable Implementation', () => {
    it('should validate for publication with all required fields', () => {
      const instruction = new ExerciseInstruction({
        id: new Types.ObjectId(),
        exerciseId: exercise.id,
        stepNumber: 1,
        title: 'Starting Position',
        description: 'Get into plank position',
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: exercise.createdBy,
        isActive: true
      });

      const exerciseWithInstructions = new Exercise({
        ...exerciseData,
        instructions: [instruction]
      });

      const validation = exerciseWithInstructions.validateForPublication();
      expect(validation.isValid).toBe(true);
      expect(validation.canPublish()).toBe(true);
    });

    it('should fail validation without required fields', () => {
      const invalidExercise = new Exercise({
        ...exerciseData,
        name: '',
        description: 'Short',
        primaryMuscles: [],
        instructions: []
      });

      const validation = invalidExercise.validateForPublication();
      expect(validation.isValid).toBe(false);
      expect(validation.errors.length).toBeGreaterThan(0);
      expect(validation.canPublish()).toBe(false);
    });

    it('should publish exercise when valid', () => {
      const instruction = new ExerciseInstruction({
        id: new Types.ObjectId(),
        exerciseId: exercise.id,
        stepNumber: 1,
        title: 'Starting Position',
        description: 'Get into plank position',
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: exercise.createdBy,
        isActive: true
      });

      const exerciseWithInstructions = new Exercise({
        ...exerciseData,
        instructions: [instruction]
      });

      const publishedExercise = exerciseWithInstructions.publish();
      expect(publishedExercise.isDraft).toBe(false);
      expect(publishedExercise.publishedAt).toBeDefined();
      expect(publishedExercise.isPublished()).toBe(true);
    });

    it('should get draft preview with completion percentage', () => {
      const preview = exercise.getDraftPreview();
      
      expect(preview.completionPercentage).toBeGreaterThan(0);
      expect(preview.missingRequiredFields).toContain('instructions');
      expect(preview.estimatedTimeToComplete).toBeGreaterThan(0);
    });
  });

  describe('Exercise-Specific Methods', () => {
    it('should check if exercise targets muscle', () => {
      expect(exercise.targetsMuscle(MuscleZone.CHEST)).toBe(true);
      expect(exercise.targetsMuscle(MuscleZone.CORE)).toBe(true);
      expect(exercise.targetsMuscle(MuscleZone.BICEPS)).toBe(false);
    });

    it('should check equipment requirements', () => {
      expect(exercise.requiresEquipment(EquipmentCategory.BODYWEIGHT)).toBe(true);
      expect(exercise.requiresEquipment(EquipmentCategory.FREE_WEIGHTS)).toBe(false);
    });

    it('should check age suitability', () => {
      expect(exercise.isSuitableForAge(20)).toBe(true);
      expect(exercise.isSuitableForAge(12)).toBe(false);
      
      const seniorExercise = new Exercise({
        ...exerciseData,
        maximumAge: 65
      });
      expect(seniorExercise.isSuitableForAge(70)).toBe(false);
    });

    it('should calculate estimated calories burned', () => {
      const calories = exercise.getEstimatedCaloriesBurned(10);
      expect(calories).toBe(40); // 4 calories/min * 10 min
    });

    it('should calculate complexity score', () => {
      const complexity = exercise.getComplexityScore();
      expect(complexity).toBeGreaterThan(0);
      expect(typeof complexity).toBe('number');
    });

    it('should check contraindications for conditions', () => {
      const contraindication = {
        id: new Types.ObjectId(),
        type: ContraindicationType.MEDICAL,
        severity: ContraindicationSeverity.ABSOLUTE,
        conditions: ['shoulder injury', 'wrist pain'],
        description: 'May aggravate existing shoulder or wrist conditions',
        alternatives: []
      };

      const exerciseWithContraindications = new Exercise({
        ...exerciseData,
        contraindications: [contraindication]
      });

      expect(exerciseWithContraindications.hasContraindicationsFor(['shoulder injury'])).toBe(true);
      expect(exerciseWithContraindications.hasContraindicationsFor(['back pain'])).toBe(false);
    });
  });

  describe('Update Operations', () => {
    it('should update exercise properties', () => {
      const updates = {
        name: 'Modified Push-ups',
        difficulty: Difficulty.INTERMEDIATE_I,
        estimatedDuration: 8
      };

      const updatedExercise = exercise.update(updates);
      
      expect(updatedExercise.name).toBe('Modified Push-ups');
      expect(updatedExercise.difficulty).toBe(Difficulty.INTERMEDIATE_I);
      expect(updatedExercise.estimatedDuration).toBe(8);
      expect(updatedExercise.description).toBe(exercise.description); // Unchanged
      expect(updatedExercise.updatedAt).not.toBe(exercise.updatedAt);
    });

    it('should add instruction to exercise', () => {
      const instruction = new ExerciseInstruction({
        id: new Types.ObjectId(),
        exerciseId: exercise.id,
        stepNumber: 1,
        title: 'Starting Position',
        description: 'Get into plank position',
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: exercise.createdBy,
        isActive: true
      });

      const updatedExercise = exercise.addInstruction(instruction);
      expect(updatedExercise.instructions).toHaveLength(1);
      expect(updatedExercise.instructions[0]).toBe(instruction);
    });

    it('should add progression to exercise', () => {
      const progression = new ExerciseProgression({
        id: new Types.ObjectId(),
        exerciseId: exercise.id,
        fromDifficulty: Difficulty.BEGINNER_I,
        toDifficulty: Difficulty.BEGINNER_II,
        title: 'Increase Repetitions',
        description: 'Perform more repetitions',
        criteria: ['Complete 10 reps with good form'],
        modifications: ['Increase to 15 reps'],
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: exercise.createdBy,
        isActive: true
      });

      const updatedExercise = exercise.addProgression(progression);
      expect(updatedExercise.progressions).toHaveLength(1);
      expect(updatedExercise.progressions[0]).toBe(progression);
    });
  });

  describe('Status Methods', () => {
    it('should check if exercise is published', () => {
      expect(exercise.isPublished()).toBe(false);
      
      const publishedExercise = new Exercise({
        ...exerciseData,
        isDraft: false,
        publishedAt: new Date()
      });
      expect(publishedExercise.isPublished()).toBe(true);
    });

    it('should check if exercise needs review', () => {
      const unviewedExercise = new Exercise({
        ...exerciseData,
        isDraft: false,
        publishedAt: new Date()
      });
      expect(unviewedExercise.needsReview()).toBe(true);
      
      const reviewedExercise = new Exercise({
        ...exerciseData,
        isDraft: false,
        publishedAt: new Date(),
        reviewedBy: new Types.ObjectId()
      });
      expect(reviewedExercise.needsReview()).toBe(false);
    });
  });
});


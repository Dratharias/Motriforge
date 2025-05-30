import { describe, it, expect, beforeEach } from 'vitest';
import { Types } from 'mongoose';
import { Exercise } from '../entities/Exercise';
import { ExerciseInstruction } from '../entities/ExerciseInstruction';
import {
  ExerciseType,
  Difficulty,
  MuscleZone
} from '../../../types/fitness/enums/exercise';
import { ExerciseValidator } from '../validation/ExerciseValidator';
import { ExercisePublisher, PublishingContext } from '../publishing/ExercisePublisher';

describe('Exercise Publishing System', () => {
  let baseExerciseData: any;
  let validExercise: Exercise;
  let createdBy: Types.ObjectId;
  let validator: ExerciseValidator;
  let publisher: ExercisePublisher;

  beforeEach(() => {
    createdBy = new Types.ObjectId();
    validator = new ExerciseValidator();
    publisher = new ExercisePublisher(validator);

    const now = new Date();
    baseExerciseData = {
      id: new Types.ObjectId(),
      name: 'Test Exercise',
      description: 'A comprehensive test exercise for publishing validation',
      type: ExerciseType.STRENGTH,
      difficulty: Difficulty.BEGINNER_I,
      primaryMuscles: [MuscleZone.CHEST],
      equipment: [],
      tags: ['test'],
      estimatedDuration: 10,
      caloriesBurnedPerMinute: 4,
      createdAt: now,
      updatedAt: now,
      createdBy,
      isActive: true,
      isDraft: false,
      publishedAt: now
    };

    const instruction = new ExerciseInstruction({
      id: new Types.ObjectId(),
      exerciseId: baseExerciseData.id,
      stepNumber: 1,
      title: 'Setup',
      description: 'Proper setup position for exercise execution',
      createdAt: now,
      updatedAt: now,
      createdBy,
      isActive: true,
      isDraft: true
    });

    validExercise = new Exercise({
      ...baseExerciseData,
      instructions: [instruction]
    });
  });

  describe('ExercisePublisher', () => {
    it('should pass compliant exercises', async () => {
      const result = await publisher.evaluateForPublication(validExercise);
      expect(result.canPublish).toBe(true);
      expect(result.blockedBy.length).toBe(0);
    });

    it('should require medical review for rehabilitation exercises', async () => {
      const rehabExercise = new Exercise({
        ...baseExerciseData,
        type: ExerciseType.REHABILITATION
      });

      const result = await publisher.evaluateForPublication(rehabExercise);
      expect(result.requiresApproval).toBe(true);
      expect(result.approvalRequired).toContain('medical_review');
    });

    it('should block exercises with inappropriate content', async () => {
      const inappropriateExercise = new Exercise({
        ...baseExerciseData,
        name: 'Dangerous fucking exercise',
        description: 'This will cure all your problems guaranteed'
      });

      const result = await publisher.evaluateForPublication(inappropriateExercise);
      expect(result.canPublish).toBe(false);
      expect(result.blockedBy).toContain('content_compliance');
    });

    it('should require approval for advanced exercises', async () => {
      const advancedExercise = new Exercise({
        ...baseExerciseData,
        difficulty: Difficulty.MASTER
      });

      const result = await publisher.evaluateForPublication(advancedExercise);
      expect(result.requiresApproval).toBe(true);
      expect(result.approvalRequired).toContain('trainer_approval');
    });

    it('should require approval for public exercises', async () => {
      const context: PublishingContext = {
        publishedBy: createdBy,
        targetAudience: 'PUBLIC'
      };

      const result = await publisher.evaluateForPublication(validExercise, context);
      expect(result.requiresApproval).toBe(true);
      expect(result.approvalRequired).toContain('public_review');
    });

    it('should allow simple exercises without approval', async () => {
      const result = await publisher.evaluateForPublication(validExercise);
      expect(result.canPublish).toBe(true);
      expect(result.requiresApproval).toBe(false);
    });

    it('should get approval requirements', () => {
      const rehabExercise = new Exercise({
        ...baseExerciseData,
        type: ExerciseType.REHABILITATION
      });

      const requirements = publisher.getApprovalRequirements(rehabExercise);
      expect(requirements.requiredRoles.length).toBeGreaterThan(0);
      expect(requirements.reasons).toContain('medical_review');
    });

    it('should provide quick publication check', async () => {
      const canPublish = await publisher.canPublish(validExercise);
      expect(typeof canPublish).toBe('boolean');
    });
  });
});
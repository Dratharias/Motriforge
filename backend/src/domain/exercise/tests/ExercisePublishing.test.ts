import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Types } from 'mongoose';
import { Exercise } from '../entities/Exercise';
import { ExerciseInstruction } from '../entities/ExerciseInstruction';
import {
  ExerciseType,
  Difficulty,
  MuscleZone
} from '../../../types/fitness/enums/exercise';
import { ComplianceChecker } from '../publishing/ComplianceChecker';
import { PublicationApprover } from '../publishing/PublicationApprover';
import { ContentQualityRule } from '../publishing/ContentQualityRule';
import { PublishingEngine } from '../publishing/PublishingEngine';
import { ExerciseValidatorFacade } from '../validation/ExerciseValidatorFacade';
import { PublishingContext } from '../publishing/IPublishingRule';
import { Role } from '../../../types/core/enums';

describe('Exercise Publishing System', () => {
  let baseExerciseData: any;
  let validExercise: Exercise;
  let createdBy: Types.ObjectId;

  beforeEach(() => {
    createdBy = new Types.ObjectId();
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
      isActive: true
    });

    validExercise = new Exercise({
      ...baseExerciseData,
      instructions: [instruction]
    });
  });

  describe('ComplianceChecker', () => {
    let complianceChecker: ComplianceChecker;

    beforeEach(() => {
      complianceChecker = new ComplianceChecker();
    });

    it('should pass compliant exercises', async () => {
      const result = await complianceChecker.evaluate(validExercise);
      expect(result.passed).toBe(true);
      expect(result.blocksPublication).toBe(false);
    });

    it('should require medical review for rehabilitation exercises', async () => {
      const rehabExercise = new Exercise({
        ...baseExerciseData,
        type: ExerciseType.REHABILITATION
      });

      const result = await complianceChecker.evaluate(rehabExercise);
      expect(result.passed).toBe(false);
      expect(result.requiresApproval).toBe(true);
      expect(result.metadata?.requiresMedicalReview).toBe(true);
    });

    it('should block exercises with inappropriate content', async () => {
      const inappropriateExercise = new Exercise({
        ...baseExerciseData,
        name: 'Dangerous fucking exercise',
        description: 'This will cure all your problems guaranteed'
      });

      const result = await complianceChecker.evaluate(inappropriateExercise);
      expect(result.passed).toBe(false);
      expect(result.blocksPublication).toBe(true);
    });

    it('should require safety measures for high-risk exercises', async () => {
      const highRiskExercise = new Exercise({
        ...baseExerciseData,
        type: ExerciseType.SPORTS_SPECIFIC,
        contraindications: []
      });

      const result = await complianceChecker.evaluate(highRiskExercise);
      expect(result.passed).toBe(false);
      expect(result.blocksPublication).toBe(true);
    });
  });

  describe('PublicationApprover', () => {
    let approver: PublicationApprover;

    beforeEach(() => {
      approver = new PublicationApprover();
    });

    it('should not apply to draft exercises', () => {
      const draftExercise = new Exercise({
        ...baseExerciseData,
        isDraft: true
      });

      expect(approver.shouldApply(draftExercise)).toBe(false);
    });

    it('should require approval for rehabilitation exercises', async () => {
      const rehabExercise = new Exercise({
        ...baseExerciseData,
        type: ExerciseType.REHABILITATION
      });

      const result = await approver.evaluate(rehabExercise);
      expect(result.passed).toBe(false);
      expect(result.requiresApproval).toBe(true);
      expect(result.metadata?.requiredApproverRole).toBe(Role.ADMIN);
    });

    it('should require approval for advanced exercises', async () => {
      const advancedExercise = new Exercise({
        ...baseExerciseData,
        difficulty: Difficulty.MASTER
      });

      const result = await approver.evaluate(advancedExercise);
      expect(result.passed).toBe(false);
      expect(result.requiresApproval).toBe(true);
      expect(result.metadata?.requiredApproverRole).toBe(Role.TRAINER);
    });

    it('should require approval for public exercises', async () => {
      const context: PublishingContext = {
        publishedBy: createdBy,
        targetAudience: 'PUBLIC'
      };

      const result = await approver.evaluate(validExercise, context);
      expect(result.passed).toBe(false);
      expect(result.requiresApproval).toBe(true);
    });

    it('should allow simple exercises without approval', async () => {
      const result = await approver.evaluate(validExercise);
      expect(result.passed).toBe(true);
      expect(result.requiresApproval).toBe(false);
    });
  });

  describe('ContentQualityRule', () => {
    let qualityRule: ContentQualityRule;
    let mockValidator: ExerciseValidatorFacade;

    beforeEach(() => {
      mockValidator = {
        validateForPublication: vi.fn(),
        getValidationSummary: vi.fn()
      } as any;
      qualityRule = new ContentQualityRule(mockValidator);
    });

    it('should pass high-quality exercises', async () => {
      vi.mocked(mockValidator.validateForPublication).mockReturnValue({
        isValid: true,
        errors: [],
        warnings: [],
        isDraftValid: true,
        requiredForPublication: [],
        canSaveDraft: () => true,
        canPublish: () => true
      });

      vi.mocked(mockValidator.getValidationSummary).mockReturnValue({
        overallScore: 95,
        validatorResults: [],
        readinessPercentage: 100,
        missingRequirements: []
      });

      const result = await qualityRule.evaluate(validExercise);
      expect(result.passed).toBe(true);
      expect(result.blocksPublication).toBe(false);
    });

    it('should block exercises with validation errors', async () => {
      vi.mocked(mockValidator.validateForPublication).mockReturnValue({
        isValid: false,
        errors: [
          {
            field: 'instructions',
            message: 'Instructions are required',
            code: 'required',
            severity: 'ERROR' as any
          }
        ],
        warnings: [],
        isDraftValid: true,
        requiredForPublication: ['instructions'],
        canSaveDraft: () => true,
        canPublish: () => false
      });

      const result = await qualityRule.evaluate(validExercise);
      expect(result.passed).toBe(false);
      expect(result.blocksPublication).toBe(true);
    });

    it('should require approval for low-quality exercises', async () => {
      vi.mocked(mockValidator.validateForPublication).mockReturnValue({
        isValid: true,
        errors: [],
        warnings: [],
        isDraftValid: true,
        requiredForPublication: [],
        canSaveDraft: () => true,
        canPublish: () => true
      });

      vi.mocked(mockValidator.getValidationSummary).mockReturnValue({
        overallScore: 75,
        validatorResults: [],
        readinessPercentage: 75,
        missingRequirements: ['media']
      });

      const result = await qualityRule.evaluate(validExercise);
      expect(result.passed).toBe(false);
      expect(result.requiresApproval).toBe(true);
      expect(result.blocksPublication).toBe(false);
    });
  });

  describe('PublishingEngine', () => {
    let publishingEngine: PublishingEngine;

    beforeEach(() => {
      publishingEngine = new PublishingEngine();
    });

    it('should evaluate exercises for publication', async () => {
      const result = await publishingEngine.evaluateForPublication(validExercise);
      expect(result.canPublish).toBeDefined();
      expect(result.ruleResults.length).toBeGreaterThan(0);
      expect(result.summary).toBeDefined();
    });

    it('should provide quick publication check', async () => {
      const canPublish = await publishingEngine.canPublish(validExercise);
      expect(typeof canPublish).toBe('boolean');
    });

    it('should get approval requirements', async () => {
      const rehabExercise = new Exercise({
        ...baseExerciseData,
        type: ExerciseType.REHABILITATION
      });

      const requirements = await publishingEngine.getApprovalRequirements(rehabExercise);
      expect(requirements.needsApproval).toBe(true);
      expect(requirements.requiredRoles.length).toBeGreaterThan(0);
    });

    it('should calculate publication readiness', async () => {
      const readiness = await publishingEngine.getPublicationReadiness(validExercise);
      expect(readiness.score).toBeGreaterThanOrEqual(0);
      expect(readiness.score).toBeLessThanOrEqual(100);
      expect(readiness.blockers).toBeGreaterThanOrEqual(0);
      expect(readiness.recommendations).toBeDefined();
    });

    it('should handle rule evaluation errors gracefully', async () => {
      const mockRule = {
        name: 'FailingRule',
        priority: 50,
        shouldApply: () => true,
        evaluate: async () => {
          throw new Error('Rule evaluation failed');
        }
      };

      const engineWithFailingRule = new PublishingEngine([mockRule]);
      const result = await engineWithFailingRule.evaluateForPublication(validExercise);
      expect(result.canPublish).toBe(false);
      expect(result.blockedBy).toContain('FailingRule');
    });
  });

  describe('Publishing Workflow Integration', () => {
    let publishingEngine: PublishingEngine;

    beforeEach(() => {
      publishingEngine = new PublishingEngine();
    });

    it('should handle complete publication workflow', async () => {
      const draftExercise = new Exercise({
        ...baseExerciseData,
        isDraft: true
      });

      const draftResult = await publishingEngine.evaluateForPublication(draftExercise);
      expect(draftResult.ruleResults.length).toBeLessThan(3);

      const publishedExercise = new Exercise({
        ...baseExerciseData,
        isDraft: false
      });

      const publishResult = await publishingEngine.evaluateForPublication(publishedExercise);
      expect(publishResult.ruleResults.length).toBeGreaterThan(0);
    });

    it('should require different approvals for different exercise types', async () => {
      const simpleResult = await publishingEngine.getApprovalRequirements(validExercise);

      const rehabExercise = new Exercise({
        ...baseExerciseData,
        type: ExerciseType.REHABILITATION
      });
      const rehabResult = await publishingEngine.getApprovalRequirements(rehabExercise);

      const advancedExercise = new Exercise({
        ...baseExerciseData,
        difficulty: Difficulty.MASTER
      });
      const advancedResult = await publishingEngine.getApprovalRequirements(advancedExercise);

      expect(rehabResult.requiredRoles).not.toEqual(advancedResult.requiredRoles);
      expect(simpleResult.needsApproval).toBe(false);
      expect(rehabResult.needsApproval).toBe(true);
      expect(advancedResult.needsApproval).toBe(true);
    });

    it('should handle context-dependent publishing rules', async () => {
      const publicContext: PublishingContext = {
        publishedBy: createdBy,
        targetAudience: 'PUBLIC'
      };

      const organizationContext: PublishingContext = {
        publishedBy: createdBy,
        targetAudience: 'ORGANIZATION'
      };

      const publicResult = await publishingEngine.evaluateForPublication(validExercise, publicContext);
      const orgResult = await publishingEngine.evaluateForPublication(validExercise, organizationContext);

      expect(publicResult.requiresApproval).toBe(true);
      expect(orgResult.requiresApproval).toBe(false);
    });
  });
});
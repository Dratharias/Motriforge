import { Types } from 'mongoose';
import { Exercise } from '../entities/Exercise';

/**
 * Result of publishing rule evaluation
 */
export interface PublishingRuleResult {
  readonly passed: boolean;
  readonly ruleName: string;
  readonly message?: string;
  readonly blocksPublication: boolean;
  readonly requiresApproval: boolean;
  readonly metadata?: Record<string, unknown>;
}

/**
 * Interface for exercise publishing rules
 */
export interface IPublishingRule {
  /**
   * Rule identifier
   */
  readonly name: string;
  
  /**
   * Rule execution priority (higher = runs first)
   */
  readonly priority: number;
  
  /**
   * Whether this rule should be applied to the exercise
   */
  shouldApply(exercise: Exercise): boolean;
  
  /**
   * Evaluate the publishing rule
   */
  evaluate(exercise: Exercise, context?: PublishingContext): Promise<PublishingRuleResult>;
}

/**
 * Context for publishing rule evaluation
 */
export interface PublishingContext {
  readonly publishedBy: Types.ObjectId;
  readonly organizationId?: Types.ObjectId;
  readonly targetAudience?: 'PUBLIC' | 'ORGANIZATION' | 'PRIVATE';
  readonly reviewerRequired?: boolean;
  readonly medicalReviewRequired?: boolean;
  readonly metadata?: Record<string, unknown>;
}


import { ValidationResult } from '../../../types/core/behaviors';
import { Exercise } from '../entities/Exercise';

/**
 * Interface for exercise validation strategies
 */
export interface IExerciseValidator {
  /**
   * Validate exercise for the specific concern
   */
  validate(exercise: Exercise): ValidationResult;
  
  /**
   * Get validator priority (higher = runs first)
   */
  readonly priority: number;
  
  /**
   * Get validator name for identification
   */
  readonly name: string;
  
  /**
   * Check if validator should run for this exercise
   */
  shouldValidate(exercise: Exercise): boolean;
}


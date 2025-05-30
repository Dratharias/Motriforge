import { IExerciseValidator } from './IExerciseValidator';
import { ValidationResult, ValidationError, ValidationSeverity, ValidationWarning } from '../../../types/core/behaviors';
import { Exercise } from '../entities/Exercise';
import { ProgressionRules } from '../config/ProgressionRules';
import { ExerciseDefaults } from '../config/ExerciseDefaults';

/**
 * Validates exercise progressions and difficulty paths
 */
export class ProgressionValidator implements IExerciseValidator {
  public readonly priority = 70;
  public readonly name = 'ProgressionValidator';

  shouldValidate(exercise: Exercise): boolean {
    return exercise.progressions.length > 0;
  }

  validate(exercise: Exercise): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];
    const rules = ExerciseDefaults.getValidationRules();

    // Progression count validation
    this.validateProgressionCount(exercise, errors, warnings, rules);
    
    // Progression logic validation
    this.validateProgressionLogic(exercise, errors, warnings);
    
    // Progression safety validation
    this.validateProgressionSafety(exercise, warnings);
    
    // Progression completeness validation
    this.validateProgressionCompleteness(exercise, warnings);

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      isDraftValid: true, // Progressions not critical for drafts
      requiredForPublication: [],
      canSaveDraft: () => true,
      canPublish: () => errors.length === 0
    };
  }

  private validateProgressionCount(exercise: Exercise, errors: ValidationError[], warnings: ValidationWarning[], rules: any): void {
    if (exercise.progressions.length > rules.maxProgressions) {
      errors.push({
        field: 'progressions',
        message: `Cannot have more than ${rules.maxProgressions} progressions`,
        code: 'max_items',
        severity: ValidationSeverity.ERROR
      });
    }

    // Check for reasonable progression count
    if (exercise.progressions.length > 5) {
      warnings.push({
        field: 'progressions',
        message: 'Exercise has many progressions',
        suggestion: 'Consider grouping similar progressions or focusing on key advancement paths'
      });
    }
  }

  private validateProgressionLogic(exercise: Exercise, errors: ValidationError[], warnings: ValidationWarning[]): void {
    for (const progression of exercise.progressions) {
      // Validate difficulty progression logic
      if (!ProgressionRules.isValidProgression(progression.fromDifficulty, progression.toDifficulty)) {
        errors.push({
          field: 'progressions',
          message: `Invalid progression from ${progression.fromDifficulty} to ${progression.toDifficulty}`,
          code: 'invalid_progression',
          severity: ValidationSeverity.ERROR
        });
      }

      // Check progression starting point
      if (progression.fromDifficulty !== exercise.difficulty) {
        warnings.push({
          field: 'progressions',
          message: `Progression starts from ${progression.fromDifficulty} but exercise is ${exercise.difficulty}`,
          suggestion: 'Ensure progression paths align with current exercise difficulty'
        });
      }

      // Validate progression time estimates
      const expectedTime = ProgressionRules.getEstimatedProgressionTime(
        progression.fromDifficulty, 
        progression.toDifficulty
      );
      
      if (Math.abs(progression.estimatedTimeToAchieve - expectedTime) > expectedTime * 0.5) {
        warnings.push({
          field: 'progressions',
          message: `Progression time estimate (${progression.estimatedTimeToAchieve} days) differs significantly from recommended (${expectedTime} days)`,
          suggestion: 'Review time estimate based on difficulty increase'
        });
      }

      // Check for missing criteria
      if (progression.criteria.length === 0) {
        errors.push({
          field: 'progressions',
          message: `Progression "${progression.title}" lacks completion criteria`,
          code: 'missing_criteria',
          severity: ValidationSeverity.ERROR
        });
      }

      // Check for missing modifications
      if (progression.modifications.length === 0) {
        warnings.push({
          field: 'progressions',
          message: `Progression "${progression.title}" lacks specific modifications`,
          suggestion: 'Add specific exercise modifications or parameter changes'
        });
      }
    }

    // Check for progression gaps
    this.validateProgressionPaths(exercise, warnings);
  }

  private validateProgressionSafety(exercise: Exercise, warnings: ValidationWarning[]): void {
    for (const progression of exercise.progressions) {
      if (!ProgressionRules.isProgressionSafe(progression)) {
        warnings.push({
          field: 'progressions',
          message: `Progression "${progression.title}" may have safety concerns`,
          suggestion: 'Review progression difficulty increase and time requirements'
        });
      }

      // Check for overly aggressive progressions
      const difficultyIncrease = progression.getDifficultyIncrease();
      if (difficultyIncrease > 2) {
        warnings.push({
          field: 'progressions',
          message: `Large difficulty jump in progression "${progression.title}"`,
          suggestion: 'Consider breaking into smaller progression steps'
        });
      }

      // Check for insufficient time allowance
      if (progression.estimatedTimeToAchieve < 7) {
        warnings.push({
          field: 'progressions',
          message: `Very short progression timeline for "${progression.title}"`,
          suggestion: 'Allow adequate time for skill and strength development'
        });
      }
    }
  }

  private validateProgressionCompleteness(exercise: Exercise, warnings: ValidationWarning[]): void {
    if (exercise.progressions.length === 0) return;

    // Check for progression ordering
    const orderedProgressions = exercise.progressions.filter(p => p.order !== undefined);
    if (orderedProgressions.length > 0 && orderedProgressions.length !== exercise.progressions.length) {
      warnings.push({
        field: 'progressions',
        message: 'Some progressions lack ordering information',
        suggestion: 'Assign order values to all progressions for clear sequencing'
      });
    }

    // Check for exercise transitions vs modifications
    const exerciseTransitions = exercise.progressions.filter(p => p.isExerciseTransition());
    const modifications = exercise.progressions.filter(p => !p.isExerciseTransition());

    if (exerciseTransitions.length > 0 && modifications.length === 0) {
      warnings.push({
        field: 'progressions',
        message: 'Only exercise transitions provided, no within-exercise progressions',
        suggestion: 'Consider adding progressions that modify the current exercise'
      });
    }

    // Suggest comprehensive progression criteria
    const progressionsWithMinimalCriteria = exercise.progressions.filter(
      p => p.criteria.length < 2
    );
    
    if (progressionsWithMinimalCriteria.length > 0) {
      warnings.push({
        field: 'progressions',
        message: 'Some progressions have minimal completion criteria',
        suggestion: 'Provide multiple objective criteria for progression readiness'
      });
    }
  }

  private validateProgressionPaths(exercise: Exercise, warnings: ValidationWarning[]): void {
    // Group progressions by starting difficulty
    const progressionMap = new Map();
    for (const progression of exercise.progressions) {
      const key = progression.fromDifficulty;
      if (!progressionMap.has(key)) {
        progressionMap.set(key, []);
      }
      progressionMap.get(key).push(progression);
    }

    // Check for missing progression paths
    const currentDifficulty = exercise.difficulty;
    const allowedProgressions = ProgressionRules.getAllowedProgressions(currentDifficulty);
    
    if (allowedProgressions.length > 0 && !progressionMap.has(currentDifficulty)) {
      warnings.push({
        field: 'progressions',
        message: `No progressions available from current difficulty (${currentDifficulty})`,
        suggestion: 'Add progression options for continued advancement'
      });
    }

    // Check for duplicate progression targets
    for (const [fromDifficulty, progressions] of progressionMap) {
      const targetDifficulties = progressions.map((p: { toDifficulty: any; }) => p.toDifficulty);
      const duplicates = targetDifficulties.filter((target: any, index: any) => 
        targetDifficulties.indexOf(target) !== index
      );
      
      if (duplicates.length > 0) {
        warnings.push({
          field: 'progressions',
          message: `Multiple progressions to same difficulty level from ${fromDifficulty}`,
          suggestion: 'Consolidate or differentiate progression options'
        });
      }
    }
  }
}


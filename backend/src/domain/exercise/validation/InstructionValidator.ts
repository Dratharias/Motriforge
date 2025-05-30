import { IExerciseValidator } from './IExerciseValidator';
import { ValidationResult, ValidationError, ValidationSeverity, ValidationWarning } from '../../../types/core/behaviors';
import { Exercise } from '../entities/Exercise';
import { ExerciseDefaults } from '../config/ExerciseDefaults';

/**
 * Validates exercise instructions completeness and quality
 */
export class InstructionValidator implements IExerciseValidator {
  public readonly priority = 80;
  public readonly name = 'InstructionValidator';

  shouldValidate(exercise: Exercise): boolean {
    return !exercise.isDraft; // Only validate instructions for publication
  }

  validate(exercise: Exercise): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];
    const rules = ExerciseDefaults.getValidationRules();

    // Instructions requirement
    this.validateInstructionsPresence(exercise, errors, rules);
    
    // Instructions quality
    this.validateInstructionsQuality(exercise, warnings);
    
    // Instructions order and completeness
    this.validateInstructionsOrder(exercise, errors, warnings);

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      isDraftValid: true, // Instructions not required for drafts
      requiredForPublication: ['instructions'],
      canSaveDraft: () => true,
      canPublish: () => errors.length === 0
    };
  }

  private validateInstructionsPresence(exercise: Exercise, errors: ValidationError[], rules: any): void {
    if (rules.requireInstructionsForPublish && exercise.instructions.length === 0) {
      errors.push({
        field: 'instructions',
        message: 'At least one instruction is required for publication',
        code: 'required',
        severity: ValidationSeverity.ERROR
      });
    }

    if (exercise.instructions.length > rules.maxInstructions) {
      errors.push({
        field: 'instructions',
        message: `Cannot have more than ${rules.maxInstructions} instructions`,
        code: 'max_items',
        severity: ValidationSeverity.ERROR
      });
    }
  }

  private validateInstructionsQuality(exercise: Exercise, warnings: ValidationWarning[]): void {
    // Check for overly short instructions
    const shortInstructions = exercise.instructions.filter(
      instruction => instruction.description.length < 20
    );
    if (shortInstructions.length > 0) {
      warnings.push({
        field: 'instructions',
        message: `${shortInstructions.length} instruction(s) have very short descriptions`,
        suggestion: 'Provide more detailed step-by-step guidance'
      });
    }

    // Check for missing tips on complex exercises
    const instructionsWithoutTips = exercise.instructions.filter(
      instruction => instruction.tips.length === 0
    );
    if (instructionsWithoutTips.length === exercise.instructions.length && 
        exercise.instructions.length > 0) {
      warnings.push({
        field: 'instructions',
        message: 'No instructions have tips or guidance',
        suggestion: 'Consider adding helpful tips for better exercise execution'
      });
    }

    // Check for missing media on complex exercises
    const instructionsWithMedia = exercise.instructions.filter(
      instruction => instruction.hasMedia()
    );
    if (instructionsWithMedia.length === 0 && exercise.instructions.length > 3) {
      warnings.push({
        field: 'instructions',
        message: 'Complex exercise has no visual aids',
        suggestion: 'Consider adding images or videos to key instructions'
      });
    }
  }

  private validateInstructionsOrder(exercise: Exercise, errors: ValidationError[], warnings: ValidationWarning[]): void {
    if (exercise.instructions.length === 0) return;

    // Check for step number gaps
    const stepNumbers = exercise.instructions.map(i => i.stepNumber).sort((a, b) => a - b);
    for (let i = 1; i < stepNumbers.length; i++) {
      if (stepNumbers[i] - stepNumbers[i - 1] > 1) {
        warnings.push({
          field: 'instructions',
          message: 'Step numbers have gaps',
          suggestion: 'Ensure step numbers are sequential for better clarity'
        });
        break;
      }
    }

    // Check for duplicate step numbers
    const duplicateSteps = stepNumbers.filter((step, index) => 
      stepNumbers.indexOf(step) !== index
    );
    if (duplicateSteps.length > 0) {
      errors.push({
        field: 'instructions',
        message: 'Instructions have duplicate step numbers',
        code: 'duplicate_steps',
        severity: ValidationSeverity.ERROR
      });
    }

    // Check for logical instruction flow
    const hasWarmupStep = exercise.instructions.some(i => 
      i.title.toLowerCase().includes('warm') || 
      i.title.toLowerCase().includes('setup')
    );
    
    if (!hasWarmupStep && exercise.instructions.length > 2) {
      warnings.push({
        field: 'instructions',
        message: 'Exercise lacks warm-up or setup instruction',
        suggestion: 'Consider adding a preparation step at the beginning'
      });
    }
  }
}


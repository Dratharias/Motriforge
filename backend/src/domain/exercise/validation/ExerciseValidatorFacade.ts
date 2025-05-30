import { IExerciseValidator } from './IExerciseValidator';
import { ValidationResult, ValidationError, ValidationWarning } from '../../../types/core/behaviors';
import { Exercise } from '../entities/Exercise';
import { BasicInfoValidator } from './BasicInfoValidator';
import { InstructionValidator } from './InstructionValidator';
import { SafetyValidator } from './SafetyValidator';
import { MediaValidator } from './MediaValidator';
import { ProgressionValidator } from './ProgressionValidator';

/**
 * Facade that orchestrates all exercise validation
 */
export class ExerciseValidatorFacade {
  private readonly validators: readonly IExerciseValidator[];

  constructor(validators?: readonly IExerciseValidator[]) {
    this.validators = validators ?? [
      new BasicInfoValidator(),
      new SafetyValidator(),
      new InstructionValidator(),
      new ProgressionValidator(),
      new MediaValidator()
    ];
  }

  /**
   * Validate exercise using all applicable validators
   */
  validateExercise(exercise: Exercise): ValidationResult {
    const allErrors: ValidationError[] = [];
    const allWarnings: ValidationWarning[] = [];
    let overallIsDraftValid = true;
    const requiredFields: string[] = [];

    // Get applicable validators and sort by priority
    const applicableValidators = this.validators
      .filter(validator => validator.shouldValidate(exercise))
      .sort((a, b) => b.priority - a.priority);

    // Run each validator
    for (const validator of applicableValidators) {
      const result = validator.validate(exercise);
      
      allErrors.push(...result.errors);
      allWarnings.push(...result.warnings);
      
      if (!result.isDraftValid) {
        overallIsDraftValid = false;
      }
      
      requiredFields.push(...result.requiredForPublication);
    }

    // Remove duplicate required fields
    const uniqueRequiredFields = [...new Set(requiredFields)];

    return {
      isValid: allErrors.length === 0,
      errors: allErrors,
      warnings: allWarnings,
      isDraftValid: overallIsDraftValid,
      requiredForPublication: uniqueRequiredFields,
      canSaveDraft: () => overallIsDraftValid,
      canPublish: () => allErrors.length === 0
    };
  }

  /**
   * Validate only for draft saving (less strict)
   */
  validateForDraft(exercise: Exercise): ValidationResult {
    // Only run basic validation for drafts
    const draftValidators = this.validators.filter(v => 
      v instanceof BasicInfoValidator || v instanceof SafetyValidator
    );

    const allErrors: ValidationError[] = [];
    const allWarnings: ValidationWarning[] = [];

    for (const validator of draftValidators) {
      if (validator.shouldValidate(exercise)) {
        const result = validator.validate(exercise);
        
        // Only include critical errors for drafts
        const criticalErrors = result.errors.filter(e => 
          e.severity === 'CRITICAL'
        );
        
        allErrors.push(...criticalErrors);
        allWarnings.push(...result.warnings);
      }
    }

    return {
      isValid: allErrors.length === 0,
      errors: allErrors,
      warnings: allWarnings,
      isDraftValid: true,
      requiredForPublication: [],
      canSaveDraft: () => allErrors.length === 0,
      canPublish: () => false // Drafts can't be published without full validation
    };
  }

  /**
   * Validate only for publication (strict validation)
   */
  validateForPublication(exercise: Exercise): ValidationResult {
    return this.validateExercise(exercise);
  }

  /**
   * Get validation summary with statistics
   */
  getValidationSummary(exercise: Exercise): {
    overallScore: number;
    validatorResults: Array<{
      validatorName: string;
      passed: boolean;
      errorCount: number;
      warningCount: number;
    }>;
    readinessPercentage: number;
    missingRequirements: string[];
  } {
    const validatorResults = this.validators
      .filter(validator => validator.shouldValidate(exercise))
      .map(validator => {
        const result = validator.validate(exercise);
        return {
          validatorName: validator.name,
          passed: result.isValid,
          errorCount: result.errors.length,
          warningCount: result.warnings.length
        };
      });

    const totalValidators = validatorResults.length;
    const passedValidators = validatorResults.filter(r => r.passed).length;
    const overallScore = totalValidators > 0 ? (passedValidators / totalValidators) * 100 : 0;

    const fullValidation = this.validateExercise(exercise);
    const totalRequirements = fullValidation.requiredForPublication.length;
    const metRequirements = totalRequirements - fullValidation.errors.filter(e => 
      fullValidation.requiredForPublication.includes(e.field)
    ).length;
    
    const readinessPercentage = totalRequirements > 0 ? 
      (metRequirements / totalRequirements) * 100 : 100;

    return {
      overallScore: Math.round(overallScore),
      validatorResults,
      readinessPercentage: Math.round(readinessPercentage),
      missingRequirements: fullValidation.requiredForPublication.filter(field =>
        fullValidation.errors.some(e => e.field === field)
      )
    };
  }
}
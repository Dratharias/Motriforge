import { Exercise } from '../entities/Exercise';
import { ValidationResult, ValidationError, ValidationWarning, ValidationSeverity } from '../../../types/core/behaviors';
import { ExerciseConfig } from '../config/ExerciseConfig';

interface ValidationStrategy {
  validate(exercise: Exercise): { errors: ValidationError[]; warnings: ValidationWarning[] };
}

class BasicInfoValidation implements ValidationStrategy {
  validate(exercise: Exercise): { errors: ValidationError[]; warnings: ValidationWarning[] } {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];
    const rules = ExerciseConfig.validation;

    // Name validation
    if (!exercise.name?.trim()) {
      errors.push({
        field: 'name', message: 'Exercise name is required', 
        code: 'required', severity: ValidationSeverity.CRITICAL
      });
    } else if (exercise.name.trim().length < rules.nameMinLength) {
      errors.push({
        field: 'name', message: `Exercise name must be at least ${rules.nameMinLength} characters`,
        code: 'min_length', severity: ValidationSeverity.ERROR
      });
    }

    // Description validation
    if (!exercise.description?.trim()) {
      errors.push({
        field: 'description', message: 'Exercise description is required',
        code: 'required', severity: ValidationSeverity.CRITICAL
      });
    } else if (exercise.description.trim().length < rules.descriptionMinLength) {
      errors.push({
        field: 'description', message: `Description must be at least ${rules.descriptionMinLength} characters`,
        code: 'min_length', severity: ValidationSeverity.ERROR
      });
    } else if (exercise.description.length < 50) {
      warnings.push({
        field: 'description', message: 'Description is quite short',
        suggestion: 'Consider adding more detail about proper form and benefits'
      });
    }

    // Primary muscles validation
    if (!exercise.primaryMuscles?.length) {
      errors.push({
        field: 'primaryMuscles', message: 'At least one primary muscle group is required',
        code: 'required', severity: ValidationSeverity.CRITICAL
      });
    }

    return { errors, warnings };
  }
}

class InstructionValidation implements ValidationStrategy {
  validate(exercise: Exercise): { errors: ValidationError[]; warnings: ValidationWarning[] } {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    if (!exercise.isDraft && exercise.instructions.length === 0) {
      errors.push({
        field: 'instructions', message: 'Published exercises require instructions',
        code: 'required', severity: ValidationSeverity.ERROR
      });
    }

    // Check for duplicate step numbers
    const stepNumbers = exercise.instructions.map(i => i.stepNumber);
    const duplicates = stepNumbers.filter((step, index) => stepNumbers.indexOf(step) !== index);
    if (duplicates.length > 0) {
      errors.push({
        field: 'instructions', message: 'Instructions have duplicate step numbers',
        code: 'duplicate_steps', severity: ValidationSeverity.ERROR
      });
    }

    return { errors, warnings };
  }
}

class SafetyValidation implements ValidationStrategy {
  validate(exercise: Exercise): { errors: ValidationError[]; warnings: ValidationWarning[] } {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];
    const safety = ExerciseConfig.safety;

    if (safety.highRiskTypes.includes(exercise.type)) {
      warnings.push({
        field: 'type', message: 'High-risk exercise type requires additional safety considerations',
        suggestion: 'Ensure proper medical disclaimers and supervision requirements'
      });
    }

    if (safety.highRiskDifficulties.includes(exercise.difficulty) && exercise.contraindications.length === 0) {
      warnings.push({
        field: 'contraindications', message: 'Advanced exercises should include contraindications',
        suggestion: 'Add relevant medical or injury contraindications'
      });
    }

    return { errors, warnings };
  }
}

export class ExerciseValidator {
  private readonly strategies: ValidationStrategy[] = [
    new BasicInfoValidation(),
    new InstructionValidation(), 
    new SafetyValidation()
  ];

  validateForDraft(exercise: Exercise): ValidationResult {
    // Only run critical validations for drafts
    const basicValidation = new BasicInfoValidation();
    const { errors, warnings } = basicValidation.validate(exercise);
    
    const criticalErrors = errors.filter(e => e.severity === ValidationSeverity.CRITICAL);
    
    return {
      isValid: criticalErrors.length === 0,
      errors: criticalErrors,
      warnings,
      isDraftValid: true,
      requiredForPublication: ['name', 'description', 'primaryMuscles', 'instructions'],
      canSaveDraft: () => criticalErrors.length === 0,
      canPublish: () => false
    };
  }

  validateForPublication(exercise: Exercise): ValidationResult {
    let allErrors: ValidationError[] = [];
    let allWarnings: ValidationWarning[] = [];

    for (const strategy of this.strategies) {
      const { errors, warnings } = strategy.validate(exercise);
      allErrors = [...allErrors, ...errors];
      allWarnings = [...allWarnings, ...warnings];
    }

    return {
      isValid: allErrors.length === 0,
      errors: allErrors,
      warnings: allWarnings,
      isDraftValid: true,
      requiredForPublication: ['name', 'description', 'primaryMuscles', 'instructions'],
      canSaveDraft: () => true,
      canPublish: () => allErrors.length === 0
    };
  }

  getValidationSummary(exercise: Exercise): {
    overallScore: number;
    readinessPercentage: number;
    missingRequirements: string[];
  } {
    const validation = this.validateForPublication(exercise);
    const totalRequirements = validation.requiredForPublication.length;
    const metRequirements = totalRequirements - validation.errors.filter(e =>
      validation.requiredForPublication.includes(e.field)
    ).length;

    const overallScore = validation.isValid ? 100 : Math.round((metRequirements / totalRequirements) * 100);
    const readinessPercentage = Math.round((metRequirements / totalRequirements) * 100);
    
    return {
      overallScore,
      readinessPercentage,
      missingRequirements: validation.requiredForPublication.filter(field =>
        validation.errors.some(e => e.field === field)
      )
    };
  }
}
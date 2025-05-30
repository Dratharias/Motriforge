import { IExerciseValidator } from './IExerciseValidator';
import { ValidationResult, ValidationError, ValidationSeverity, ValidationWarning } from '../../../types/core/behaviors';
import { Exercise } from '../entities/Exercise';
import { ExerciseDefaults } from '../config/ExerciseDefaults';

export class BasicInfoValidator implements IExerciseValidator {
  public readonly priority = 100;
  public readonly name = 'BasicInfoValidator';

  shouldValidate(exercise: Exercise): boolean {
    return true;
  }

  validate(exercise: Exercise): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];
    const rules = ExerciseDefaults.getValidationRules();

    this.validateName(exercise.name, errors, rules);
    this.validateDescription(exercise.description, errors, warnings, rules);
    this.validateMuscleGroups(exercise, errors, warnings, rules);
    this.validateEquipment(exercise, warnings, rules);
    this.validateInappropriateContent(exercise, errors);

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      isDraftValid: errors.filter(e => e.severity === ValidationSeverity.CRITICAL).length === 0,
      requiredForPublication: ['name', 'description', 'primaryMuscles'],
      canSaveDraft: () => errors.filter(e => e.severity === ValidationSeverity.CRITICAL).length === 0,
      canPublish: () => errors.length === 0
    };
  }

  private validateName(name: string, errors: ValidationError[], rules: any): void {
    if (!name || name.trim().length === 0) {
      errors.push({
        field: 'name',
        message: 'Exercise name is required',
        code: 'required',
        severity: ValidationSeverity.CRITICAL
      });
      return;
    }

    const trimmedName = name.trim();
    if (trimmedName.length < rules.nameMinLength) {
      errors.push({
        field: 'name',
        message: `Exercise name must be at least ${rules.nameMinLength} characters`,
        code: 'min_length',
        severity: ValidationSeverity.ERROR
      });
    }

    if (trimmedName.length > rules.nameMaxLength) {
      errors.push({
        field: 'name',
        message: `Exercise name must be less than ${rules.nameMaxLength} characters`,
        code: 'max_length',
        severity: ValidationSeverity.ERROR
      });
    }
  }

  private validateDescription(description: string, errors: ValidationError[], warnings: ValidationWarning[], rules: any): void {
    if (!description || description.trim().length === 0) {
      errors.push({
        field: 'description',
        message: 'Exercise description is required',
        code: 'required',
        severity: ValidationSeverity.CRITICAL
      });
      return;
    }

    const trimmedDesc = description.trim();
    if (trimmedDesc.length < rules.descriptionMinLength) {
      errors.push({
        field: 'description',
        message: `Exercise description must be at least ${rules.descriptionMinLength} characters`,
        code: 'min_length',
        severity: ValidationSeverity.ERROR
      });
    }

    if (trimmedDesc.length > rules.descriptionMaxLength) {
      errors.push({
        field: 'description',
        message: `Exercise description must be less than ${rules.descriptionMaxLength} characters`,
        code: 'max_length',
        severity: ValidationSeverity.ERROR
      });
    }

    if (trimmedDesc.length < 50) {
      warnings.push({
        field: 'description',
        message: 'Description is quite short',
        suggestion: 'Consider adding more detail about proper form, benefits, or common mistakes'
      });
    }
  }

  private validateMuscleGroups(exercise: Exercise, errors: ValidationError[], warnings: ValidationWarning[], rules: any): void {
    if (!exercise.primaryMuscles || exercise.primaryMuscles.length === 0) {
      errors.push({
        field: 'primaryMuscles',
        message: 'At least one primary muscle group is required',
        code: 'required',
        severity: ValidationSeverity.CRITICAL
      });
    }

    if (exercise.primaryMuscles.length > rules.maxPrimaryMuscles) {
      errors.push({
        field: 'primaryMuscles',
        message: `Cannot have more than ${rules.maxPrimaryMuscles} primary muscle groups`,
        code: 'max_items',
        severity: ValidationSeverity.ERROR
      });
    }

    if (exercise.secondaryMuscles.length > rules.maxSecondaryMuscles) {
      warnings.push({
        field: 'secondaryMuscles',
        message: `Consider limiting secondary muscles to ${rules.maxSecondaryMuscles} or fewer`,
        suggestion: 'Focus on the most relevant secondary muscle groups'
      });
    }

    const overlap = exercise.primaryMuscles.filter(muscle =>
      exercise.secondaryMuscles.includes(muscle)
    );
    if (overlap.length > 0) {
      warnings.push({
        field: 'secondaryMuscles',
        message: 'Some muscles are listed as both primary and secondary',
        suggestion: 'Remove duplicates or adjust muscle group classifications'
      });
    }
  }

  private validateEquipment(exercise: Exercise, warnings: ValidationWarning[], rules: any): void {
    if (exercise.equipment.length > rules.maxEquipment) {
      warnings.push({
        field: 'equipment',
        message: `Consider limiting equipment to ${rules.maxEquipment} items or fewer`,
        suggestion: 'Focus on essential equipment only'
      });
    }
  }

  private validateInappropriateContent(exercise: Exercise, errors: ValidationError[]): void {
    const inappropriatePatterns = [
      /\b(fuck|shit|damn|hell)\b/i,
      /\b(fucking|goddamn|bastard)\b/i
    ];

    const textContent = [
      exercise.name,
      exercise.description,
      ...exercise.instructions.map(i => i.title + ' ' + i.description),
      ...exercise.progressions.map(p => p.title + ' ' + p.description)
    ].join(' ');

    for (const pattern of inappropriatePatterns) {
      if (pattern.test(textContent)) {
        errors.push({
          field: 'name',
          message: 'Exercise content contains inappropriate language',
          code: 'inappropriate_content',
          severity: ValidationSeverity.ERROR
        });
        break;
      }
    }
  }
}


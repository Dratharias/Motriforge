import { IExerciseValidator } from './IExerciseValidator';
import { ValidationResult, ValidationError, ValidationWarning } from '../../../types/core/behaviors';
import { Exercise } from '../entities/Exercise';
import { SafetyGuidelines } from '../config/SafetyGuidelines';
import { ExerciseType, Difficulty } from '../../../types/fitness/enums/exercise';

export class SafetyValidator implements IExerciseValidator {
  public readonly priority = 90;
  public readonly name = 'SafetyValidator';

  shouldValidate(exercise: Exercise): boolean {
    return true;
  }

  validate(exercise: Exercise): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    this.validateHighRiskExercise(exercise, errors, warnings);
    this.validateContraindications(exercise, warnings);
    this.validateDifficultyProgression(exercise, warnings);

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      isDraftValid: true,
      requiredForPublication: [],
      canSaveDraft: () => true,
      canPublish: () => errors.length === 0
    };
  }

  private validateHighRiskExercise(exercise: Exercise, errors: ValidationError[], warnings: ValidationWarning[]): void {
    const highRiskTypes = [ExerciseType.REHABILITATION, ExerciseType.SPORTS_SPECIFIC];
    if (highRiskTypes.includes(exercise.type)) {
      warnings.push({
        field: 'type',
        message: 'High-risk exercise type requires additional safety considerations',
        suggestion: 'Ensure proper medical disclaimers and supervision requirements are documented'
      });
    }

    const highDifficultyLevels = [
      Difficulty.ADVANCED_II,
      Difficulty.ADVANCED_III,
      Difficulty.MASTER
    ];
    if (highDifficultyLevels.includes(exercise.difficulty)) {
      warnings.push({
        field: 'difficulty',
        message: 'Advanced exercise requires safety warnings',
        suggestion: 'Include proper progression requirements and supervision recommendations'
      });
    }

    for (const muscle of exercise.primaryMuscles) {
      const muscleRisks = SafetyGuidelines.getMuscleContraindications(muscle);
      if (muscleRisks.length > 5) {
        warnings.push({
          field: 'primaryMuscles',
          message: `${muscle} exercises have multiple safety considerations`,
          suggestion: 'Review and document relevant contraindications'
        });
      }
    }
  }

  private validateContraindications(exercise: Exercise, warnings: ValidationWarning[]): void {
    if (exercise.contraindications.length === 0) {
      const needsContraindications = [
        ExerciseType.REHABILITATION,
        ExerciseType.SPORTS_SPECIFIC,
        Difficulty.INTERMEDIATE_III,
        Difficulty.ADVANCED_I,
        Difficulty.ADVANCED_II,
        Difficulty.ADVANCED_III,
        Difficulty.MASTER
      ];

      const shouldHaveContraindications = needsContraindications.includes(exercise.type) ||
                                        needsContraindications.includes(exercise.difficulty);

      if (shouldHaveContraindications) {
        warnings.push({
          field: 'contraindications',
          message: 'Exercise may benefit from documented contraindications',
          suggestion: 'Consider adding relevant medical or injury contraindications'
        });
      }
    }

    const absoluteContraindications = exercise.contraindications.filter(
      c => c.severity === 'ABSOLUTE'
    );
    if (absoluteContraindications.length > 0 && exercise.difficulty === Difficulty.BEGINNER_I) {
      warnings.push({
        field: 'contraindications',
        message: 'Beginner exercise has absolute contraindications',
        suggestion: 'Review if contraindications are appropriate for difficulty level'
      });
    }
  }

  private validateDifficultyProgression(exercise: Exercise, warnings: ValidationWarning[]): void {
    const advancedDifficulties = [
      Difficulty.INTERMEDIATE_III,
      Difficulty.ADVANCED_I,
      Difficulty.ADVANCED_II,
      Difficulty.ADVANCED_III,
      Difficulty.MASTER
    ];

    if (advancedDifficulties.includes(exercise.difficulty) &&
        exercise.prerequisites.length === 0) {
      warnings.push({
        field: 'prerequisites',
        message: 'Advanced exercise lacks prerequisite exercises',
        suggestion: 'Consider adding prerequisite exercises for safe progression'
      });
    }

    if (exercise.progressions.length === 0 &&
        exercise.difficulty !== Difficulty.MASTER) {
      warnings.push({
        field: 'progressions',
        message: 'Exercise lacks progression path',
        suggestion: 'Consider adding progression options for continued development'
      });
    }
  }
}


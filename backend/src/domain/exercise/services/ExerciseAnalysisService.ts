import { Types } from 'mongoose';
import { Exercise } from '../entities/Exercise';
import { ExerciseProgression } from '../entities/ExerciseProgression';
import { IExerciseRepository } from '../interfaces/ExerciseInterfaces';
import { Difficulty, MuscleZone, EquipmentCategory } from '../../../types/fitness/enums/exercise';
import { ExerciseConfig } from '../config/ExerciseConfig';

export interface AlternativesOptions {
  excludedEquipment?: readonly EquipmentCategory[];
  medicalConditions?: readonly string[];
  availableTime?: number;
  maxDifficulty?: Difficulty;
  preferredMuscles?: readonly MuscleZone[];
}

export interface DifficultyAssessment {
  overallScore: number;
  suggestedDifficulty: Difficulty;
  reasoning: readonly string[];
}

export interface ProgressionPath {
  path: readonly ExerciseProgression[];
  totalEstimatedDays: number;
  isValid: boolean;
  missingSteps: readonly Difficulty[];
}

export class ExerciseAnalysisService {
  constructor(private readonly repository: IExerciseRepository) {}

  // ========== ALTERNATIVES ==========
  async findAlternatives(originalId: Types.ObjectId, options: AlternativesOptions = {}, limit = 5): Promise<{
    alternatives: readonly Exercise[];
    reasonForEach: readonly string[];
    similarityScores: readonly number[];
  }> {
    const original = await this.repository.findById(originalId);
    if (!original) {
      return { alternatives: [], reasonForEach: [], similarityScores: [] };
    }

    const candidates = await this.repository.findByMuscleGroup(original.primaryMuscles[0], { limit: limit * 3 });
    
    const filtered = candidates.filter(exercise => {
      if (exercise.id === originalId) return false;
      
      // Apply filters
      if (options.excludedEquipment?.length && 
          exercise.equipment.some(eq => options.excludedEquipment!.includes(eq))) {
        return false;
      }

      if (options.medicalConditions?.length && 
          exercise.hasContraindicationsFor(options.medicalConditions)) {
        return false;
      }

      if (options.availableTime && exercise.estimatedDuration > options.availableTime) {
        return false;
      }

      if (options.maxDifficulty && 
          this.getDifficultyLevel(exercise.difficulty) > this.getDifficultyLevel(options.maxDifficulty)) {
        return false;
      }

      return true;
    });

    const ranked = filtered
      .map(exercise => ({
        exercise,
        similarity: this.calculateSimilarity(original, exercise, options),
        reason: this.generateAlternativeReason(original, exercise, options)
      }))
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, limit);

    return {
      alternatives: ranked.map(item => item.exercise),
      reasonForEach: ranked.map(item => item.reason),
      similarityScores: ranked.map(item => item.similarity)
    };
  }

  // ========== DIFFICULTY ASSESSMENT ==========
  assessDifficulty(exercise: Exercise): DifficultyAssessment {
    const components = {
      baseDifficulty: this.getBaseDifficultyScore(exercise.difficulty),
      muscleComplexity: this.calculateMuscleComplexity(exercise),
      equipmentComplexity: this.calculateEquipmentComplexity(exercise),
      instructionComplexity: this.calculateInstructionComplexity(exercise),
      coordinationRequirement: this.calculateCoordinationRequirement(exercise),
      safetyRisk: this.calculateSafetyRisk(exercise)
    };

    const overallScore = Math.round(
      (components.baseDifficulty * 0.3) +
      (components.muscleComplexity * 0.2) +
      (components.equipmentComplexity * 0.15) +
      (components.instructionComplexity * 0.15) +
      (components.coordinationRequirement * 0.1) +
      (components.safetyRisk * 0.1)
    );

    const suggestedDifficulty = this.scoreToDifficulty(overallScore);
    const reasoning = this.generateDifficultyReasoning(exercise, components);

    return { overallScore, suggestedDifficulty, reasoning };
  }

  // ========== PROGRESSION CALCULATION ==========
  calculateProgressionPath(exercise: Exercise, currentDifficulty: Difficulty, targetDifficulty: Difficulty): ProgressionPath {
    const path: ExerciseProgression[] = [];
    const missingSteps: Difficulty[] = [];
    let currentLevel = currentDifficulty;
    let totalDays = 0;
    let isValid = true;

    const config = ExerciseConfig.progression;

    while (currentLevel !== targetDifficulty) {
      const nextProgression = exercise.progressions.find(p => p.fromDifficulty === currentLevel);
      
      if (!nextProgression) {
        const allowedProgressions = config.allowedProgressions[currentLevel] ?? [];
        if (allowedProgressions.length > 0) {
          missingSteps.push(allowedProgressions[0]);
        }
        isValid = false;
        break;
      }

      path.push(nextProgression);
      totalDays += nextProgression.estimatedTimeToAchieve;
      currentLevel = nextProgression.toDifficulty;

      if (path.length > 10) {
        isValid = false;
        break;
      }
    }

    return { path, totalEstimatedDays: totalDays, isValid, missingSteps };
  }

  // ========== PRIVATE HELPERS ==========
  private calculateSimilarity(original: Exercise, candidate: Exercise, preferences?: any): number {
    let score = 0;

    if (original.type === candidate.type) score += 25;

    const commonPrimaryMuscles = original.primaryMuscles.filter(muscle =>
      candidate.primaryMuscles.includes(muscle)
    ).length;
    score += commonPrimaryMuscles * 20;

    const difficultyDifference = Math.abs(
      this.getDifficultyLevel(original.difficulty) - this.getDifficultyLevel(candidate.difficulty)
    );
    score += Math.max(0, 20 - difficultyDifference * 3);

    const durationDifference = Math.abs(original.estimatedDuration - candidate.estimatedDuration);
    score += Math.max(0, 15 - durationDifference);

    if (preferences?.preferredMuscles?.length) {
      const preferredMatch = candidate.primaryMuscles.filter(muscle =>
        preferences.preferredMuscles.includes(muscle)
      ).length;
      score += preferredMatch * 15;
    }

    return score;
  }

  private generateAlternativeReason(original: Exercise, alternative: Exercise, options: any): string {
    const reasons: string[] = [];

    if (options.excludedEquipment?.length) {
      const hasNoExcludedEquipment = !alternative.equipment.some(eq =>
        options.excludedEquipment.includes(eq)
      );
      if (hasNoExcludedEquipment) {
        reasons.push('Uses permitted equipment');
      }
    }

    const commonMuscles = original.primaryMuscles.filter(muscle =>
      alternative.primaryMuscles.includes(muscle)
    );
    if (commonMuscles.length > 0) {
      reasons.push(`Targets ${commonMuscles.join(', ').toLowerCase()}`);
    }

    return reasons.length > 0 ? reasons.join(', ') : 'Similar exercise pattern';
  }

  private getDifficultyLevel(difficulty: Difficulty): number {
    return ExerciseConfig.progression.difficultyLevels[difficulty] ?? 5;
  }

  private getBaseDifficultyScore(difficulty: Difficulty): number {
    return this.getDifficultyLevel(difficulty) * 10;
  }

  private calculateMuscleComplexity(exercise: Exercise): number {
    const primaryCount = exercise.primaryMuscles.length;
    const secondaryCount = exercise.secondaryMuscles.length;
    let score = (primaryCount * 15) + (secondaryCount * 8);
    
    if (primaryCount >= 3) score += 15;
    return Math.min(100, score);
  }

  private calculateEquipmentComplexity(exercise: Exercise): number {
    const equipmentCount = exercise.equipment.length;
    if (equipmentCount === 0 || exercise.equipment.includes(EquipmentCategory.BODYWEIGHT)) {
      return 10;
    }
    return Math.min(100, equipmentCount * 20);
  }

  private calculateInstructionComplexity(exercise: Exercise): number {
    const instructionCount = exercise.instructions.length;
    if (instructionCount === 0) return 10;
    
    let score = Math.min(instructionCount * 8, 60);
    const mediaInstructions = exercise.instructions.filter(i => i.hasMedia()).length;
    if (mediaInstructions > 0) score += 10;
    
    return Math.min(100, score);
  }

  private calculateCoordinationRequirement(exercise: Exercise): number {
    let score = 20;
    const totalMuscles = exercise.primaryMuscles.length + exercise.secondaryMuscles.length;
    score += totalMuscles * 8;
    if (exercise.equipment.length > 1) score += 15;
    return Math.min(100, score);
  }

  private calculateSafetyRisk(exercise: Exercise): number {
    let score = 10;
    const safety = ExerciseConfig.safety;
    
    if (safety.highRiskTypes.includes(exercise.type)) score += 30;
    score += exercise.contraindications.length * 10;
    
    return Math.min(100, score);
  }

  private scoreToDifficulty(score: number): Difficulty {
    if (score <= 15) return Difficulty.BEGINNER_I;
    if (score <= 25) return Difficulty.BEGINNER_II;
    if (score <= 35) return Difficulty.BEGINNER_III;
    if (score <= 45) return Difficulty.INTERMEDIATE_I;
    if (score <= 55) return Difficulty.INTERMEDIATE_II;
    if (score <= 65) return Difficulty.INTERMEDIATE_III;
    if (score <= 75) return Difficulty.ADVANCED_I;
    if (score <= 85) return Difficulty.ADVANCED_II;
    if (score <= 95) return Difficulty.ADVANCED_III;
    return Difficulty.MASTER;
  }

  private generateDifficultyReasoning(exercise: Exercise, components: any): readonly string[] {
    const reasoning: string[] = [];

    if (components.muscleComplexity > 60) {
      reasoning.push('Multi-muscle group exercise increases complexity');
    }
    if (components.equipmentComplexity > 50) {
      reasoning.push('Specialized equipment adds technical requirements');
    }
    if (components.instructionComplexity > 60) {
      reasoning.push('Detailed instructions indicate technical complexity');
    }
    if (components.coordinationRequirement > 70) {
      reasoning.push('High coordination and balance requirements');
    }
    if (components.safetyRisk > 50) {
      reasoning.push('Safety considerations require experience and caution');
    }

    if (reasoning.length === 0) {
      reasoning.push('Straightforward exercise with standard requirements');
    }

    return reasoning;
  }
}
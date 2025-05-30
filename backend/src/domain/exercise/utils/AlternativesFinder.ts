import { Types } from 'mongoose';
import { Exercise } from '../entities/Exercise';
import { IExerciseRepository } from '../interfaces/ExerciseInterfaces';
import {
  Difficulty,
  MuscleZone,
  EquipmentCategory
} from '../../../types/fitness/enums/exercise';

export class AlternativesFinder {
  constructor(private readonly exerciseRepository: IExerciseRepository) {}

  async findAlternativesForLimitations(
    originalExerciseId: Types.ObjectId,
    limitations: {
      excludedEquipment?: readonly EquipmentCategory[];
      medicalConditions?: readonly string[];
      availableTime?: number;
      maxDifficulty?: Difficulty;
      preferredMuscles?: readonly MuscleZone[];
    },
    limit = 5
  ): Promise<{
    alternatives: readonly Exercise[];
    reasonForEach: readonly string[];
    similarityScores: readonly number[];
  }> {
    const originalExercise = await this.exerciseRepository.findById(originalExerciseId);
    if (!originalExercise) {
      return { alternatives: [], reasonForEach: [], similarityScores: [] };
    }

    const candidates = await this.exerciseRepository.findByMuscleGroup(
      originalExercise.primaryMuscles[0],
      { limit: limit * 3 }
    );

    const filteredCandidates = candidates.filter(exercise => {
      if (exercise.id === originalExerciseId) return false;

      if (limitations.excludedEquipment?.length) {
        const hasExcludedEquipment = exercise.equipment.some(eq =>
          limitations.excludedEquipment!.includes(eq)
        );
        if (hasExcludedEquipment) return false;
      }

      if (limitations.medicalConditions?.length) {
        if (exercise.hasContraindicationsFor(limitations.medicalConditions)) {
          return false;
        }
      }

      if (limitations.availableTime !== undefined) {
        if (exercise.estimatedDuration > limitations.availableTime) {
          return false;
        }
      }

      if (limitations.maxDifficulty !== undefined) {
        const exerciseDifficultyLevel = this.getDifficultyLevel(exercise.difficulty);
        const maxDifficultyLevel = this.getDifficultyLevel(limitations.maxDifficulty);
        if (exerciseDifficultyLevel > maxDifficultyLevel) {
          return false;
        }
      }

      return true;
    });

    const rankedAlternatives = filteredCandidates
      .map(exercise => ({
        exercise,
        similarity: this.calculateSimilarity(originalExercise, exercise, limitations),
        reason: this.generateAlternativeReason(originalExercise, exercise, limitations)
      }))
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, limit);

    return {
      alternatives: rankedAlternatives.map(item => item.exercise),
      reasonForEach: rankedAlternatives.map(item => item.reason),
      similarityScores: rankedAlternatives.map(item => item.similarity)
    };
  }

  async findEasierAlternatives(
    originalExerciseId: Types.ObjectId,
    targetDifficulty?: Difficulty,
    limit = 5
  ): Promise<readonly Exercise[]> {
    const originalExercise = await this.exerciseRepository.findById(originalExerciseId);
    if (!originalExercise) return [];

    const maxDifficulty = targetDifficulty ?? this.getEasierDifficulty(originalExercise.difficulty);

    const candidates = await this.exerciseRepository.findByMuscleGroups(
      originalExercise.primaryMuscles,
      originalExercise.secondaryMuscles,
      { limit: limit * 2 }
    );

    return candidates
      .filter(exercise => {
        if (exercise.id === originalExerciseId) return false;
        return this.getDifficultyLevel(exercise.difficulty) <= this.getDifficultyLevel(maxDifficulty);
      })
      .sort((a, b) => this.calculateSimilarity(originalExercise, b) - this.calculateSimilarity(originalExercise, a))
      .slice(0, limit);
  }

  async findBodyweightAlternatives(
    originalExerciseId: Types.ObjectId,
    limit = 5
  ): Promise<readonly Exercise[]> {
    const originalExercise = await this.exerciseRepository.findById(originalExerciseId);
    if (!originalExercise) return [];

    if (originalExercise.equipment.includes(EquipmentCategory.BODYWEIGHT)) {
      return await this.findSimilarExercises(originalExerciseId, limit);
    }

    const bodyweightExercises = await this.exerciseRepository.findBodyweightExercises({
      limit: limit * 2
    });

    return bodyweightExercises
      .filter(exercise => {
        if (exercise.id === originalExerciseId) return false;
        return exercise.primaryMuscles.some(muscle =>
          originalExercise.primaryMuscles.includes(muscle)
        ) || exercise.secondaryMuscles.some(muscle =>
          originalExercise.primaryMuscles.includes(muscle)
        );
      })
      .sort((a, b) => this.calculateSimilarity(originalExercise, b) - this.calculateSimilarity(originalExercise, a))
      .slice(0, limit);
  }

  async findQuickAlternatives(
    originalExerciseId: Types.ObjectId,
    maxDuration: number,
    limit = 5
  ): Promise<readonly Exercise[]> {
    const originalExercise = await this.exerciseRepository.findById(originalExerciseId);
    if (!originalExercise) return [];

    const quickExercises = await this.exerciseRepository.findByDuration(1, maxDuration, {
      limit: limit * 2
    });

    return quickExercises
      .filter(exercise => {
        if (exercise.id === originalExerciseId) return false;
        return exercise.primaryMuscles.some(muscle =>
          originalExercise.primaryMuscles.includes(muscle)
        );
      })
      .sort((a, b) => this.calculateSimilarity(originalExercise, b) - this.calculateSimilarity(originalExercise, a))
      .slice(0, limit);
  }

  async findEquipmentSpecificAlternatives(
    originalExerciseId: Types.ObjectId,
    availableEquipment: readonly EquipmentCategory[],
    limit = 5
  ): Promise<readonly Exercise[]> {
    const originalExercise = await this.exerciseRepository.findById(originalExerciseId);
    if (!originalExercise) return [];

    const equipmentExercises = await this.exerciseRepository.findByEquipmentList(
      availableEquipment,
      false,
      { limit: limit * 2 }
    );

    return equipmentExercises
      .filter(exercise => {
        if (exercise.id === originalExerciseId) return false;
        return exercise.primaryMuscles.some(muscle =>
          originalExercise.primaryMuscles.includes(muscle)
        );
      })
      .sort((a, b) => this.calculateSimilarity(originalExercise, b) - this.calculateSimilarity(originalExercise, a))
      .slice(0, limit);
  }

  async findSimilarExercises(
    originalExerciseId: Types.ObjectId,
    limit = 5
  ): Promise<readonly Exercise[]> {
    return await this.exerciseRepository.findSimilar(originalExerciseId, limit);
  }

  async findProgressiveAlternatives(
    originalExerciseId: Types.ObjectId,
    direction: 'easier' | 'harder',
    steps = 1,
    limit = 3
  ): Promise<readonly Exercise[]> {
    const originalExercise = await this.exerciseRepository.findById(originalExerciseId);
    if (!originalExercise) return [];

    const currentDifficultyLevel = this.getDifficultyLevel(originalExercise.difficulty);
    const targetDifficultyLevel = direction === 'easier' ?
      Math.max(1, currentDifficultyLevel - steps) :
      Math.min(10, currentDifficultyLevel + steps);

    const targetDifficulty = this.levelToDifficulty(targetDifficultyLevel);

    const candidates = await this.exerciseRepository.findByDifficulty(targetDifficulty, {
      limit: limit * 2
    });

    return candidates
      .filter(exercise => {
        if (exercise.id === originalExerciseId) return false;
        return exercise.primaryMuscles.some(muscle =>
          originalExercise.primaryMuscles.includes(muscle)
        );
      })
      .sort((a, b) => this.calculateSimilarity(originalExercise, b) - this.calculateSimilarity(originalExercise, a))
      .slice(0, limit);
  }

  private calculateSimilarity(
    original: Exercise,
    candidate: Exercise,
    preferences?: any
  ): number {
    let score = 0;

    // Type similarity
    if (original.type === candidate.type) score += 25;

    // Primary muscle overlap
    const commonPrimaryMuscles = original.primaryMuscles.filter(muscle =>
      candidate.primaryMuscles.includes(muscle)
    ).length;
    score += commonPrimaryMuscles * 20;

    // Secondary muscle overlap
    const commonSecondaryMuscles = original.secondaryMuscles.filter(muscle =>
      candidate.secondaryMuscles.includes(muscle) || candidate.primaryMuscles.includes(muscle)
    ).length;
    score += commonSecondaryMuscles * 10;

    // Difficulty similarity
    const difficultyDifference = Math.abs(
      this.getDifficultyLevel(original.difficulty) - this.getDifficultyLevel(candidate.difficulty)
    );
    score += Math.max(0, 20 - difficultyDifference * 3);

    // Duration similarity
    const durationDifference = Math.abs(original.estimatedDuration - candidate.estimatedDuration);
    score += Math.max(0, 15 - durationDifference);

    // Preferred muscles bonus
    if (preferences?.preferredMuscles?.length) {
      const preferredMuscleMatch = candidate.primaryMuscles.filter(muscle =>
        preferences.preferredMuscles.includes(muscle)
      ).length;
      score += preferredMuscleMatch * 15;
    }

    return score;
  }

  private generateAlternativeReason(
    original: Exercise,
    alternative: Exercise,
    limitations: any
  ): string {
    const reasons: string[] = [];

    if (limitations.excludedEquipment?.length) {
      const hasNoExcludedEquipment = !alternative.equipment.some(eq =>
        limitations.excludedEquipment.includes(eq)
      );
      if (hasNoExcludedEquipment) {
        reasons.push('Uses permitted equipment');
      }
    }

    if (limitations.maxDifficulty) {
      const isEasier = this.getDifficultyLevel(alternative.difficulty) <
                      this.getDifficultyLevel(original.difficulty);
      if (isEasier) {
        reasons.push('Lower difficulty level');
      }
    }

    if (limitations.availableTime) {
      if (alternative.estimatedDuration <= limitations.availableTime) {
        reasons.push(`Fits in ${limitations.availableTime} minutes`);
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
    const levelMap = {
      [Difficulty.BEGINNER_I]: 1,
      [Difficulty.BEGINNER_II]: 2,
      [Difficulty.BEGINNER_III]: 3,
      [Difficulty.INTERMEDIATE_I]: 4,
      [Difficulty.INTERMEDIATE_II]: 5,
      [Difficulty.INTERMEDIATE_III]: 6,
      [Difficulty.ADVANCED_I]: 7,
      [Difficulty.ADVANCED_II]: 8,
      [Difficulty.ADVANCED_III]: 9,
      [Difficulty.MASTER]: 10
    };
    return levelMap[difficulty] ?? 5;
  }

  private levelToDifficulty(level: number): Difficulty {
    const difficulties = [
      Difficulty.BEGINNER_I,
      Difficulty.BEGINNER_II,
      Difficulty.BEGINNER_III,
      Difficulty.INTERMEDIATE_I,
      Difficulty.INTERMEDIATE_II,
      Difficulty.INTERMEDIATE_III,
      Difficulty.ADVANCED_I,
      Difficulty.ADVANCED_II,
      Difficulty.ADVANCED_III,
      Difficulty.MASTER
    ];
    return difficulties[Math.max(0, Math.min(9, level - 1))] ?? Difficulty.INTERMEDIATE_I;
  }

  private getEasierDifficulty(difficulty: Difficulty): Difficulty {
    const currentLevel = this.getDifficultyLevel(difficulty);
    const easierLevel = Math.max(1, currentLevel - 1);
    return this.levelToDifficulty(easierLevel);
  }
}
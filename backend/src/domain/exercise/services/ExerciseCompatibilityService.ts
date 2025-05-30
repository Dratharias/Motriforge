import { Types } from 'mongoose';
import { Exercise } from '../entities/Exercise';
import {
  IExerciseRepository,
  IExerciseQueryOptions
} from '../interfaces/ExerciseInterfaces';
import {
  Difficulty,
  MuscleZone,
  EquipmentCategory
} from '../../../types/fitness/enums/exercise';
import { SafetyGuidelines } from '../config/SafetyGuidelines';

export class ExerciseCompatibilityService {
  constructor(private readonly exerciseRepository: IExerciseRepository) {}

  async getExercisesForUser(
    userProfile: {
      fitnessLevel?: Difficulty;
      medicalConditions?: readonly string[];
      availableEquipment?: readonly EquipmentCategory[];
      excludeEquipment?: readonly EquipmentCategory[];
      preferredMuscles?: readonly MuscleZone[];
      timeAvailable?: number;
    },
    options?: IExerciseQueryOptions
  ): Promise<readonly Exercise[]> {
    let exercises = await this.exerciseRepository.findPublished(options);

    if (userProfile.fitnessLevel) {
      exercises = this.filterByFitnessLevel(exercises, userProfile.fitnessLevel);
    }

    if (userProfile.medicalConditions?.length) {
      exercises = await this.filterBySafetyConditions(exercises, userProfile.medicalConditions);
    }

    if (userProfile.availableEquipment?.length) {
      exercises = this.filterByAvailableEquipment(exercises, userProfile.availableEquipment);
    }

    if (userProfile.excludeEquipment?.length) {
      exercises = this.filterExcludeEquipment(exercises, userProfile.excludeEquipment);
    }

    if (userProfile.preferredMuscles?.length) {
      exercises = this.filterByMusclePreference(exercises, userProfile.preferredMuscles);
    }

    if (userProfile.timeAvailable) {
      exercises = this.filterByTimeAvailable(exercises, userProfile.timeAvailable);
    }

    return exercises;
  }

  async validateExerciseSafety(
    exerciseId: Types.ObjectId,
    medicalConditions?: readonly string[]
  ): Promise<{
    isSafe: boolean;
    warnings: readonly string[];
    contraindications: readonly string[];
    requiresMedicalClearance: boolean;
    recommendations: readonly string[];
  }> {
    const exercise = await this.exerciseRepository.findById(exerciseId);
    if (!exercise) {
      throw new Error('Exercise not found');
    }

    const safetyResult = SafetyGuidelines.validateExerciseSafety(
      exercise.type,
      exercise.difficulty,
      exercise.primaryMuscles,
      undefined, // age not used for now
      medicalConditions
    );

    const recommendations = this.generateSafetyRecommendations(exercise, medicalConditions);

    return {
      ...safetyResult,
      recommendations
    };
  }

  async findAlternativeExercises(
    originalExerciseId: Types.ObjectId,
    userConditions: readonly string[],
    limit = 5
  ): Promise<readonly Exercise[]> {
    const originalExercise = await this.exerciseRepository.findById(originalExerciseId);
    if (!originalExercise) {
      return [];
    }

    const alternatives = await this.exerciseRepository.findByMuscleGroup(
      originalExercise.primaryMuscles[0],
      { limit: limit * 2 }
    );

    const safeAlternatives = alternatives.filter(exercise =>
      exercise.id !== originalExerciseId &&
      !exercise.hasContraindicationsFor(userConditions)
    );

    return this.sortBySimilarity(safeAlternatives, originalExercise).slice(0, limit);
  }

  async getProgressionPath(
    currentExerciseId: Types.ObjectId,
    userFitnessLevel: Difficulty,
    targetDifficulty?: Difficulty
  ): Promise<readonly Exercise[]> {
    const currentExercise = await this.exerciseRepository.findById(currentExerciseId);
    if (!currentExercise) {
      return [];
    }

    const progressions = currentExercise.progressions.filter(p =>
      p.fromDifficulty === userFitnessLevel
    );

    if (progressions.length === 0) {
      return [];
    }

    const sortedProgressions = progressions.toSorted((a, b) => {
      const diffA = a.getDifficultyIncrease();
      const diffB = b.getDifficultyIncrease();
      if (diffA !== diffB) return diffA - diffB;
      return a.estimatedTimeToAchieve - b.estimatedTimeToAchieve;
    });

    if (targetDifficulty) {
      return sortedProgressions
        .filter(p => p.toDifficulty === targetDifficulty)
        .slice(0, 3) as any;
    }

    return sortedProgressions.slice(0, 3) as any;
  }

  private filterByFitnessLevel(exercises: readonly Exercise[], fitnessLevel: Difficulty): readonly Exercise[] {
    const difficultyOrder = [
      Difficulty.BEGINNER_I, Difficulty.BEGINNER_II, Difficulty.BEGINNER_III,
      Difficulty.INTERMEDIATE_I, Difficulty.INTERMEDIATE_II, Difficulty.INTERMEDIATE_III,
      Difficulty.ADVANCED_I, Difficulty.ADVANCED_II, Difficulty.ADVANCED_III,
      Difficulty.MASTER
    ];

    const userLevelIndex = difficultyOrder.indexOf(fitnessLevel);
    const allowedLevels = difficultyOrder.slice(0, userLevelIndex + 2);

    return exercises.filter(exercise => allowedLevels.includes(exercise.difficulty));
  }

  private async filterBySafetyConditions(
    exercises: readonly Exercise[],
    conditions: readonly string[]
  ): Promise<readonly Exercise[]> {
    return exercises.filter(exercise => !exercise.hasContraindicationsFor(conditions));
  }

  private filterByAvailableEquipment(
    exercises: readonly Exercise[],
    availableEquipment: readonly EquipmentCategory[]
  ): readonly Exercise[] {
    return exercises.filter(exercise =>
      exercise.equipment.every(required => availableEquipment.includes(required))
    );
  }

  private filterExcludeEquipment(
    exercises: readonly Exercise[],
    excludeEquipment: readonly EquipmentCategory[]
  ): readonly Exercise[] {
    return exercises.filter(exercise =>
      !exercise.equipment.some(equipment => excludeEquipment.includes(equipment))
    );
  }

  private filterByMusclePreference(
    exercises: readonly Exercise[],
    preferredMuscles: readonly MuscleZone[]
  ): readonly Exercise[] {
    return exercises.filter(exercise =>
      exercise.primaryMuscles.some(muscle => preferredMuscles.includes(muscle)) ||
      exercise.secondaryMuscles.some(muscle => preferredMuscles.includes(muscle))
    );
  }

  private filterByTimeAvailable(exercises: readonly Exercise[], timeAvailable: number): readonly Exercise[] {
    return exercises.filter(exercise => exercise.estimatedDuration <= timeAvailable);
  }

  private generateSafetyRecommendations(
    exercise: Exercise,
    medicalConditions?: readonly string[]
  ): readonly string[] {
    const recommendations: string[] = [];

    if (exercise.difficulty === Difficulty.BEGINNER_I) {
      recommendations.push('Focus on proper form over intensity');
    } else if (exercise.difficulty >= Difficulty.INTERMEDIATE_I) {
      recommendations.push('Ensure mastery of prerequisite exercises');
    }

    if (exercise.equipment.length > 0) {
      recommendations.push('Verify proper equipment setup before starting');
    }

    if (medicalConditions && medicalConditions.length > 0) {
      recommendations.push('Consult with healthcare provider if you have medical concerns');
    }

    return recommendations;
  }

  private sortBySimilarity(exercises: readonly Exercise[], reference: Exercise): readonly Exercise[] {
    return exercises
      .map(exercise => ({
        exercise,
        similarity: this.calculateSimilarity(exercise, reference)
      }))
      .sort((a, b) => b.similarity - a.similarity)
      .map(item => item.exercise);
  }

  private calculateSimilarity(exercise1: Exercise, exercise2: Exercise): number {
    let score = 0;

    if (exercise1.type === exercise2.type) score += 30;

    const difficultyDifference = Math.abs(
      this.getDifficultyNumber(exercise1.difficulty) -
      this.getDifficultyNumber(exercise2.difficulty)
    );
    score += Math.max(0, 20 - difficultyDifference * 5);

    const commonPrimaryMuscles = exercise1.primaryMuscles.filter(muscle =>
      exercise2.primaryMuscles.includes(muscle)
    ).length;
    score += commonPrimaryMuscles * 25;

    const commonEquipment = exercise1.equipment.filter(eq =>
      exercise2.equipment.includes(eq)
    ).length;
    score += commonEquipment * 15;

    const durationDifference = Math.abs(exercise1.estimatedDuration - exercise2.estimatedDuration);
    score += Math.max(0, 10 - durationDifference);

    return score;
  }

  private getDifficultyNumber(difficulty: Difficulty): number {
    const difficultyMap = {
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
    return difficultyMap[difficulty] ?? 5;
  }
}
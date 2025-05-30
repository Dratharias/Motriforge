import { Types } from 'mongoose';
import { Exercise } from '../entities/Exercise';
import { ExerciseProgression } from '../entities/ExerciseProgression';
import { Difficulty, MuscleZone, EquipmentCategory } from '../../../types/fitness/enums/exercise';
import { ExerciseConfig } from '../config/ExerciseConfig';
import {
  IUserPerformance,
  IPrerequisiteStatus,
  IRecommendationCriteria,
  IRecommendationResult,
  IPrerequisiteReadiness,
  PrerequisiteCategory,
  PrerequisiteAssessment,
  IExerciseRepository
} from '../interfaces/ExerciseInterfaces';

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

export type performanceQuality = 'poor' | 'fair' | 'good' | 'excellent'
export type dataFreshnessThresholds = 'current' | 'recent' | 'dated' | 'stale'

export class ExerciseAnalysisService {
  constructor(private readonly repository: IExerciseRepository) {}

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

  assessDifficulty(exercise: Exercise): DifficultyAssessment {
    const components = {
      baseDifficulty: this.getBaseDifficultyScore(exercise.difficulty),
      muscleComplexity: this.calculateMuscleComplexity(exercise),
      equipmentComplexity: this.calculateEquipmentComplexity(exercise),
      instructionComplexity: this.calculateInstructionComplexity(exercise),
      coordinationRequirement: this.calculateCoordinationRequirement(exercise),
      safetyRisk: this.calculateSafetyRisk(exercise),
      prerequisiteComplexity: this.calculatePrerequisiteComplexity(exercise)
    };

    const overallScore = Math.round(
      (components.baseDifficulty * 0.25) +
      (components.muscleComplexity * 0.15) +
      (components.equipmentComplexity * 0.1) +
      (components.instructionComplexity * 0.1) +
      (components.coordinationRequirement * 0.1) +
      (components.safetyRisk * 0.1) +
      (components.prerequisiteComplexity * 0.2)
    );

    const suggestedDifficulty = this.scoreToDifficulty(overallScore);
    const reasoning = this.generateDifficultyReasoning(exercise, components);

    return { overallScore, suggestedDifficulty, reasoning };
  }

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

  async getRecommendedExercises(
    userPerformances: readonly IUserPerformance[],
    criteria: IRecommendationCriteria,
    options?: { limit?: number; offset?: number }
  ): Promise<IRecommendationResult> {
    const limit = options?.limit ?? 20;
    const exercises = await this.repository.findPublished({ limit: limit * 2 });

    const scoredExercises = exercises.map(exercise => ({
      exercise,
      score: this.calculateRecommendationScore(exercise, userPerformances, criteria),
      prerequisiteStatuses: exercise.checkPrerequisites(userPerformances),
      readiness: exercise.getPrerequisiteReadiness(userPerformances) / 100
    }));

    const filtered = scoredExercises.filter(item => {
      if (criteria.prerequisiteMode === 'strict' && !item.exercise.isRecommendedFor(userPerformances)) {
        return false;
      }

      if (criteria.readinessThreshold && item.readiness < criteria.readinessThreshold / 100) {
        return false;
      }

      return item.score > 0;
    });

    filtered.sort((a, b) => b.score - a.score);

    const recommended: Exercise[] = [];
    const nearlyReady: Exercise[] = [];
    const futureGoals: Exercise[] = [];
    const scores: number[] = [];
    const reasons: string[] = [];
    const prerequisiteGaps: IPrerequisiteStatus[][] = [];

    const thresholds = ExerciseConfig.prerequisites.recommendationThresholds;

    filtered.slice(0, limit).forEach(item => {
      const readinessPercentage = item.readiness * 100;

      if (readinessPercentage >= thresholds.immediate) {
        recommended.push(item.exercise);
      } else if (readinessPercentage >= thresholds.nearTerm) {
        nearlyReady.push(item.exercise);
      } else if (readinessPercentage >= thresholds.longTerm) {
        futureGoals.push(item.exercise);
      }

      scores.push(item.score);
      reasons.push(this.generateRecommendationReason(item.exercise, item.readiness, criteria));
      prerequisiteGaps.push(item.prerequisiteStatuses.filter(status => !status.isMet));
    });

    return {
      recommended,
      nearlyReady,
      futureGoals,
      scores,
      reasons,
      prerequisiteGaps,
      progressionSuggestions: this.generateProgressionSuggestions(nearlyReady, userPerformances),
      estimatedReadinessDays: this.estimateReadinessDays(futureGoals, userPerformances)
    };
  }

  evaluatePrerequisiteReadiness(
    exercise: Exercise,
    userPerformances: readonly IUserPerformance[]
  ): IPrerequisiteReadiness {
    if (!exercise.hasPrerequisites()) {
      return {
        exerciseId: exercise.id,
        overallReadiness: 100,
        categoryReadiness: {
          [PrerequisiteCategory.REPS]: 100,
          [PrerequisiteCategory.HOLD_TIME]: 100,
          [PrerequisiteCategory.FORM]: 100,
          [PrerequisiteCategory.DURATION]: 100,
          [PrerequisiteCategory.WEIGHT]: 100,
          [PrerequisiteCategory.CONSISTENCY]: 100
        },
        readyPrerequisites: [],
        nearlyReadyPrerequisites: [],
        missingPrerequisites: [],
        improvementPlan: []
      };
    }

    const prerequisiteStatuses = exercise.checkPrerequisites(userPerformances);

    const categoryReadiness: Record<PrerequisiteCategory, number> = {
      [PrerequisiteCategory.REPS]: 0,
      [PrerequisiteCategory.HOLD_TIME]: 0,
      [PrerequisiteCategory.FORM]: 0,
      [PrerequisiteCategory.DURATION]: 0,
      [PrerequisiteCategory.WEIGHT]: 0,
      [PrerequisiteCategory.CONSISTENCY]: 0
    };

    const readyPrerequisites: Types.ObjectId[] = [];
    const nearlyReadyPrerequisites: Types.ObjectId[] = [];
    const missingPrerequisites: Types.ObjectId[] = [];

    prerequisiteStatuses.forEach(status => {
      const category = status.prerequisite.category;
      categoryReadiness[category] = Math.max(categoryReadiness[category], status.readinessScore);

      if (status.isMet) {
        readyPrerequisites.push(status.prerequisite.exerciseId);
      } else if (status.readinessScore >= 70) {
        nearlyReadyPrerequisites.push(status.prerequisite.exerciseId);
      } else {
        missingPrerequisites.push(status.prerequisite.exerciseId);
      }
    });

    const overallReadiness = exercise.getPrerequisiteReadiness(userPerformances);
    const improvementPlan = this.generateImprovementPlan(prerequisiteStatuses);

    return {
      exerciseId: exercise.id,
      overallReadiness: Math.round(overallReadiness),
      categoryReadiness,
      readyPrerequisites,
      nearlyReadyPrerequisites,
      missingPrerequisites,
      improvementPlan
    };
  }

  private calculateRecommendationScore(
    exercise: Exercise,
    userPerformances: readonly IUserPerformance[],
    criteria: IRecommendationCriteria
  ): number {
    return exercise.getRecommendationScore(userPerformances, criteria);
  }

  private assessPrerequisiteFulfillment(
    prerequisites: readonly any[],
    userPerformances: readonly IUserPerformance[]
  ): PrerequisiteAssessment {
    if (prerequisites.length === 0) {
      return {
        isMet: true,
        score: 100,
        confidence: 100,
        dataQuality: 'excellent',
        freshness: 'current'
      };
    }

    const assessments = prerequisites.map(prerequisite => {
      const userPerformance = userPerformances.find(p =>
        p.exerciseId.toString() === prerequisite.exerciseId.toString()
      );

      if (!userPerformance) {
        return {
          isMet: false,
          score: 0,
          confidence: 0,
          dataQuality: 'poor' as const,
          freshness: 'stale' as const
        };
      }

      let fulfillmentScore = 0;
      switch (prerequisite.category) {
        case PrerequisiteCategory.REPS: {
          const userReps = userPerformance.bestReps ?? 0;
          fulfillmentScore = Math.min(100, (userReps / prerequisite.minRecommended) * 100);
          break;
        }
        case PrerequisiteCategory.HOLD_TIME: {
          const userHoldTime = userPerformance.bestHoldTime ?? 0;
          fulfillmentScore = Math.min(100, (userHoldTime / prerequisite.minRecommended) * 100);
          break;
        }
        case PrerequisiteCategory.DURATION: {
          const userDuration = userPerformance.bestDuration ?? 0;
          fulfillmentScore = Math.min(100, (userDuration / prerequisite.minRecommended) * 100);
          break;
        }
        case PrerequisiteCategory.WEIGHT: {
          const userWeight = userPerformance.bestWeight ?? 0;
          fulfillmentScore = Math.min(100, (userWeight / prerequisite.minRecommended) * 100);
          break;
        }
        case PrerequisiteCategory.FORM: {
          const userForm = userPerformance.formQuality ?? 0;
          fulfillmentScore = Math.min(100, (userForm / prerequisite.minRecommended) * 100);
          break;
        }
        case PrerequisiteCategory.CONSISTENCY: {
          const userConsistency = userPerformance.consistentDays ?? 0;
          fulfillmentScore = Math.min(100, (userConsistency / prerequisite.minRecommended) * 100);
          break;
        }
      }

      const daysSinceLastPerformed = userPerformance.lastPerformed ?
        Math.floor((Date.now() - userPerformance.lastPerformed.getTime()) / (1000 * 60 * 60 * 24)) : 30;

      const confidence = ExerciseConfig.calculateConfidence(
        userPerformance.totalSessions ?? 0,
        daysSinceLastPerformed,
        userPerformance.formQuality ?? 0
      );

      const freshness = this.determineFreshness(daysSinceLastPerformed);
      const dataQuality = this.determineDataQuality(userPerformance);

      return {
        isMet: fulfillmentScore >= 100,
        score: fulfillmentScore,
        confidence,
        dataQuality,
        freshness
      };
    });

    const overallScore = assessments.reduce((sum, a) => sum + a.score, 0) / assessments.length;
    const averageConfidence = assessments
      .map(a => a.confidence)
      .filter((c): c is number => typeof c === 'number')
      .reduce((sum, c) => sum + c, 0) / assessments.length;

    const isMet = assessments.every(a => a.isMet);

    return {
      isMet,
      score: Math.round(overallScore),
      confidence: Math.round(averageConfidence),
      dataQuality: this.getWorstDataQuality(assessments.map(a => a.dataQuality)),
      freshness: this.getWorstFreshness(assessments.map(a => a.freshness))
    };
  }

  private generateRecommendationReason(
    exercise: Exercise,
    readiness: number,
    criteria: IRecommendationCriteria
  ): string {
    const reasons: string[] = [];

    if (readiness >= 0.9) {
      reasons.push('You meet all prerequisites');
    } else if (readiness >= 0.7) {
      reasons.push('You\'re almost ready - minor gaps in prerequisites');
    } else if (readiness >= 0.5) {
      reasons.push('Good foundation - some prerequisite work needed');
    } else {
      reasons.push('Future goal - significant prerequisite development needed');
    }

    if (criteria.preferredMuscles?.length) {
      const matchingMuscles = exercise.primaryMuscles.filter(muscle =>
        criteria.preferredMuscles!.includes(muscle)
      );
      if (matchingMuscles.length > 0) {
        reasons.push(`Targets preferred muscle groups: ${matchingMuscles.join(', ')}`);
      }
    }

    if (criteria.availableTime && exercise.estimatedDuration <= criteria.availableTime) {
      reasons.push(`Fits your time constraint (${exercise.estimatedDuration} min)`);
    }

    return reasons.join('; ');
  }

  private generateProgressionSuggestions(
    nearlyReadyExercises: readonly Exercise[],
    userPerformances: readonly IUserPerformance[]
  ): readonly string[] {
    const suggestions: string[] = [];

    nearlyReadyExercises.forEach(exercise => {
      const prerequisiteStatuses = exercise.checkPrerequisites(userPerformances);
      const unmetStatuses = prerequisiteStatuses.filter(status => !status.isMet);

      if (unmetStatuses.length > 0) {
        const firstUnmet = unmetStatuses[0];
        if (firstUnmet.estimatedTimeToMeet && firstUnmet.estimatedTimeToMeet <= 30) {
          suggestions.push(
            `Focus on ${firstUnmet.prerequisite.exerciseName ?? 'prerequisite exercise'} ` +
            `to unlock ${exercise.name} in ~${firstUnmet.estimatedTimeToMeet} days`
          );
        }
      }
    });

    return suggestions.slice(0, 5);
  }

  private estimateReadinessDays(
    futureGoalExercises: readonly Exercise[],
    userPerformances: readonly IUserPerformance[]
  ): readonly number[] {
    return futureGoalExercises.map(exercise => {
      const prerequisiteStatuses = exercise.checkPrerequisites(userPerformances);
      const unmetStatuses = prerequisiteStatuses.filter(status => !status.isMet);

      if (unmetStatuses.length === 0) return 0;

      const maxEstimate = Math.max(
        ...unmetStatuses.map(status => status.estimatedTimeToMeet ?? 90)
      );

      return Math.min(maxEstimate, 180);
    });
  }

  private generateImprovementPlan(prerequisiteStatuses: readonly IPrerequisiteStatus[]): readonly {
    category: PrerequisiteCategory;
    targetExercises: readonly Types.ObjectId[];
    estimatedDays: number;
    priority: number;
  }[] {
    const unmetStatuses = prerequisiteStatuses.filter(status => !status.isMet);
    const categoryGroups: Record<PrerequisiteCategory, any[]> = {} as any;

    unmetStatuses.forEach(status => {
      const category = status.prerequisite.category;
      categoryGroups[category] ??= [];
      categoryGroups[category].push(status);
    });

    return Object.entries(categoryGroups).map(([category, statuses]) => {
      const targetExercises = statuses.map(s => s.prerequisite.exerciseId);
      const estimatedDays = Math.max(...statuses.map(s => s.estimatedTimeToMeet ?? 30));
      const priority = this.calculateCategoryPriority(category as PrerequisiteCategory, statuses);

      return {
        category: category as PrerequisiteCategory,
        targetExercises,
        estimatedDays,
        priority
      };
    }).sort((a, b) => b.priority - a.priority);
  }

  private calculateCategoryPriority(category: PrerequisiteCategory, statuses: any[]): number {
    const weights = ExerciseConfig.prerequisites.categoryWeights;
    const categoryWeight = weights[category] ?? 1.0;
    const requiredCount = statuses.filter(s => s.prerequisite.isRequired).length;
    const averageProgress = statuses.reduce((sum, s) => sum + s.progress, 0) / statuses.length;

    return Math.round(categoryWeight * 100 + requiredCount * 20 + (100 - averageProgress));
  }

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

  private calculatePrerequisiteComplexity(exercise: Exercise): number {
    if (!exercise.hasPrerequisites()) return 0;

    let score = exercise.prerequisites.length * 10;

    const requiredCount = exercise.prerequisites.filter(p => p.isRequired).length;
    score += requiredCount * 5;

    const categories = new Set(exercise.prerequisites.map(p => p.category));
    score += categories.size * 5;

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

    if (components.prerequisiteComplexity > 10) {
      reasoning.push('Significant prerequisite requirements increase complexity');
    }

    if (reasoning.length === 0) {
      reasoning.push('Straightforward exercise with standard requirements');
    }

    return reasoning;
  }

  private determineFreshness(daysSinceLastPerformed: number): dataFreshnessThresholds {
    const thresholds = ExerciseConfig.prerequisites.dataFreshnessThresholds;

    if (daysSinceLastPerformed <= thresholds.current) return 'current';
    if (daysSinceLastPerformed <= thresholds.recent) return 'recent';
    if (daysSinceLastPerformed <= thresholds.dated) return 'dated';
    return 'stale';
  }

  private determineDataQuality(userPerformance: IUserPerformance): performanceQuality {
    const sessions = userPerformance.totalSessions ?? 0;
    const hasMultipleMetrics = [
      userPerformance.bestReps,
      userPerformance.bestSets,
      userPerformance.bestDuration,
      userPerformance.formQuality
    ].filter(Boolean).length;

    if (sessions >= 10 && hasMultipleMetrics >= 3) return 'excellent';
    if (sessions >= 5 && hasMultipleMetrics >= 2) return 'good';
    if (sessions >= 3 && hasMultipleMetrics >= 1) return 'fair';
    return 'poor';
  }

  private getWorstDataQuality(qualities: readonly (performanceQuality)[]): performanceQuality {
    if (qualities.includes('poor')) return 'poor';
    if (qualities.includes('fair')) return 'fair';
    if (qualities.includes('good')) return 'good';
    return 'excellent';
  }

  private getWorstFreshness(freshnesses: readonly (dataFreshnessThresholds)[]): dataFreshnessThresholds {
    if (freshnesses.includes('stale')) return 'stale';
    if (freshnesses.includes('dated')) return 'dated';
    if (freshnesses.includes('recent')) return 'recent';
    return 'current';
  }
}
import { Exercise } from '../entities/Exercise';
import { ExerciseProgression } from '../entities/ExerciseProgression';
import { Difficulty } from '../../../types/fitness/enums/exercise';
import { ProgressionRules } from '../config/ProgressionRules';

/**
 * Calculator for exercise progression paths and difficulty assessments
 */
export class ProgressionCalculator {
  
  /**
   * Calculate optimal progression path from current to target difficulty
   */
  static calculateProgressionPath(
    exercise: Exercise,
    currentDifficulty: Difficulty,
    targetDifficulty: Difficulty
  ): {
    path: readonly ExerciseProgression[];
    totalEstimatedDays: number;
    isValid: boolean;
    missingSteps: readonly Difficulty[];
  } {
    const availableProgressions = exercise.progressions;
    const path: ExerciseProgression[] = [];
    const missingSteps: Difficulty[] = [];
    
    let currentLevel = currentDifficulty;
    let totalDays = 0;
    let isValid = true;

    while (currentLevel !== targetDifficulty) {
      const nextProgression = availableProgressions.find(p => 
        p.fromDifficulty === currentLevel
      );

      if (!nextProgression) {
        const allowedProgressions = ProgressionRules.getAllowedProgressions(currentLevel);
        if (allowedProgressions.length > 0) {
          missingSteps.push(allowedProgressions[0]);
        }
        isValid = false;
        break;
      }

      path.push(nextProgression);
      totalDays += nextProgression.estimatedTimeToAchieve;
      currentLevel = nextProgression.toDifficulty;

      // Prevent infinite loops
      if (path.length > 10) {
        isValid = false;
        break;
      }
    }

    return {
      path,
      totalEstimatedDays: totalDays,
      isValid,
      missingSteps
    };
  }

  /**
   * Calculate progression difficulty score
   */
  static calculateProgressionDifficulty(progression: ExerciseProgression): {
    difficultyScore: number;
    safetyScore: number;
    timeScore: number;
    overallScore: number;
  } {
    const difficultyIncrease = progression.getDifficultyIncrease();
    
    // Difficulty score (1-10, higher = more challenging)
    const difficultyScore = Math.min(10, difficultyIncrease * 2);
    
    // Safety score (1-10, higher = safer)
    let safetyScore = 10;
    if (difficultyIncrease > 2) safetyScore -= 3;
    if (progression.criteria.length < 2) safetyScore -= 2;
    if (progression.estimatedTimeToAchieve < 7) safetyScore -= 2;
    if (progression.isMajorProgression()) safetyScore -= 1;
    
    // Time score (1-10, higher = more reasonable timeframe)
    const expectedTime = ProgressionRules.getEstimatedProgressionTime(
      progression.fromDifficulty,
      progression.toDifficulty
    );
    const timeDifference = Math.abs(progression.estimatedTimeToAchieve - expectedTime);
    const timeScore = Math.max(1, 10 - (timeDifference / expectedTime) * 5);
    
    // Overall score
    const overallScore = Math.round((difficultyScore + safetyScore + timeScore) / 3);
    
    return {
      difficultyScore: Math.round(difficultyScore),
      safetyScore: Math.max(1, Math.round(safetyScore)),
      timeScore: Math.round(timeScore),
      overallScore: Math.max(1, overallScore)
    };
  }

  /**
   * Suggest progression modifications for better flow
   */
  static suggestProgressionImprovements(exercise: Exercise): {
    missingProgressions: Array<{
      from: Difficulty;
      to: Difficulty;
      suggestedCriteria: readonly string[];
      suggestedModifications: readonly string[];
      estimatedDays: number;
    }>;
    improvementSuggestions: Array<{
      progressionId: string;
      issues: readonly string[];
      suggestions: readonly string[];
    }>;
  } {
    const missingProgressions: Array<{
      from: Difficulty;
      to: Difficulty;
      suggestedCriteria: readonly string[];
      suggestedModifications: readonly string[];
      estimatedDays: number;
    }> = [];

    const improvementSuggestions: Array<{
      progressionId: string;
      issues: readonly string[];
      suggestions: readonly string[];
    }> = [];

    // Check for missing progression steps
    const currentDifficulty = exercise.difficulty;
    const allowedProgressions = ProgressionRules.getAllowedProgressions(currentDifficulty);
    
    for (const targetDifficulty of allowedProgressions) {
      const existingProgression = exercise.progressions.find(p => 
        p.fromDifficulty === currentDifficulty && p.toDifficulty === targetDifficulty
      );
      
      if (!existingProgression) {
        missingProgressions.push({
          from: currentDifficulty,
          to: targetDifficulty,
          suggestedCriteria: ProgressionRules.getRequiredCriteria(currentDifficulty, targetDifficulty),
          suggestedModifications: ProgressionRules.getSuggestedModifications(currentDifficulty, targetDifficulty),
          estimatedDays: ProgressionRules.getEstimatedProgressionTime(currentDifficulty, targetDifficulty)
        });
      }
    }

    // Analyze existing progressions for improvements
    for (const progression of exercise.progressions) {
      const issues: string[] = [];
      const suggestions: string[] = [];
      
      const scores = this.calculateProgressionDifficulty(progression);
      
      if (scores.safetyScore < 6) {
        issues.push('Low safety score');
        suggestions.push('Add more completion criteria and increase time estimate');
      }
      
      if (scores.timeScore < 6) {
        issues.push('Unrealistic time estimate');
        suggestions.push('Adjust time estimate based on difficulty increase');
      }
      
      if (progression.criteria.length < 2) {
        issues.push('Insufficient completion criteria');
        suggestions.push('Add objective measurable criteria for progression readiness');
      }
      
      if (progression.modifications.length < 2) {
        issues.push('Vague progression modifications');
        suggestions.push('Specify exact exercise modifications or parameter changes');
      }
      
      if (issues.length > 0) {
        improvementSuggestions.push({
          progressionId: progression.id.toString(),
          issues,
          suggestions
        });
      }
    }

    return {
      missingProgressions,
      improvementSuggestions
    };
  }

  /**
   * Calculate readiness for progression based on user performance
   */
  static calculateProgressionReadiness(
    userPerformance: {
      completedReps?: number;
      targetReps?: number;
      formQuality?: number; // 1-10 scale
      consistencyDays?: number;
      targetConsistencyDays?: number;
      lastPerformanceDate?: Date;
    },
    progression: ExerciseProgression
  ): {
    readinessPercentage: number;
    metCriteria: readonly string[];
    unmetCriteria: readonly string[];
    recommendedWaitDays: number;
    isReady: boolean;
  } {
    let readinessScore = 0;
    const metCriteria: string[] = [];
    const unmetCriteria: string[] = [];
    let recommendedWaitDays = 0;

    // Check repetition/volume criteria
    if (userPerformance.completedReps && userPerformance.targetReps) {
      const repPercentage = (userPerformance.completedReps / userPerformance.targetReps) * 100;
      if (repPercentage >= 100) {
        readinessScore += 25;
        metCriteria.push('Target repetitions achieved');
      } else {
        unmetCriteria.push(`Need ${userPerformance.targetReps - userPerformance.completedReps} more reps`);
      }
    }

    // Check form quality
    if (userPerformance.formQuality !== undefined) {
      if (userPerformance.formQuality >= 8) {
        readinessScore += 25;
        metCriteria.push('Excellent form quality');
      } else if (userPerformance.formQuality >= 6) {
        readinessScore += 15;
        metCriteria.push('Good form quality');
      } else {
        unmetCriteria.push('Form quality needs improvement');
      }
    }

    // Check consistency
    if (userPerformance.consistencyDays && userPerformance.targetConsistencyDays) {
      if (userPerformance.consistencyDays >= userPerformance.targetConsistencyDays) {
        readinessScore += 25;
        metCriteria.push('Consistency target met');
      } else {
        const remainingDays = userPerformance.targetConsistencyDays - userPerformance.consistencyDays;
        unmetCriteria.push(`Need ${remainingDays} more consistent days`);
        recommendedWaitDays = Math.max(recommendedWaitDays, remainingDays);
      }
    }

    // Check time since last performance
    if (userPerformance.lastPerformanceDate) {
      const daysSinceLastPerformance = Math.floor(
        (Date.now() - userPerformance.lastPerformanceDate.getTime()) / (1000 * 60 * 60 * 24)
      );
      
      if (daysSinceLastPerformance <= 3) {
        readinessScore += 25;
        metCriteria.push('Recent practice maintained');
      } else {
        unmetCriteria.push('Need more recent practice');
        recommendedWaitDays = Math.max(recommendedWaitDays, 2);
      }
    }

    const readinessPercentage = Math.min(100, readinessScore);
    const isReady = readinessPercentage >= 80 && unmetCriteria.length <= 1;

    return {
      readinessPercentage,
      metCriteria,
      unmetCriteria,
      recommendedWaitDays,
      isReady
    };
  }
}


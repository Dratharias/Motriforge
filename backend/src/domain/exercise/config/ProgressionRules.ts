import { Difficulty } from '../../../types/fitness/enums/exercise';
import { ExerciseProgression } from '../entities/ExerciseProgression';

/**
 * Exercise progression rules and logic
 */
export class ProgressionRules {
  /**
   * Get allowed progression paths from a difficulty level
   */
  static getAllowedProgressions(fromDifficulty: Difficulty): readonly Difficulty[] {
    const difficultyOrder = [
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

    const currentIndex = difficultyOrder.indexOf(fromDifficulty);
    if (currentIndex === -1 || currentIndex === difficultyOrder.length - 1) {
      return [];
    }

    // Allow progression to next 1-3 levels
    const allowedCount = Math.min(3, difficultyOrder.length - currentIndex - 1);
    return difficultyOrder.slice(currentIndex + 1, currentIndex + 1 + allowedCount);
  }

  /**
   * Validate progression path
   */
  static isValidProgression(from: Difficulty, to: Difficulty): boolean {
    const allowedProgressions = this.getAllowedProgressions(from);
    return allowedProgressions.includes(to);
  }

  /**
   * Get estimated time for progression
   */
  static getEstimatedProgressionTime(from: Difficulty, to: Difficulty): number {
    const difficultyOrder = [
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

    const fromIndex = difficultyOrder.indexOf(from);
    const toIndex = difficultyOrder.indexOf(to);
    
    if (fromIndex === -1 || toIndex === -1 || toIndex <= fromIndex) {
      return 0;
    }

    const levelDifference = toIndex - fromIndex;
    
    // Base time per level increases as difficulty increases
    const baseTimePerLevel = 7; // days
    const difficultyMultiplier = Math.floor(fromIndex / 3) + 1; // 1 for beginner, 2 for intermediate, 3 for advanced, 4 for master
    
    return baseTimePerLevel * levelDifference * difficultyMultiplier;
  }

  /**
   * Get required criteria for progression
   */
  static getRequiredCriteria(from: Difficulty, to: Difficulty): readonly string[] {
    const levelDifference = this.getLevelDifference(from, to);
    
    if (levelDifference <= 0) return [];

    const baseCriteria = [
      'Complete current exercise with proper form',
      'Achieve target repetitions/duration consistently'
    ];

    if (levelDifference === 1) {
      return baseCriteria;
    }

    if (levelDifference === 2) {
      return [
        ...baseCriteria,
        'Demonstrate mastery over 2 consecutive sessions',
        'Pass safety assessment'
      ];
    }

    // Major progression (3+ levels)
    return [
      ...baseCriteria,
      'Demonstrate mastery over 1 week',
      'Pass comprehensive safety assessment',
      'Complete prerequisite strength tests',
      'Medical clearance if required'
    ];
  }

  /**
   * Get suggested modifications for progression
   */
  static getSuggestedModifications(from: Difficulty, to: Difficulty): readonly string[] {
    const levelDifference = this.getLevelDifference(from, to);
    
    if (levelDifference <= 0) return [];

    const baseModifications = [
      'Increase repetitions by 20-30%',
      'Add 5-10% more resistance/weight'
    ];

    if (levelDifference === 1) {
      return baseModifications;
    }

    if (levelDifference === 2) {
      return [
        ...baseModifications,
        'Increase range of motion',
        'Add stability challenge',
        'Reduce rest time between sets'
      ];
    }

    // Major progression
    return [
      'Significant increase in load/complexity',
      'Add multi-planar movements',
      'Incorporate balance challenges',
      'Add plyometric elements',
      'Increase time under tension',
      'Add coordination requirements'
    ];
  }

  /**
   * Check if progression is safe
   */
  static isProgressionSafe(progression: ExerciseProgression, userAge?: number): boolean {
    const levelDifference = this.getLevelDifference(progression.fromDifficulty, progression.toDifficulty);
    
    // No major jumps (more than 3 levels)
    if (levelDifference > 3) return false;

    // Age-specific safety checks
    if (userAge) {
      if (userAge < 16 && levelDifference > 1) return false;
      if (userAge > 65 && levelDifference > 1) return false;
    }

    // Must have proper criteria
    if (progression.criteria.length === 0) return false;

    // Must have realistic time estimate
    if (progression.estimatedTimeToAchieve < 3) return false;

    return true;
  }

  /**
   * Get level difference between difficulties
   */
  private static getLevelDifference(from: Difficulty, to: Difficulty): number {
    const difficultyOrder = [
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

    const fromIndex = difficultyOrder.indexOf(from);
    const toIndex = difficultyOrder.indexOf(to);
    
    return toIndex - fromIndex;
  }
}


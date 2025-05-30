import { Difficulty } from '../../../types/fitness/enums/exercise';
import { ExerciseProgression } from '../entities/ExerciseProgression';

export class ProgressionRules {
  private static readonly DIFFICULTY_LEVELS = {
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

  private static readonly PROGRESSION_MATRIX: Record<Difficulty, readonly Difficulty[]> = {
    [Difficulty.BEGINNER_I]: [Difficulty.BEGINNER_II],
    [Difficulty.BEGINNER_II]: [Difficulty.BEGINNER_III, Difficulty.INTERMEDIATE_I],
    [Difficulty.BEGINNER_III]: [Difficulty.INTERMEDIATE_I],
    [Difficulty.INTERMEDIATE_I]: [Difficulty.INTERMEDIATE_II],
    [Difficulty.INTERMEDIATE_II]: [Difficulty.INTERMEDIATE_III, Difficulty.ADVANCED_I],
    [Difficulty.INTERMEDIATE_III]: [Difficulty.ADVANCED_I],
    [Difficulty.ADVANCED_I]: [Difficulty.ADVANCED_II],
    [Difficulty.ADVANCED_II]: [Difficulty.ADVANCED_III, Difficulty.MASTER],
    [Difficulty.ADVANCED_III]: [Difficulty.MASTER],
    [Difficulty.MASTER]: []
  };

  private static readonly MINIMUM_PROGRESSION_DAYS: Record<number, number> = {
    1: 7,   // 1 level increase: minimum 1 week
    2: 14,  // 2 level increase: minimum 2 weeks
    3: 21,  // 3 level increase: minimum 3 weeks
    4: 28   // 4+ level increase: minimum 4 weeks
  };

  static getAllowedProgressions(fromDifficulty: Difficulty): readonly Difficulty[] {
    return this.PROGRESSION_MATRIX[fromDifficulty] ?? [];
  }

  static isValidProgression(from: Difficulty, to: Difficulty): boolean {
    const allowedProgressions = this.getAllowedProgressions(from);
    return allowedProgressions.includes(to);
  }

  static getEstimatedProgressionTime(from: Difficulty, to: Difficulty): number {
    const levelIncrease = this.getLevelIncrease(from, to);
    
    if (levelIncrease <= 0) {
      return 0;
    }

    // Base time calculation
    const minDays = this.MINIMUM_PROGRESSION_DAYS[Math.min(levelIncrease, 4)] ?? 28;
    
    // Add complexity factors
    let adjustedDays = minDays;
    
    // Beginner progressions can be faster
    if (this.DIFFICULTY_LEVELS[from] <= 3) {
      adjustedDays *= 0.8;
    }
    
    // Advanced progressions need more time
    if (this.DIFFICULTY_LEVELS[from] >= 7) {
      adjustedDays *= 1.5;
    }
    
    // Large jumps need proportionally more time
    if (levelIncrease >= 3) {
      adjustedDays *= 1.3;
    }
    
    return Math.round(adjustedDays);
  }

  static isProgressionSafe(progression: ExerciseProgression): boolean {
    const levelIncrease = progression.getDifficultyIncrease();
    const estimatedTime = this.getEstimatedProgressionTime(
      progression.fromDifficulty, 
      progression.toDifficulty
    );
    
    // Check if progression time is reasonable
    const timeRatio = progression.estimatedTimeToAchieve / estimatedTime;
    if (timeRatio < 0.5) {
      return false; // Too fast
    }
    
    // Check if difficulty jump is reasonable
    if (levelIncrease > 3) {
      return false; // Too big a jump
    }
    
    // Check if sufficient criteria exist for higher difficulty jumps
    if (levelIncrease >= 2 && progression.criteria.length < 2) {
      return false; // Insufficient validation criteria
    }
    
    return true;
  }

  static getRequiredCriteria(from: Difficulty, to: Difficulty): readonly string[] {
    const levelIncrease = this.getLevelIncrease(from, to);
    const baseLevel = this.DIFFICULTY_LEVELS[from];
    
    const criteria: string[] = [];
    
    // Always require mastery of current level
    criteria.push(`Master ${from} level with consistent good form`);
    
    // Add specific criteria based on progression
    if (levelIncrease >= 2) {
      criteria.push('Demonstrate exercise understanding and safety awareness');
      criteria.push('Complete prerequisite exercises successfully');
    }
    
    // Beginner to intermediate transitions
    if (baseLevel <= 3 && this.DIFFICULTY_LEVELS[to] >= 4) {
      criteria.push('Show understanding of proper progression principles');
    }
    
    // Advanced level requirements
    if (this.DIFFICULTY_LEVELS[to] >= 7) {
      criteria.push('Demonstrate advanced movement control and stability');
      criteria.push('Understand injury prevention strategies');
    }
    
    // Master level requirements
    if (to === Difficulty.MASTER) {
      criteria.push('Complete comprehensive skill assessment');
      criteria.push('Demonstrate teaching capability to others');
    }
    
    return criteria;
  }

  static getSuggestedModifications(from: Difficulty, to: Difficulty): readonly string[] {
    const levelIncrease = this.getLevelIncrease(from, to);
    const baseLevel = this.DIFFICULTY_LEVELS[from];
    
    const modifications: string[] = [];
    
    // Parameter modifications
    if (levelIncrease === 1) {
      modifications.push('Increase repetitions by 25-50%');
      modifications.push('Add 1-2 additional sets');
    } else if (levelIncrease >= 2) {
      modifications.push('Significantly increase volume or intensity');
      modifications.push('Add complexity to movement pattern');
    }
    
    // Technical modifications
    if (baseLevel <= 3) {
      modifications.push('Focus on form refinement and control');
      modifications.push('Introduce tempo variations');
    } else if (baseLevel >= 4 && baseLevel <= 6) {
      modifications.push('Add stability challenges or unilateral variations');
      modifications.push('Incorporate advanced breathing patterns');
    } else {
      modifications.push('Master complex movement combinations');
      modifications.push('Develop teaching and coaching ability');
    }
    
    // Safety modifications
    if (levelIncrease >= 2) {
      modifications.push('Ensure adequate recovery between sessions');
      modifications.push('Monitor for signs of overreaching');
    }
    
    return modifications;
  }

  static getProgressionCategory(from: Difficulty, to: Difficulty): 'conservative' | 'moderate' | 'aggressive' {
    const levelIncrease = this.getLevelIncrease(from, to);
    
    if (levelIncrease === 1) {
      return 'conservative';
    } else if (levelIncrease === 2) {
      return 'moderate';
    } else {
      return 'aggressive';
    }
  }

  static validateProgressionChain(progressions: readonly ExerciseProgression[]): {
    isValid: boolean;
    gaps: readonly Difficulty[];
    duplicates: readonly Difficulty[];
    issues: readonly string[];
  } {
    const issues: string[] = [];
    const gaps: Difficulty[] = [];
    const duplicates: Difficulty[] = [];
    
    if (progressions.length === 0) {
      return { isValid: true, gaps, duplicates, issues };
    }
    
    // Sort progressions by difficulty level
    const sortedProgressions = [...progressions].sort((a, b) =>
      this.DIFFICULTY_LEVELS[a.fromDifficulty] - this.DIFFICULTY_LEVELS[b.fromDifficulty]
    );
    
    // Check for duplicates
    const fromDifficulties = sortedProgressions.map(p => p.fromDifficulty);
    const uniqueFroms = new Set(fromDifficulties);
    if (uniqueFroms.size !== fromDifficulties.length) {
      issues.push('Multiple progressions from same difficulty level');
    }
    
    // Check for logical progression chain
    for (let i = 0; i < sortedProgressions.length - 1; i++) {
      const current = sortedProgressions[i];
      const next = sortedProgressions[i + 1];
      
      // Check if there's a logical connection
      if (current.toDifficulty !== next.fromDifficulty) {
        const expectedLevel = current.toDifficulty;
        if (!fromDifficulties.includes(expectedLevel)) {
          gaps.push(expectedLevel);
        }
      }
    }
    
    return {
      isValid: issues.length === 0 && gaps.length === 0,
      gaps,
      duplicates,
      issues
    };
  }

  private static getLevelIncrease(from: Difficulty, to: Difficulty): number {
    return (this.DIFFICULTY_LEVELS[to] ?? 0) - (this.DIFFICULTY_LEVELS[from] ?? 0);
  }
}
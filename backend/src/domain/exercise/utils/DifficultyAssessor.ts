import { Exercise } from '../entities/Exercise';
import { Difficulty, ExerciseType, MuscleZone, EquipmentCategory } from '../../../types/fitness/enums/exercise';

/**
 * Utility for assessing and adjusting exercise difficulty
 */
export class DifficultyAssessor {
  
  /**
   * Calculate comprehensive difficulty score for an exercise
   */
  static assessDifficulty(exercise: Exercise): {
    overallScore: number;
    suggestedDifficulty: Difficulty;
    components: {
      baseDifficulty: number;
      muscleComplexity: number;
      equipmentComplexity: number;
      instructionComplexity: number;
      coordinationRequirement: number;
      safetyRisk: number;
    };
    reasoning: readonly string[];
  } {
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
    const reasoning = this.generateDifficultyReasoning(exercise, components, overallScore);

    return {
      overallScore,
      suggestedDifficulty,
      components,
      reasoning
    };
  }

  /**
   * Suggest difficulty adjustments to reach target level
   */
  static suggestDifficultyAdjustments(
    exercise: Exercise,
    targetDifficulty: Difficulty
  ): {
    currentScore: number;
    targetScore: number;
    adjustments: Array<{
      category: string;
      currentValue: number;
      suggestion: string;
      impact: 'increase' | 'decrease';
      magnitude: number;
    }>;
    feasible: boolean;
  } {
    const currentAssessment = this.assessDifficulty(exercise);
    const targetScore = this.getBaseDifficultyScore(targetDifficulty);
    const scoreDifference = targetScore - currentAssessment.overallScore;
    
    const adjustments: Array<{
      category: string;
      currentValue: number;
      suggestion: string;
      impact: 'increase' | 'decrease';
      magnitude: number;
    }> = [];

    if (Math.abs(scoreDifference) <= 5) {
      return {
        currentScore: currentAssessment.overallScore,
        targetScore,
        adjustments: [],
        feasible: true
      };
    }

    const needsIncrease = scoreDifference > 0;

    // Muscle complexity adjustments
    if (needsIncrease && exercise.primaryMuscles.length < 3) {
      adjustments.push({
        category: 'Muscle Groups',
        currentValue: exercise.primaryMuscles.length,
        suggestion: 'Add more primary muscle groups or compound movements',
        impact: 'increase',
        magnitude: 10
      });
    } else if (!needsIncrease && exercise.primaryMuscles.length > 1) {
      adjustments.push({
        category: 'Muscle Groups',
        currentValue: exercise.primaryMuscles.length,
        suggestion: 'Focus on single muscle group isolation',
        impact: 'decrease',
        magnitude: 8
      });
    }

    // Equipment complexity adjustments
    if (needsIncrease && exercise.equipment.length <= 1) {
      adjustments.push({
        category: 'Equipment',
        currentValue: exercise.equipment.length,
        suggestion: 'Add specialized equipment or resistance tools',
        impact: 'increase',
        magnitude: 12
      });
    } else if (!needsIncrease && exercise.equipment.length > 1) {
      adjustments.push({
        category: 'Equipment',
        currentValue: exercise.equipment.length,
        suggestion: 'Simplify to bodyweight or single equipment',
        impact: 'decrease',
        magnitude: 10
      });
    }

    // Instruction complexity adjustments
    if (needsIncrease && exercise.instructions.length < 5) {
      adjustments.push({
        category: 'Instructions',
        currentValue: exercise.instructions.length,
        suggestion: 'Add more detailed steps or technique variations',
        impact: 'increase',
        magnitude: 8
      });
    } else if (!needsIncrease && exercise.instructions.length > 8) {
      adjustments.push({
        category: 'Instructions',
        currentValue: exercise.instructions.length,
        suggestion: 'Simplify to essential steps only',
        impact: 'decrease',
        magnitude: 6
      });
    }

    // Time and intensity adjustments
    if (needsIncrease) {
      adjustments.push({
        category: 'Duration',
        currentValue: exercise.estimatedDuration,
        suggestion: 'Increase duration or add intensity intervals',
        impact: 'increase',
        magnitude: 15
      });
    } else {
      adjustments.push({
        category: 'Duration',
        currentValue: exercise.estimatedDuration,
        suggestion: 'Reduce duration or intensity requirements',
        impact: 'decrease',
        magnitude: 12
      });
    }

    const totalAdjustmentMagnitude = adjustments.reduce((sum, adj) => sum + adj.magnitude, 0);
    const feasible = totalAdjustmentMagnitude >= Math.abs(scoreDifference) * 0.8;

    return {
      currentScore: currentAssessment.overallScore,
      targetScore,
      adjustments,
      feasible
    };
  }

  /**
   * Compare difficulty between exercises
   */
  static compareDifficulty(exercise1: Exercise, exercise2: Exercise): {
    comparison: 'easier' | 'similar' | 'harder';
    scoreDifference: number;
    significantDifferences: Array<{
      aspect: string;
      exercise1Value: number;
      exercise2Value: number;
      impact: string;
    }>;
  } {
    const assessment1 = this.assessDifficulty(exercise1);
    const assessment2 = this.assessDifficulty(exercise2);
    
    const scoreDifference = assessment1.overallScore - assessment2.overallScore;
    
    let comparison: 'easier' | 'similar' | 'harder';
    if (Math.abs(scoreDifference) <= 5) {
      comparison = 'similar';
    } else if (scoreDifference > 0) {
      comparison = 'harder';
    } else {
      comparison = 'easier';
    }

    const significantDifferences: Array<{
      aspect: string;
      exercise1Value: number;
      exercise2Value: number;
      impact: string;
    }> = [];

    // Compare components
    const components1 = assessment1.components;
    const components2 = assessment2.components;

    if (Math.abs(components1.muscleComplexity - components2.muscleComplexity) > 10) {
      significantDifferences.push({
        aspect: 'Muscle Complexity',
        exercise1Value: components1.muscleComplexity,
        exercise2Value: components2.muscleComplexity,
        impact: components1.muscleComplexity > components2.muscleComplexity ? 
          'More muscle groups involved' : 'Fewer muscle groups involved'
      });
    }

    if (Math.abs(components1.equipmentComplexity - components2.equipmentComplexity) > 10) {
      significantDifferences.push({
        aspect: 'Equipment Complexity',
        exercise1Value: components1.equipmentComplexity,
        exercise2Value: components2.equipmentComplexity,
        impact: components1.equipmentComplexity > components2.equipmentComplexity ? 
          'More complex equipment setup' : 'Simpler equipment requirements'
      });
    }

    if (Math.abs(components1.coordinationRequirement - components2.coordinationRequirement) > 15) {
      significantDifferences.push({
        aspect: 'Coordination',
        exercise1Value: components1.coordinationRequirement,
        exercise2Value: components2.coordinationRequirement,
        impact: components1.coordinationRequirement > components2.coordinationRequirement ? 
          'Higher coordination demands' : 'Lower coordination requirements'
      });
    }

    return {
      comparison,
      scoreDifference,
      significantDifferences
    };
  }

  private static getBaseDifficultyScore(difficulty: Difficulty): number {
    const difficultyMap = {
      [Difficulty.BEGINNER_I]: 10,
      [Difficulty.BEGINNER_II]: 20,
      [Difficulty.BEGINNER_III]: 30,
      [Difficulty.INTERMEDIATE_I]: 40,
      [Difficulty.INTERMEDIATE_II]: 50,
      [Difficulty.INTERMEDIATE_III]: 60,
      [Difficulty.ADVANCED_I]: 70,
      [Difficulty.ADVANCED_II]: 80,
      [Difficulty.ADVANCED_III]: 90,
      [Difficulty.MASTER]: 100
    };
    return difficultyMap[difficulty] ?? 50;
  }

  private static calculateMuscleComplexity(exercise: Exercise): number {
    const primaryCount = exercise.primaryMuscles.length;
    const secondaryCount = exercise.secondaryMuscles.length;
    
    // Base score from muscle count
    let score = (primaryCount * 15) + (secondaryCount * 8);
    
    // Bonus for complex muscle combinations
    const complexMuscles = [MuscleZone.CORE, MuscleZone.BACK, MuscleZone.SHOULDER];
    const hasComplexMuscles = exercise.primaryMuscles.some(m => complexMuscles.includes(m));
    if (hasComplexMuscles) score += 10;
    
    // Bonus for full-body exercises
    if (primaryCount >= 3) score += 15;
    
    return Math.min(100, score);
  }

  private static calculateEquipmentComplexity(exercise: Exercise): number {
    const equipmentCount = exercise.equipment.length;
    
    if (equipmentCount === 0 || exercise.equipment.includes(EquipmentCategory.BODYWEIGHT)) {
      return 10; // Bodyweight is simplest
    }
    
    const complexEquipment = [
      EquipmentCategory.MACHINES,
      EquipmentCategory.FUNCTIONAL,
      EquipmentCategory.REHABILITATION
    ];
    
    let score = equipmentCount * 20;
    
    const hasComplexEquipment = exercise.equipment.some(eq => complexEquipment.includes(eq));
    if (hasComplexEquipment) score += 25;
    
    return Math.min(100, score);
  }

  private static calculateInstructionComplexity(exercise: Exercise): number {
    const instructionCount = exercise.instructions.length;
    
    if (instructionCount === 0) return 10;
    
    let score = Math.min(instructionCount * 8, 60);
    
    // Bonus for instructions with media
    const mediaInstructions = exercise.instructions.filter(i => i.hasMedia()).length;
    if (mediaInstructions > 0) score += 10;
    
    // Bonus for instructions with tips/mistakes
    const detailedInstructions = exercise.instructions.filter(i => 
      i.tips.length > 0 || i.commonMistakes.length > 0
    ).length;
    score += detailedInstructions * 5;
    
    return Math.min(100, score);
  }

  private static calculateCoordinationRequirement(exercise: Exercise): number {
    let score = 20; // Base coordination requirement
    
    // Type-based coordination requirements
    const coordinationIntensive = [
      ExerciseType.BALANCE,
      ExerciseType.FUNCTIONAL,
      ExerciseType.SPORTS_SPECIFIC
    ];
    
    if (coordinationIntensive.includes(exercise.type)) {
      score += 40;
    }
    
    // Multi-muscle group exercises require more coordination
    const totalMuscles = exercise.primaryMuscles.length + exercise.secondaryMuscles.length;
    score += totalMuscles * 8;
    
    // Complex equipment requires coordination
    if (exercise.equipment.length > 1) {
      score += 15;
    }
    
    return Math.min(100, score);
  }

  private static calculateSafetyRisk(exercise: Exercise): number {
    let score = 10; // Base safety consideration
    
    // High-risk exercise types
    const highRiskTypes = [
      ExerciseType.SPORTS_SPECIFIC,
      ExerciseType.REHABILITATION
    ];
    
    if (highRiskTypes.includes(exercise.type)) {
      score += 30;
    }
    
    // Contraindications indicate higher risk
    score += exercise.contraindications.length * 10;
    
    // Prerequisites indicate complexity/risk
    score += exercise.prerequisites.length * 5;
    
    return Math.min(100, score);
  }

  private static scoreToDifficulty(score: number): Difficulty {
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

  private static generateDifficultyReasoning(
    exercise: Exercise,
    components: any,
    overallScore: number
  ): readonly string[] {
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
    
    if (exercise.prerequisites.length > 0) {
      reasoning.push('Prerequisites indicate advanced skill requirements');
    }
    
    if (reasoning.length === 0) {
      reasoning.push('Straightforward exercise with standard requirements');
    }
    
    return reasoning;
  }
}


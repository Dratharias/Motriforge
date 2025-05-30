import { MuscleZone, ExerciseType, Difficulty } from "@/types/fitness/enums/exercise";
import { Types } from "mongoose";
import { IExerciseProgression, IExerciseOrder, IExerciseVariant } from "../entities/ExerciseVariant";

export interface IExerciseVariantService {
  /**
   * Get progression options for an exercise
   */
  getProgressionOptions(exerciseId: Types.ObjectId): Promise<IExerciseProgression>;
  
  /**
   * Find regression options (easier variants)
   */
  findRegressions(exerciseId: Types.ObjectId, steps?: number): Promise<readonly IExerciseOrder[]>;
  
  /**
   * Find progression options (harder variants)
   */
  findProgressions(exerciseId: Types.ObjectId, steps?: number): Promise<readonly IExerciseOrder[]>;
  
  /**
   * Find alternative exercises (different categories, similar muscles)
   */
  findAlternatives(exerciseId: Types.ObjectId, limit?: number): Promise<readonly Types.ObjectId[]>;
  
  /**
   * Create or update exercise variant category
   */
  createVariant(variant: Omit<IExerciseVariant, 'id' | 'createdAt' | 'updatedAt'>): Promise<IExerciseVariant>;
  
  /**
   * Add exercise to existing variant category
   */
  addExerciseToVariant(
    variantId: Types.ObjectId, 
    exerciseId: Types.ObjectId, 
    difficultyOrder: number
  ): Promise<IExerciseVariant>;
  
  /**
   * Reorder exercises within a variant
   */
  reorderVariant(
    variantId: Types.ObjectId, 
    exerciseOrders: readonly IExerciseOrder[]
  ): Promise<IExerciseVariant>;
  
  /**
   * Auto-suggest difficulty ordering based on exercise properties
   */
  suggestDifficultyOrder(
    variantId: Types.ObjectId, 
    newExerciseId: Types.ObjectId
  ): Promise<number>;
  
  /**
   * Validate progression path logic
   */
  validateProgressionPath(variantId: Types.ObjectId): Promise<{
    isValid: boolean;
    issues: readonly string[];
    suggestions: readonly string[];
  }>;
}

// Example usage showing the enhanced system:

/**
 * Example: Push-ups variant with proper progression
 */
const pushUpsVariant: IExerciseVariant = {
  id: new Types.ObjectId(),
  category: 'push-ups',
  description: 'Progressive push-up variations targeting chest, triceps, and core',
  primaryMuscles: [MuscleZone.CHEST, MuscleZone.TRICEPS],
  exerciseType: ExerciseType.STRENGTH,
  exercises: [
    { exerciseId: new Types.ObjectId(), difficultyOrder: 1, verified: true, createdAt: new Date(), createdBy: new Types.ObjectId() }, // Wall push-ups
    { exerciseId: new Types.ObjectId(), difficultyOrder: 2, verified: true, createdAt: new Date(), createdBy: new Types.ObjectId() }, // Incline push-ups
    { exerciseId: new Types.ObjectId(), difficultyOrder: 3, verified: true, createdAt: new Date(), createdBy: new Types.ObjectId() }, // Knee push-ups
    { exerciseId: new Types.ObjectId(), difficultyOrder: 4, verified: true, createdAt: new Date(), createdBy: new Types.ObjectId() }, // Standard push-ups
    { exerciseId: new Types.ObjectId(), difficultyOrder: 5, verified: true, createdAt: new Date(), createdBy: new Types.ObjectId() }, // Diamond push-ups
    { exerciseId: new Types.ObjectId(), difficultyOrder: 6, verified: true, createdAt: new Date(), createdBy: new Types.ObjectId() }, // Decline push-ups
    { exerciseId: new Types.ObjectId(), difficultyOrder: 7, verified: true, createdAt: new Date(), createdBy: new Types.ObjectId() }, // One-arm push-ups
  ],
  verified: true,
  createdAt: new Date(),
  updatedAt: new Date(),
  createdBy: new Types.ObjectId()
};

/**
 * For any exercise at difficulty 4 (Standard push-ups):
 */
const standardPushUpsProgression: IExerciseProgression = {
  exerciseId: new Types.ObjectId(), // Standard push-ups ID
  difficultyOrder: 4,
  regressions: [
    { exerciseId: new Types.ObjectId(), difficultyOrder: 1, verified: true, createdAt: new Date(), createdBy: new Types.ObjectId() }, // Wall push-ups
    { exerciseId: new Types.ObjectId(), difficultyOrder: 2, verified: true, createdAt: new Date(), createdBy: new Types.ObjectId() }, // Incline push-ups  
    { exerciseId: new Types.ObjectId(), difficultyOrder: 3, verified: true, createdAt: new Date(), createdBy: new Types.ObjectId() }, // Knee push-ups
  ],
  progressions: [
    { exerciseId: new Types.ObjectId(), difficultyOrder: 5, verified: true, createdAt: new Date(), createdBy: new Types.ObjectId() }, // Diamond push-ups
    { exerciseId: new Types.ObjectId(), difficultyOrder: 6, verified: true, createdAt: new Date(), createdBy: new Types.ObjectId() }, // Decline push-ups
    { exerciseId: new Types.ObjectId(), difficultyOrder: 7, verified: true, createdAt: new Date(), createdBy: new Types.ObjectId() }, // One-arm push-ups
  ],
  alternatives: [
    new Types.ObjectId(), // Chest press
    new Types.ObjectId(), // Dumbbell press
    new Types.ObjectId(), // Chest fly
  ],
  lastUpdated: new Date()
};

// ==========================================
// MIGRATION STRATEGY FROM CURRENT SYSTEM
// ==========================================

/**
 * Current ExerciseProgression entity would be deprecated in favor of:
 * 1. ExerciseVariant (category-based grouping)
 * 2. ExerciseOrder (difficulty ordering within category)
 * 3. Auto-generated progression maps
 * 
 * Migration steps:
 * 1. Analyze existing exercises and group by similarity
 * 2. Create ExerciseVariant categories automatically
 * 3. Use DifficultyAssessor to order exercises within categories
 * 4. Generate progression/regression mappings
 * 5. Allow manual verification and adjustment
 */

/**
 * Benefits of new system:
 * - Cleaner separation of progression (within category) vs alternatives (across categories)
 * - Easier to maintain consistent difficulty ordering
 * - Automatic suggestion of next/previous exercises
 * - Better support for adaptive fitness programs
 * - Professional validation workflow for exercise ordering
 */

// ==========================================
// INTEGRATION WITH CURRENT SYSTEM
// ==========================================

/**
 * The current ExerciseProgression can be enhanced to reference variants:
 */
export interface IEnhancedExerciseProgression {
  readonly id: Types.ObjectId;
  readonly exerciseId: Types.ObjectId;
  
  // Current system (maintain for backward compatibility)
  readonly fromDifficulty: Difficulty;
  readonly toDifficulty: Difficulty;
  readonly title: string;
  readonly description: string;
  readonly criteria: readonly string[];
  readonly modifications: readonly string[];
  
  // Enhanced system (add these fields)
  readonly variantId?: Types.ObjectId; // Reference to ExerciseVariant
  readonly progressionType: 'within_variant' | 'cross_variant' | 'alternative';
  readonly targetExerciseOrder?: number; // Target difficulty order within variant
  readonly targetVariantId?: Types.ObjectId; // For cross-variant progressions
  
  readonly estimatedTimeToAchieve: number;
  readonly order: number;
  readonly createdAt: Date;
  readonly updatedAt: Date;
  readonly createdBy: Types.ObjectId;
  readonly isActive: boolean;
}

/**
 * Example usage with enhanced system:
 */
const enhancedProgression: IEnhancedExerciseProgression = {
  id: new Types.ObjectId(),
  exerciseId: new Types.ObjectId(), // Standard push-ups
  fromDifficulty: Difficulty.BEGINNER_III,
  toDifficulty: Difficulty.INTERMEDIATE_I,
  title: 'Progress to Diamond Push-ups',
  description: 'Move from standard to diamond push-ups for increased tricep activation',
  criteria: ['Complete 20 standard push-ups with perfect form', 'Demonstrate wrist stability'],
  modifications: ['Hand position closer together', 'Focus on tricep engagement'],
  
  // Enhanced fields
  variantId: new Types.ObjectId(), // push-ups variant
  progressionType: 'within_variant',
  targetExerciseOrder: 5, // Diamond push-ups order
  
  estimatedTimeToAchieve: 21,
  order: 1,
  createdAt: new Date(),
  updatedAt: new Date(),
  createdBy: new Types.ObjectId(),
  isActive: true
};

/*
===============================================
IMPLEMENTATION TIMELINE

Phase 5.3 (Current): Fix immediate issues
- ✅ Fix TypeScript errors  
- ✅ Continue with current progression system

Phase 6.x (Future): Implement ExerciseVariant system
- Create ExerciseVariant entities and repositories
- Build variant analysis and auto-categorization
- Implement ExerciseVariantService
- Migration tools from current to enhanced system
- Professional validation workflow

This gives us a clear path forward while maintaining 
the current system's functionality.
===============================================
*/
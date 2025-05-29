import { Types } from 'mongoose';
import { IEntity } from '../../../types/core/interfaces';
import { Difficulty } from '../../../types/fitness/enums/exercise';

/**
 * Progression rule for advancing exercise difficulty
 */
export class ExerciseProgression implements IEntity {
  public readonly id: Types.ObjectId;
  public readonly exerciseId: Types.ObjectId;
  public readonly fromDifficulty: Difficulty;
  public readonly toDifficulty: Difficulty;
  public readonly title: string;
  public readonly description: string;
  public readonly criteria: readonly string[]; // What needs to be achieved
  public readonly modifications: readonly string[]; // How to modify the exercise
  public readonly targetExerciseId?: Types.ObjectId; // If progression leads to different exercise
  public readonly estimatedTimeToAchieve: number; // in days
  public readonly order: number; // Progression sequence order
  public readonly createdAt: Date;
  public readonly updatedAt: Date;
  public readonly createdBy: Types.ObjectId;
  public readonly isActive: boolean;
  public readonly isDraft: boolean = false;

  constructor(data: {
    id: Types.ObjectId;
    exerciseId: Types.ObjectId;
    fromDifficulty: Difficulty;
    toDifficulty: Difficulty;
    title: string;
    description: string;
    criteria: readonly string[];
    modifications: readonly string[];
    targetExerciseId?: Types.ObjectId;
    estimatedTimeToAchieve?: number;
    order?: number;
    createdAt: Date;
    updatedAt: Date;
    createdBy: Types.ObjectId;
    isActive: boolean;
  }) {
    this.id = data.id;
    this.exerciseId = data.exerciseId;
    this.fromDifficulty = data.fromDifficulty;
    this.toDifficulty = data.toDifficulty;
    this.title = data.title;
    this.description = data.description;
    this.criteria = data.criteria;
    this.modifications = data.modifications;
    this.targetExerciseId = data.targetExerciseId;
    this.estimatedTimeToAchieve = data.estimatedTimeToAchieve ?? 14;
    this.order = data.order ?? 1;
    this.createdAt = data.createdAt;
    this.updatedAt = data.updatedAt;
    this.createdBy = data.createdBy;
    this.isActive = data.isActive;
  }

  /**
   * Check if progression leads to different exercise
   */
  isExerciseTransition(): boolean {
    return !!this.targetExerciseId;
  }

  /**
   * Check if this is a major progression (more than 1 difficulty level)
   */
  isMajorProgression(): boolean {
    const difficultyOrder = [
      Difficulty.BEGINNER_I, Difficulty.BEGINNER_II, Difficulty.BEGINNER_III,
      Difficulty.INTERMEDIATE_I, Difficulty.INTERMEDIATE_II, Difficulty.INTERMEDIATE_III,
      Difficulty.ADVANCED_I, Difficulty.ADVANCED_II, Difficulty.ADVANCED_III,
      Difficulty.MASTER
    ];
    
    const fromIndex = difficultyOrder.indexOf(this.fromDifficulty);
    const toIndex = difficultyOrder.indexOf(this.toDifficulty);
    
    return (toIndex - fromIndex) > 1;
  }

  /**
   * Get difficulty level increase
   */
  getDifficultyIncrease(): number {
    const difficultyOrder = [
      Difficulty.BEGINNER_I, Difficulty.BEGINNER_II, Difficulty.BEGINNER_III,
      Difficulty.INTERMEDIATE_I, Difficulty.INTERMEDIATE_II, Difficulty.INTERMEDIATE_III,
      Difficulty.ADVANCED_I, Difficulty.ADVANCED_II, Difficulty.ADVANCED_III,
      Difficulty.MASTER
    ];
    
    const fromIndex = difficultyOrder.indexOf(this.fromDifficulty);
    const toIndex = difficultyOrder.indexOf(this.toDifficulty);
    
    return toIndex - fromIndex;
  }

  /**
   * Update progression
   */
  update(updates: {
    title?: string;
    description?: string;
    criteria?: readonly string[];
    modifications?: readonly string[];
    estimatedTimeToAchieve?: number;
    order?: number;
  }): ExerciseProgression {
    return new ExerciseProgression({
      ...this,
      title: updates.title ?? this.title,
      description: updates.description ?? this.description,
      criteria: updates.criteria ?? this.criteria,
      modifications: updates.modifications ?? this.modifications,
      estimatedTimeToAchieve: updates.estimatedTimeToAchieve ?? this.estimatedTimeToAchieve,
      order: updates.order ?? this.order,
      updatedAt: new Date()
    });
  }

  /**
   * Add criteria to progression
   */
  addCriteria(criteria: string): ExerciseProgression {
    if (this.criteria.includes(criteria)) return this;
    
    return new ExerciseProgression({
      ...this,
      criteria: [...this.criteria, criteria],
      updatedAt: new Date()
    });
  }

  /**
   * Add modification to progression
   */
  addModification(modification: string): ExerciseProgression {
    if (this.modifications.includes(modification)) return this;
    
    return new ExerciseProgression({
      ...this,
      modifications: [...this.modifications, modification],
      updatedAt: new Date()
    });
  }
}
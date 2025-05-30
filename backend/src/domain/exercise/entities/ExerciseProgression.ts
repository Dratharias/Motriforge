import { Types } from 'mongoose';
import { IEntity } from '../../../types/core/interfaces';
import { Difficulty } from '../../../types/fitness/enums/exercise';

export class ExerciseProgression implements IEntity {
  public readonly id: Types.ObjectId;
  public readonly exerciseId: Types.ObjectId;
  public fromDifficulty: Difficulty;
  public toDifficulty: Difficulty;
  public title: string;
  public description: string;
  public criteria: readonly string[];
  public modifications: readonly string[];
  public targetExerciseId?: Types.ObjectId;
  public estimatedTimeToAchieve: number;
  public order: number;
  public readonly createdAt: Date;
  public readonly updatedAt: Date;
  public readonly createdBy: Types.ObjectId;
  public readonly isActive: boolean;

  constructor(data: {
    id: Types.ObjectId;
    exerciseId: Types.ObjectId;
    fromDifficulty: Difficulty;
    toDifficulty: Difficulty;
    title: string;
    description: string;
    criteria?: readonly string[];
    modifications?: readonly string[];
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
    this.criteria = data.criteria ?? [];
    this.modifications = data.modifications ?? [];
    this.targetExerciseId = data.targetExerciseId;
    this.estimatedTimeToAchieve = data.estimatedTimeToAchieve ?? 14;
    this.order = data.order ?? 1;
    this.createdAt = data.createdAt;
    this.updatedAt = data.updatedAt;
    this.createdBy = data.createdBy;
    this.isActive = data.isActive;
  }

  getDifficultyIncrease(): number {
    const difficultyLevels = {
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

    return (difficultyLevels[this.toDifficulty] ?? 5) - (difficultyLevels[this.fromDifficulty] ?? 5);
  }

  isMajorProgression(): boolean {
    return this.getDifficultyIncrease() >= 2;
  }

  isExerciseTransition(): boolean {
    return !!this.targetExerciseId;
  }

  update(updates: {
    fromDifficulty?: Difficulty;
    toDifficulty?: Difficulty;
    title?: string;
    description?: string;
    targetExerciseId?: Types.ObjectId;
    estimatedTimeToAchieve?: number;
    order?: number;
  }): ExerciseProgression {
    return new ExerciseProgression({
      ...this,
      fromDifficulty: updates.fromDifficulty ?? this.fromDifficulty,
      toDifficulty: updates.toDifficulty ?? this.toDifficulty,
      title: updates.title ?? this.title,
      description: updates.description ?? this.description,
      targetExerciseId: updates.targetExerciseId ?? this.targetExerciseId,
      estimatedTimeToAchieve: updates.estimatedTimeToAchieve ?? this.estimatedTimeToAchieve,
      order: updates.order ?? this.order,
      updatedAt: new Date()
    });
  }

  addCriteria(criterion: string): ExerciseProgression {
    if (this.criteria.includes(criterion)) {
      return this;
    }

    return new ExerciseProgression({
      ...this,
      criteria: [...this.criteria, criterion],
      updatedAt: new Date()
    });
  }

  addModification(modification: string): ExerciseProgression {
    if (this.modifications.includes(modification)) {
      return this;
    }

    return new ExerciseProgression({
      ...this,
      modifications: [...this.modifications, modification],
      updatedAt: new Date()
    });
  }

  removeCriteria(criterion: string): ExerciseProgression {
    return new ExerciseProgression({
      ...this,
      criteria: this.criteria.filter(c => c !== criterion),
      updatedAt: new Date()
    });
  }

  removeModification(modification: string): ExerciseProgression {
    return new ExerciseProgression({
      ...this,
      modifications: this.modifications.filter(m => m !== modification),
      updatedAt: new Date()
    });
  }

  clone(): ExerciseProgression {
    return new ExerciseProgression({
      ...this,
      id: new Types.ObjectId(),
      createdAt: new Date(),
      updatedAt: new Date()
    });
  }

  getComplexityScore(): number {
    let score = 0;
    
    // Difficulty increase impact
    const difficultyIncrease = this.getDifficultyIncrease();
    score += difficultyIncrease * 2;
    
    // Criteria complexity
    score += this.criteria.length * 0.5;
    
    // Modifications complexity
    score += this.modifications.length * 0.3;
    
    // Time factor
    if (this.estimatedTimeToAchieve < 7) {
      score += 2; // Aggressive progression is more complex
    } else if (this.estimatedTimeToAchieve > 28) {
      score += 1; // Very slow progression adds complexity
    }
    
    // Exercise transition complexity
    if (this.isExerciseTransition()) {
      score += 1.5;
    }
    
    return Math.max(1, Math.round(score * 10) / 10);
  }

  isReasonableDifficulty(): boolean {
    const increase = this.getDifficultyIncrease();
    return increase >= 1 && increase <= 3;
  }

  isReasonableTimeframe(): boolean {
    const increase = this.getDifficultyIncrease();
    const minDays = increase * 7; // Minimum 1 week per difficulty level
    const maxDays = increase * 21; // Maximum 3 weeks per difficulty level
    
    return this.estimatedTimeToAchieve >= minDays && 
           this.estimatedTimeToAchieve <= maxDays;
  }

  getSafetyRisk(): 'low' | 'medium' | 'high' {
    const difficultyIncrease = this.getDifficultyIncrease();
    const timeRatio = this.estimatedTimeToAchieve / (difficultyIncrease * 7);
    
    if (difficultyIncrease > 3) {
      return 'high';
    }
    
    if (timeRatio < 0.5) {
      return 'high'; // Too fast progression
    }
    
    if (this.criteria.length < 2 && difficultyIncrease > 1) {
      return 'medium'; // Insufficient criteria for difficulty jump
    }
    
    return 'low';
  }

  validate(): {
    isValid: boolean;
    errors: readonly string[];
    warnings: readonly string[];
  } {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!this.title || this.title.trim().length === 0) {
      errors.push('Progression title is required');
    }

    if (!this.description || this.description.trim().length < 10) {
      errors.push('Progression description must be at least 10 characters');
    }

    if (this.getDifficultyIncrease() === 0) {
      errors.push('Progression must increase difficulty level');
    }

    if (this.getDifficultyIncrease() < 0) {
      errors.push('Progression cannot decrease difficulty level');
    }

    if (this.criteria.length === 0) {
      warnings.push('Progression lacks completion criteria');
    }

    if (this.modifications.length === 0) {
      warnings.push('Progression lacks specific modifications');
    }

    if (!this.isReasonableDifficulty()) {
      warnings.push('Difficulty increase may be too large for safe progression');
    }

    if (!this.isReasonableTimeframe()) {
      warnings.push('Time estimate may not align with difficulty increase');
    }

    if (this.getSafetyRisk() === 'high') {
      warnings.push('Progression may have safety concerns');
    }

    if (this.estimatedTimeToAchieve < 3) {
      errors.push('Progression time must be at least 3 days');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  getProgressionType(): 'parameter' | 'technique' | 'exercise' | 'intensity' {
    const modText = this.modifications.join(' ').toLowerCase();
    
    if (this.isExerciseTransition()) {
      return 'exercise';
    }
    
    if (modText.includes('reps') || modText.includes('sets') || modText.includes('weight')) {
      return 'parameter';
    }
    
    if (modText.includes('form') || modText.includes('technique') || modText.includes('position')) {
      return 'technique';
    }
    
    if (modText.includes('intensity') || modText.includes('speed') || modText.includes('tempo')) {
      return 'intensity';
    }
    
    return 'parameter'; // Default
  }
}
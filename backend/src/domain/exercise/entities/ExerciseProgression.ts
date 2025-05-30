import { Types } from 'mongoose';
import { IEntity } from '../../../types/core/interfaces';
import { Difficulty } from '../../../types/fitness/enums/exercise';

export interface IExercisePrerequisite {
  readonly exerciseId: Types.ObjectId;
  readonly exerciseName?: string; // For display purposes
  readonly minimumPerformance: {
    readonly reps?: number;
    readonly sets?: number;
    readonly duration?: number; // in seconds
    readonly weight?: number; // in kg
    readonly holdTime?: number; // for static exercises like planks
    readonly consecutiveDays?: number; // consistency requirement
    readonly restTime?: number; // max rest between sets
  };
  readonly isRequired: boolean; // true = must meet to be recommended
  readonly description?: string; // "Complete 25 push-ups with good form"
}

export interface IProgressionWithPrerequisitesOptions {
  readonly fromDifficulty: Difficulty;
  readonly toDifficulty: Difficulty;
  readonly title: string;
  readonly description: string;
  readonly criteria: readonly string[];
  readonly modifications: readonly string[];
  readonly prerequisites: readonly {
    readonly exerciseId: Types.ObjectId;
    readonly exerciseName: string;
    readonly reps?: number;
    readonly sets?: number;
    readonly duration?: number;
    readonly holdTime?: number;
    readonly consecutiveDays?: number;
    readonly weight?: number;
    readonly isRequired?: boolean;
    readonly description?: string;
  }[];
  readonly targetExerciseId?: Types.ObjectId;
  readonly estimatedTimeToAchieve?: number;
  readonly order?: number;
}

export interface IUserPerformance {
  readonly exerciseId: Types.ObjectId;
  readonly bestReps?: number;
  readonly bestSets?: number;
  readonly bestDuration?: number;
  readonly bestWeight?: number;
  readonly bestHoldTime?: number;
  readonly consistentDays?: number;
  readonly averageRestTime?: number;
  readonly lastPerformed?: Date;
  readonly formQuality?: number; // 1-10 scale
}

export interface IPrerequisiteStatus {
  readonly prerequisite: IExercisePrerequisite;
  readonly userPerformance?: IUserPerformance;
  readonly isMet: boolean;
  readonly progress: number; // percentage 0-100
  readonly missingRequirements: readonly string[];
}

export class ExerciseProgression implements IEntity {
  public readonly id: Types.ObjectId;
  public readonly exerciseId: Types.ObjectId;
  public fromDifficulty: Difficulty;
  public toDifficulty: Difficulty;
  public title: string;
  public description: string;
  public criteria: readonly string[];
  public modifications: readonly string[];
  public readonly prerequisites: readonly IExercisePrerequisite[]; // New field
  public targetExerciseId?: Types.ObjectId;
  public estimatedTimeToAchieve: number;
  public order: number;
  public readonly createdAt: Date;
  public readonly updatedAt: Date;
  public readonly createdBy: Types.ObjectId;
  public readonly isActive: boolean;
  public readonly isDraft: boolean;

  constructor(data: {
    id: Types.ObjectId;
    exerciseId: Types.ObjectId;
    fromDifficulty: Difficulty;
    toDifficulty: Difficulty;
    title: string;
    description: string;
    criteria?: readonly string[];
    modifications?: readonly string[];
    prerequisites?: readonly IExercisePrerequisite[]; // New parameter
    targetExerciseId?: Types.ObjectId;
    estimatedTimeToAchieve?: number;
    order?: number;
    createdAt: Date;
    updatedAt: Date;
    createdBy: Types.ObjectId;
    isActive: boolean;
    isDraft: boolean;
  }) {
    this.id = data.id;
    this.exerciseId = data.exerciseId;
    this.fromDifficulty = data.fromDifficulty;
    this.toDifficulty = data.toDifficulty;
    this.title = data.title;
    this.description = data.description;
    this.criteria = data.criteria ?? [];
    this.modifications = data.modifications ?? [];
    this.prerequisites = data.prerequisites ?? []; // Initialize new field
    this.targetExerciseId = data.targetExerciseId;
    this.estimatedTimeToAchieve = data.estimatedTimeToAchieve ?? 14;
    this.order = data.order ?? 1;
    this.createdAt = data.createdAt;
    this.updatedAt = data.updatedAt;
    this.createdBy = data.createdBy;
    this.isActive = data.isActive;
    this.isDraft = data.isDraft;
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
  
    this.validateTitle(errors);
    this.validateDescription(errors);
    this.validateDifficulty(errors);
    this.validateCriteria(warnings);
    this.validateModifications(warnings);
    this.validateSafety(warnings);
    this.validateTime(errors, warnings);
    this.validatePrerequisites(warnings);
  
    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }
  
  private validateTitle(errors: string[]) {
    if (!this.title || this.title.trim().length === 0) {
      errors.push('Progression title is required');
    }
  }
  
  private validateDescription(errors: string[]) {
    if (!this.description || this.description.trim().length < 10) {
      errors.push('Progression description must be at least 10 characters');
    }
  }
  
  private validateDifficulty(errors: string[]) {
    const difficulty = this.getDifficultyIncrease();
    if (difficulty === 0) {
      errors.push('Progression must increase difficulty level');
    } else if (difficulty < 0) {
      errors.push('Progression cannot decrease difficulty level');
    }
  }
  
  private validateCriteria(warnings: string[]) {
    if (this.criteria.length === 0) {
      warnings.push('Progression lacks completion criteria');
    }
  }
  
  private validateModifications(warnings: string[]) {
    if (this.modifications.length === 0) {
      warnings.push('Progression lacks specific modifications');
    }
  }
  
  private validateSafety(warnings: string[]) {
    if (!this.isReasonableDifficulty()) {
      warnings.push('Difficulty increase may be too large for safe progression');
    }
    if (!this.isReasonableTimeframe()) {
      warnings.push('Time estimate may not align with difficulty increase');
    }
    if (this.getSafetyRisk() === 'high') {
      warnings.push('Progression may have safety concerns');
    }
  }
  
  private validateTime(errors: string[], warnings: string[]) {
    if (this.estimatedTimeToAchieve < 3) {
      errors.push('Progression time must be at least 3 days');
    }
  }
  
  private validatePrerequisites(warnings: string[]) {
    for (const prerequisite of this.prerequisites) {
      const performance = prerequisite.minimumPerformance;
      const hasAnyRequirement = Object.values(performance).some(value => value !== undefined);
      if (!hasAnyRequirement) {
        warnings.push(`Prerequisite for exercise ${prerequisite.exerciseId} has no performance requirements`);
      }
  
      if (prerequisite.isRequired && !prerequisite.description) {
        warnings.push('Required prerequisites should have descriptions for user guidance');
      }
    }
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

  checkPrerequisites(userPerformances: readonly IUserPerformance[]): readonly IPrerequisiteStatus[] {
    return this.prerequisites.map(prerequisite => {
      const userPerformance = userPerformances.find(p => 
        p.exerciseId.toString() === prerequisite.exerciseId.toString()
      );

      return this.evaluatePrerequisite(prerequisite, userPerformance);
    });
  }

  isRecommended(userPerformances: readonly IUserPerformance[]): boolean {
    const requiredPrerequisites = this.prerequisites.filter(p => p.isRequired);
    
    if (requiredPrerequisites.length === 0) {
      return true; // No required prerequisites
    }

    const prerequisiteStatuses = this.checkPrerequisites(userPerformances);
    const requiredStatuses = prerequisiteStatuses.filter(status => 
      status.prerequisite.isRequired
    );

    return requiredStatuses.every(status => status.isMet);
  }

  canStillProgress(userPerformances: readonly IUserPerformance[]): boolean {
    // Users can always attempt progression, but we track if it's recommended
    return true;
  }

  getProgressionRecommendation(userPerformances: readonly IUserPerformance[]): {
    canProgress: boolean;
    isRecommended: boolean;
    readinessScore: number; // 0-100
    prerequisiteStatuses: readonly IPrerequisiteStatus[];
    recommendationMessage: string;
  } {
    const prerequisiteStatuses = this.checkPrerequisites(userPerformances);
    const isRecommended = this.isRecommended(userPerformances);
    const canProgress = this.canStillProgress(userPerformances);

    // Calculate overall readiness score
    const totalPrerequisites = this.prerequisites.length;
    const readinessScore = totalPrerequisites === 0 ? 100 : 
      Math.round(prerequisiteStatuses.reduce((sum, status) => sum + status.progress, 0) / totalPrerequisites);

    let recommendationMessage: string;
    if (isRecommended) {
      recommendationMessage = `You meet all requirements for ${this.title}. Ready to progress!`;
    } else if (readinessScore >= 70) {
      recommendationMessage = `You're close to being ready for ${this.title}. Consider practicing prerequisites a bit more.`;
    } else {
      const unmetRequired = prerequisiteStatuses
        .filter(s => s.prerequisite.isRequired && !s.isMet)
        .map(s => s.prerequisite.exerciseName ?? 'prerequisite exercise');
      recommendationMessage = `Focus on mastering: ${unmetRequired.join(', ')} before attempting ${this.title}.`;
    }

    return {
      canProgress,
      isRecommended,
      readinessScore,
      prerequisiteStatuses,
      recommendationMessage
    };
  }

  private evaluatePrerequisite(
    prerequisite: IExercisePrerequisite, 
    userPerformance?: IUserPerformance
  ): IPrerequisiteStatus {
    if (!userPerformance) {
      return {
        prerequisite,
        userPerformance: undefined,
        isMet: false,
        progress: 0,
        missingRequirements: ['No performance data available']
      };
    }

    const progressScores: number[] = [];
    const missingRequirements: string[] = [];

    const checks = [
      this.checkReps,
      this.checkSets,
      this.checkDuration,
      this.checkHoldTime,
      this.checkConsecutiveDays,
      this.checkWeight
    ];

    for (const check of checks) {
      const { progress, missing } = check.call(this, prerequisite, userPerformance);
      if (progress !== null) progressScores.push(progress);
      if (missing) missingRequirements.push(missing);
    }

    const overallProgress = progressScores.length > 0 
      ? Math.round(progressScores.reduce((sum, score) => sum + score, 0) / progressScores.length)
      : 0;

    const isMet = missingRequirements.length === 0 && overallProgress >= 100;

    return {
      prerequisite,
      userPerformance,
      isMet,
      progress: overallProgress,
      missingRequirements
    };
  }

  private checkReps(prereq: IExercisePrerequisite, perf: IUserPerformance) {
    if (prereq.minimumPerformance.reps === undefined) return { progress: null, missing: null };
    const user = perf.bestReps ?? 0;
    const req = prereq.minimumPerformance.reps;
    const progress = Math.min(100, (user / req) * 100);
    const missing = user < req ? `Need ${req - user} more reps (current: ${user})` : null;
    return { progress, missing };
  }

  private checkSets(prereq: IExercisePrerequisite, perf: IUserPerformance) {
    if (prereq.minimumPerformance.sets === undefined) return { progress: null, missing: null };
    const user = perf.bestSets ?? 0;
    const req = prereq.minimumPerformance.sets;
    const progress = Math.min(100, (user / req) * 100);
    const missing = user < req ? `Need ${req - user} more sets (current: ${user})` : null;
    return { progress, missing };
  }

  private checkDuration(prereq: IExercisePrerequisite, perf: IUserPerformance) {
    if (prereq.minimumPerformance.duration === undefined) return { progress: null, missing: null };
    const user = perf.bestDuration ?? 0;
    const req = prereq.minimumPerformance.duration;
    const progress = Math.min(100, (user / req) * 100);
    const missing = user < req ? `Need ${req - user} more seconds (current: ${user}s)` : null;
    return { progress, missing };
  }

  private checkHoldTime(prereq: IExercisePrerequisite, perf: IUserPerformance) {
    if (prereq.minimumPerformance.holdTime === undefined) return { progress: null, missing: null };
    const user = perf.bestHoldTime ?? 0;
    const req = prereq.minimumPerformance.holdTime;
    const progress = Math.min(100, (user / req) * 100);
    const missing = user < req ? `Need to hold ${req - user}s longer (current: ${user}s)` : null;
    return { progress, missing };
  }

  private checkConsecutiveDays(prereq: IExercisePrerequisite, perf: IUserPerformance) {
    if (prereq.minimumPerformance.consecutiveDays === undefined) return { progress: null, missing: null };
    const user = perf.consistentDays ?? 0;
    const req = prereq.minimumPerformance.consecutiveDays;
    const progress = Math.min(100, (user / req) * 100);
    const missing = user < req ? `Need ${req - user} more consecutive days (current: ${user})` : null;
    return { progress, missing };
  }

  private checkWeight(prereq: IExercisePrerequisite, perf: IUserPerformance) {
    if (prereq.minimumPerformance.weight === undefined) return { progress: null, missing: null };
    const user = perf.bestWeight ?? 0;
    const req = prereq.minimumPerformance.weight;
    const progress = Math.min(100, (user / req) * 100);
    const missing = user < req ? `Need ${req - user}kg more weight (current: ${user}kg)` : null;
    return { progress, missing };
  }

  // Helper method to add prerequisites
  addPrerequisite(prerequisite: IExercisePrerequisite): ExerciseProgression {
    return new ExerciseProgression({
      ...this,
      prerequisites: [...this.prerequisites, prerequisite],
      updatedAt: new Date()
    });
  }

  // Helper method to remove prerequisites
  removePrerequisite(exerciseId: Types.ObjectId): ExerciseProgression {
    return new ExerciseProgression({
      ...this,
      prerequisites: this.prerequisites.filter(p => 
        p.exerciseId.toString() !== exerciseId.toString()
      ),
      updatedAt: new Date()
    });
  }
}
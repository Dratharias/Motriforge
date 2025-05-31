import { Types } from 'mongoose';
import { IEntity } from '../../../types/core/interfaces';
import { MediaType } from '../../../types/fitness/enums/media';

export class ExerciseInstruction implements IEntity {
  public readonly id: Types.ObjectId;
  public readonly exerciseId: Types.ObjectId;
  public stepNumber: number;
  public title: string;
  public description: string;
  public duration?: number;
  public mediaUrl?: string;
  public mediaType?: MediaType;
  public tips: readonly string[];
  public commonMistakes: readonly string[];
  public isOptional: boolean;
  public readonly createdAt: Date;
  public readonly updatedAt: Date;
  public readonly createdBy: Types.ObjectId;
  public readonly isActive: boolean;
  public readonly isDraft: boolean;

  constructor(data: {
    id: Types.ObjectId;
    exerciseId: Types.ObjectId;
    stepNumber: number;
    title: string;
    description: string;
    duration?: number;
    mediaUrl?: string;
    mediaType?: MediaType;
    tips?: readonly string[];
    commonMistakes?: readonly string[];
    isOptional?: boolean;
    createdAt: Date;
    updatedAt: Date;
    createdBy: Types.ObjectId;
    isActive: boolean;
    isDraft?: boolean;
  }) {
    this.id = data.id;
    this.exerciseId = data.exerciseId;
    this.stepNumber = data.stepNumber;
    this.title = data.title;
    this.description = data.description;
    this.duration = data.duration;
    this.mediaUrl = data.mediaUrl;
    this.mediaType = data.mediaType;
    this.tips = data.tips ?? [];
    this.commonMistakes = data.commonMistakes ?? [];
    this.isOptional = data.isOptional ?? false;
    this.createdAt = data.createdAt;
    this.updatedAt = data.updatedAt;
    this.createdBy = data.createdBy;
    this.isActive = data.isActive;
    this.isDraft = data.isDraft ?? false;
  }

  getFormattedDuration(): string | null {
    if (!this.duration) {
      return null;
    }

    const totalSeconds = this.duration;
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;

    if (minutes === 0) {
      return `${seconds}s`;
    }

    if (seconds === 0) {
      return `${minutes}m`;
    }

    return `${minutes}m ${seconds}s`;
  }

  hasMedia(): boolean {
    return !!(this.mediaUrl && this.mediaType);
  }

  update(updates: {
    stepNumber?: number;
    title?: string;
    description?: string;
    duration?: number;
    mediaUrl?: string;
    mediaType?: MediaType;
    isOptional?: boolean;
  }): ExerciseInstruction {
    return new ExerciseInstruction({
      ...this,
      stepNumber: updates.stepNumber ?? this.stepNumber,
      title: updates.title ?? this.title,
      description: updates.description ?? this.description,
      duration: updates.duration ?? this.duration,
      mediaUrl: updates.mediaUrl ?? this.mediaUrl,
      mediaType: updates.mediaType ?? this.mediaType,
      isOptional: updates.isOptional ?? this.isOptional,
      updatedAt: new Date()
    });
  }

  addTip(tip: string): ExerciseInstruction {
    if (this.tips.includes(tip)) {
      return this;
    }

    return new ExerciseInstruction({
      ...this,
      tips: [...this.tips, tip],
      updatedAt: new Date()
    });
  }

  addCommonMistake(mistake: string): ExerciseInstruction {
    if (this.commonMistakes.includes(mistake)) {
      return this;
    }

    return new ExerciseInstruction({
      ...this,
      commonMistakes: [...this.commonMistakes, mistake],
      updatedAt: new Date()
    });
  }

  removeTip(tip: string): ExerciseInstruction {
    return new ExerciseInstruction({
      ...this,
      tips: this.tips.filter(t => t !== tip),
      updatedAt: new Date()
    });
  }

  removeCommonMistake(mistake: string): ExerciseInstruction {
    return new ExerciseInstruction({
      ...this,
      commonMistakes: this.commonMistakes.filter(m => m !== mistake),
      updatedAt: new Date()
    });
  }

  clone(): ExerciseInstruction {
    return new ExerciseInstruction({
      ...this,
      id: new Types.ObjectId(),
      createdAt: new Date(),
      updatedAt: new Date()
    });
  }

  isMediaRequired(): boolean {
    return this.title.toLowerCase().includes('form') || 
           this.title.toLowerCase().includes('position') ||
           this.stepNumber === 1;
  }

  getComplexityScore(): number {
    let score = 0;
    
    // Base complexity
    score += Math.min(this.description.length / 50, 5);
    
    // Tips and mistakes add complexity
    score += this.tips.length * 0.5;
    score += this.commonMistakes.length * 0.3;
    
    // Media reduces complexity (visual aids help)
    if (this.hasMedia()) {
      score -= 1;
    }
    
    // Duration affects complexity
    if (this.duration) {
      score += Math.min(this.duration / 30, 2);
    }
    
    return Math.max(1, Math.round(score * 10) / 10);
  }

  validate(): {
    isValid: boolean;
    errors: readonly string[];
    warnings: readonly string[];
  } {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!this.title || this.title.trim().length === 0) {
      errors.push('Instruction title is required');
    }

    if (!this.description || this.description.trim().length < 10) {
      errors.push('Instruction description must be at least 10 characters');
    }

    if (this.stepNumber < 1) {
      errors.push('Step number must be positive');
    }

    if (this.description.length < 20) {
      warnings.push('Description is quite short - consider adding more detail');
    }

    if (this.tips.length === 0 && this.description.length > 100) {
      warnings.push('Complex instruction could benefit from helpful tips');
    }

    if (this.mediaUrl && !this.mediaType) {
      warnings.push('Media URL provided without media type');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }
}
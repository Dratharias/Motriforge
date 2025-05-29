import { Types } from 'mongoose';
import { IEntity } from '../../../types/core/interfaces';
import { MediaType } from '../../../types/fitness/enums/media';

/**
 * Individual instruction step for an exercise
 */
export class ExerciseInstruction implements IEntity {
  public readonly id: Types.ObjectId;
  public readonly exerciseId: Types.ObjectId;
  public readonly stepNumber: number;
  public readonly title: string;
  public readonly description: string;
  public readonly duration?: number; // in seconds
  public readonly mediaUrl?: string;
  public readonly mediaType?: MediaType;
  public readonly tips: readonly string[];
  public readonly commonMistakes: readonly string[];
  public readonly isOptional: boolean;
  public readonly createdAt: Date;
  public readonly updatedAt: Date;
  public readonly createdBy: Types.ObjectId;
  public readonly isActive: boolean;
  public readonly isDraft: boolean = false;

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
  }

  /**
   * Check if instruction has media content
   */
  hasMedia(): boolean {
    return !!(this.mediaUrl && this.mediaType);
  }

  /**
   * Get formatted duration
   */
  getFormattedDuration(): string | null {
    if (!this.duration) return null;
    
    if (this.duration < 60) {
      return `${this.duration}s`;
    }
    
    const minutes = Math.floor(this.duration / 60);
    const seconds = this.duration % 60;
    
    return seconds > 0 ? `${minutes}m ${seconds}s` : `${minutes}m`;
  }

  /**
   * Update instruction
   */
  update(updates: {
    title?: string;
    description?: string;
    duration?: number;
    mediaUrl?: string;
    mediaType?: MediaType;
    tips?: readonly string[];
    commonMistakes?: readonly string[];
    isOptional?: boolean;
  }): ExerciseInstruction {
    return new ExerciseInstruction({
      ...this,
      title: updates.title ?? this.title,
      description: updates.description ?? this.description,
      duration: updates.duration ?? this.duration,
      mediaUrl: updates.mediaUrl ?? this.mediaUrl,
      mediaType: updates.mediaType ?? this.mediaType,
      tips: updates.tips ?? this.tips,
      commonMistakes: updates.commonMistakes ?? this.commonMistakes,
      isOptional: updates.isOptional ?? this.isOptional,
      updatedAt: new Date()
    });
  }

  /**
   * Add tip to instruction
   */
  addTip(tip: string): ExerciseInstruction {
    if (this.tips.includes(tip)) return this;
    
    return new ExerciseInstruction({
      ...this,
      tips: [...this.tips, tip],
      updatedAt: new Date()
    });
  }

  /**
   * Add common mistake to instruction
   */
  addCommonMistake(mistake: string): ExerciseInstruction {
    if (this.commonMistakes.includes(mistake)) return this;
    
    return new ExerciseInstruction({
      ...this,
      commonMistakes: [...this.commonMistakes, mistake],
      updatedAt: new Date()
    });
  }
}


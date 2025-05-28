import { Types } from 'mongoose';
import { IEntity } from '../../../types/core/interfaces';
import { IArchivable } from '../../../types/core/behaviors';
import { MuscleZone, MuscleType, MuscleLevel } from '../../../types/fitness/enums/exercise';

export class Muscle implements IEntity, IArchivable {
  public readonly id: Types.ObjectId;
  public readonly name: string;
  public readonly conventionalName: string;
  public readonly latinTerm: string;
  public readonly zone: MuscleZone;
  public readonly type: MuscleType;
  public readonly level: MuscleLevel;
  public readonly parentMuscle?: Types.ObjectId;
  public readonly subMuscles: readonly Types.ObjectId[];
  public readonly description: string;
  public readonly createdAt: Date;
  public readonly updatedAt: Date;
  public readonly createdBy: Types.ObjectId;
  public readonly isActive: boolean;
  public readonly isDraft: boolean = false;

  constructor(data: {
    id: Types.ObjectId;
    name: string;
    conventionalName: string;
    latinTerm: string;
    zone: MuscleZone;
    type: MuscleType;
    level: MuscleLevel;
    parentMuscle?: Types.ObjectId;
    subMuscles?: readonly Types.ObjectId[];
    description: string;
    createdAt: Date;
    updatedAt: Date;
    createdBy: Types.ObjectId;
    isActive: boolean;
  }) {
    this.id = data.id;
    this.name = data.name;
    this.conventionalName = data.conventionalName;
    this.latinTerm = data.latinTerm;
    this.zone = data.zone;
    this.type = data.type;
    this.level = data.level;
    this.parentMuscle = data.parentMuscle;
    this.subMuscles = data.subMuscles ?? [];
    this.description = data.description;
    this.createdAt = data.createdAt;
    this.updatedAt = data.updatedAt;
    this.createdBy = data.createdBy;
    this.isActive = data.isActive;
  }

  getHierarchy(): Promise<Muscle[]> {
    // Implementation would traverse muscle hierarchy
    // This would typically involve repository calls
    return Promise.resolve([]);
  }

  isPartOf(muscle: Muscle): boolean {
    if (this.parentMuscle?.equals(muscle.id)) {
      return true;
    }
    // Would check up the hierarchy chain
    return false;
  }

  hasSubMuscles(): boolean {
    return this.subMuscles.length > 0;
  }

  isCommonMuscle(): boolean {
    return this.level === MuscleLevel.COMMON;
  }

  isPrimaryMuscle(): boolean {
    return !this.parentMuscle;
  }

  archive(): void {
    // Implementation for archiving
  }

  restore(): void {
    // Implementation for restoring
  }

  canBeDeleted(): boolean {
    return this.subMuscles.length === 0;
  }

  getAssociationCount(): number {
    return this.subMuscles.length;
  }

  update(updates: {
    name?: string;
    conventionalName?: string;
    latinTerm?: string;
    description?: string;
  }): Muscle {
    return new Muscle({
      ...this,
      name: updates.name ?? this.name,
      conventionalName: updates.conventionalName ?? this.conventionalName,
      latinTerm: updates.latinTerm ?? this.latinTerm,
      description: updates.description ?? this.description,
      updatedAt: new Date()
    });
  }
}


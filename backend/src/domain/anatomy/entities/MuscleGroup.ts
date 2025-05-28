import { IArchivable } from "@/types/core/behaviors";
import { IEntity } from "@/types/core/interfaces";
import { MuscleZone } from "@/types/fitness/enums/exercise";
import { Types } from "mongoose";
import { Muscle } from "./Muscle";

export class MuscleGroup implements IEntity, IArchivable {
  public readonly id: Types.ObjectId;
  public readonly name: string;
  public readonly muscles: readonly Types.ObjectId[];
  public readonly primaryZones: readonly MuscleZone[];
  public readonly description: string;
  public readonly createdAt: Date;
  public readonly updatedAt: Date;
  public readonly createdBy: Types.ObjectId;
  public readonly isActive: boolean;
  public readonly isDraft: boolean = false;

  constructor(data: {
    id: Types.ObjectId;
    name: string;
    muscles: readonly Types.ObjectId[];
    primaryZones: readonly MuscleZone[];
    description: string;
    createdAt: Date;
    updatedAt: Date;
    createdBy: Types.ObjectId;
    isActive: boolean;
  }) {
    this.id = data.id;
    this.name = data.name;
    this.muscles = data.muscles;
    this.primaryZones = data.primaryZones;
    this.description = data.description;
    this.createdAt = data.createdAt;
    this.updatedAt = data.updatedAt;
    this.createdBy = data.createdBy;
    this.isActive = data.isActive;
  }

  async getMuscles(): Promise<Muscle[]> {
    // Would typically use repository to fetch muscles
    return [];
  }

  contains(muscle: Muscle): boolean {
    return this.muscles.some(id => id.equals(muscle.id));
  }

  getOverlapWith(other: MuscleGroup): number {
    const commonMuscles = this.muscles.filter(muscleId =>
      other.muscles.some(otherId => otherId.equals(muscleId))
    );
    return commonMuscles.length / Math.max(this.muscles.length, other.muscles.length);
  }

  getMuscleCount(): number {
    return this.muscles.length;
  }

  hasPrimaryZone(zone: MuscleZone): boolean {
    return this.primaryZones.includes(zone);
  }

  addMuscle(muscleId: Types.ObjectId): MuscleGroup {
    if (this.muscles.some(id => id.equals(muscleId))) {
      return this;
    }

    return new MuscleGroup({
      ...this,
      muscles: [...this.muscles, muscleId],
      updatedAt: new Date()
    });
  }

  removeMuscle(muscleId: Types.ObjectId): MuscleGroup {
    return new MuscleGroup({
      ...this,
      muscles: this.muscles.filter(id => !id.equals(muscleId)),
      updatedAt: new Date()
    });
  }

  archive(): void {
    // Implementation for archiving
  }

  restore(): void {
    // Implementation for restoring
  }

  canBeDeleted(): boolean {
    return this.muscles.length === 0;
  }

  getAssociationCount(): number {
    return this.muscles.length;
  }

  update(updates: {
    name?: string;
    description?: string;
    primaryZones?: readonly MuscleZone[];
  }): MuscleGroup {
    return new MuscleGroup({
      ...this,
      name: updates.name ?? this.name,
      description: updates.description ?? this.description,
      primaryZones: updates.primaryZones ?? this.primaryZones,
      updatedAt: new Date()
    });
  }
}


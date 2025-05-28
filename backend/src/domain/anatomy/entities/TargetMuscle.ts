import { Types } from "mongoose";
import { Muscle } from "./Muscle";

export class TargetMuscle {
  public readonly primaryTargets: readonly Types.ObjectId[];
  public readonly secondaryTargets: readonly Types.ObjectId[];
  public readonly stabilizers: readonly Types.ObjectId[];
  public readonly synergists: readonly Types.ObjectId[];

  constructor(data: {
    primaryTargets: readonly Types.ObjectId[];
    secondaryTargets?: readonly Types.ObjectId[];
    stabilizers?: readonly Types.ObjectId[];
    synergists?: readonly Types.ObjectId[];
  }) {
    this.primaryTargets = data.primaryTargets;
    this.secondaryTargets = data.secondaryTargets ?? [];
    this.stabilizers = data.stabilizers ?? [];
    this.synergists = data.synergists ?? [];
  }

  async getPrimaryMuscles(): Promise<Muscle[]> {
    // Would use repository to fetch muscles
    return [];
  }

  async getSecondaryMuscles(): Promise<Muscle[]> {
    // Would use repository to fetch muscles
    return [];
  }

  getTotalMuscleEngagement(): number {
    return this.primaryTargets.length + 
           this.secondaryTargets.length + 
           this.stabilizers.length + 
           this.synergists.length;
  }

  hasOverlapWith(other: TargetMuscle): boolean {
    const allMuscles = [
      ...this.primaryTargets,
      ...this.secondaryTargets,
      ...this.stabilizers,
      ...this.synergists
    ];

    const otherMuscles = [
      ...other.primaryTargets,
      ...other.secondaryTargets,
      ...other.stabilizers,
      ...other.synergists
    ];

    return allMuscles.some(muscle =>
      otherMuscles.some(otherMuscle => otherMuscle.equals(muscle))
    );
  }

  getEngagementLevel(muscleId: Types.ObjectId): 'primary' | 'secondary' | 'stabilizer' | 'synergist' | null {
    if (this.primaryTargets.some(id => id.equals(muscleId))) return 'primary';
    if (this.secondaryTargets.some(id => id.equals(muscleId))) return 'secondary';
    if (this.stabilizers.some(id => id.equals(muscleId))) return 'stabilizer';
    if (this.synergists.some(id => id.equals(muscleId))) return 'synergist';
    return null;
  }

  getAllTargetedMuscles(): readonly Types.ObjectId[] {
    return [
      ...this.primaryTargets,
      ...this.secondaryTargets,
      ...this.stabilizers,
      ...this.synergists
    ];
  }

  hasPrimaryTarget(muscleId: Types.ObjectId): boolean {
    return this.primaryTargets.some(id => id.equals(muscleId));
  }

  update(updates: {
    primaryTargets?: readonly Types.ObjectId[];
    secondaryTargets?: readonly Types.ObjectId[];
    stabilizers?: readonly Types.ObjectId[];
    synergists?: readonly Types.ObjectId[];
  }): TargetMuscle {
    return new TargetMuscle({
      primaryTargets: updates.primaryTargets ?? this.primaryTargets,
      secondaryTargets: updates.secondaryTargets ?? this.secondaryTargets,
      stabilizers: updates.stabilizers ?? this.stabilizers,
      synergists: updates.synergists ?? this.synergists
    });
  }
}
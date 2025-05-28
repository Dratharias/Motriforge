import { Types } from 'mongoose';
import { MuscleZone, MuscleType, MuscleLevel } from '../../../types/fitness/enums/exercise';
import { Muscle } from '../entities/Muscle';
import { MuscleGroup } from '../entities/MuscleGroup';
import { TargetMuscle } from '../entities/TargetMuscle';
import { NewEntity } from '../../../types/core/interfaces';

export interface IMuscleHierarchy {
  readonly muscle: Muscle;
  readonly parent?: Muscle;
  readonly children: readonly Muscle[];
  readonly depth: number;
  readonly path: readonly Muscle[];
}

export interface IMuscleEngagement {
  readonly muscleId: Types.ObjectId;
  readonly engagementType: 'primary' | 'secondary' | 'stabilizer' | 'synergist';
  readonly intensityLevel: number; // 1-10 scale
  readonly isRequired: boolean;
}

export interface IAnatomyReference {
  readonly muscleId: Types.ObjectId;
  readonly anatomicalTerms: readonly string[];
  readonly commonNames: readonly string[];
  readonly relatedMuscles: readonly Types.ObjectId[];
  readonly opposingMuscles: readonly Types.ObjectId[];
}

export interface IMuscleSearchCriteria {
  readonly name?: string;
  readonly zone?: MuscleZone;
  readonly type?: MuscleType;
  readonly level?: MuscleLevel;
  readonly hasParent?: boolean;
  readonly hasChildren?: boolean;
  readonly isActive?: boolean;
}

export interface IMuscleGroupSearchCriteria {
  readonly name?: string;
  readonly primaryZone?: MuscleZone;
  readonly minimumMuscles?: number;
  readonly maximumMuscles?: number;
  readonly isActive?: boolean;
}

export interface IMuscleStatistics {
  readonly totalMuscles: number;
  readonly musclesByZone: Record<MuscleZone, number>;
  readonly musclesByType: Record<MuscleType, number>;
  readonly musclesByLevel: Record<MuscleLevel, number>;
  readonly hierarchicalDepth: number;
  readonly orphanMuscles: number;
}

export interface IMuscleGroupStatistics {
  readonly totalGroups: number;
  readonly averageMusclesPerGroup: number;
  readonly groupsByZone: Record<MuscleZone, number>;
  readonly largestGroup: {
    id: Types.ObjectId;
    name: string;
    muscleCount: number;
  };
  readonly overlap: {
    totalOverlaps: number;
    averageOverlapPercentage: number;
  };
}

export interface IMuscleRepository {
  findById(id: Types.ObjectId): Promise<Muscle | null>;
  findByName(name: string): Promise<Muscle | null>;
  findByZone(zone: MuscleZone): Promise<readonly Muscle[]>;
  findByType(type: MuscleType): Promise<readonly Muscle[]>;
  findByLevel(level: MuscleLevel): Promise<readonly Muscle[]>;
  findChildren(parentId: Types.ObjectId): Promise<readonly Muscle[]>;
  findParent(childId: Types.ObjectId): Promise<Muscle | null>;
  findRootMuscles(): Promise<readonly Muscle[]>;
  search(criteria: IMuscleSearchCriteria): Promise<readonly Muscle[]>;
  create(muscle: Omit<Muscle, NewEntity>): Promise<Muscle>;
  update(id: Types.ObjectId, updates: Partial<Muscle>): Promise<Muscle | null>;
  archive(id: Types.ObjectId): Promise<boolean>;
  restore(id: Types.ObjectId): Promise<boolean>;
  isNameAvailable(name: string, excludeId?: Types.ObjectId): Promise<boolean>;
  getHierarchy(muscleId: Types.ObjectId): Promise<IMuscleHierarchy>;
  getStatistics(): Promise<IMuscleStatistics>;
}

export interface IMuscleGroupRepository {
  findById(id: Types.ObjectId): Promise<MuscleGroup | null>;
  findByName(name: string): Promise<MuscleGroup | null>;
  findByZone(zone: MuscleZone): Promise<readonly MuscleGroup[]>;
  findContainingMuscle(muscleId: Types.ObjectId): Promise<readonly MuscleGroup[]>;
  search(criteria: IMuscleGroupSearchCriteria): Promise<readonly MuscleGroup[]>;
  create(group: Omit<MuscleGroup, NewEntity>): Promise<MuscleGroup>;
  update(id: Types.ObjectId, updates: Partial<MuscleGroup>): Promise<MuscleGroup | null>;
  archive(id: Types.ObjectId): Promise<boolean>;
  restore(id: Types.ObjectId): Promise<boolean>;
  isNameAvailable(name: string, excludeId?: Types.ObjectId): Promise<boolean>;
  getStatistics(): Promise<IMuscleGroupStatistics>;
  findOverlappingGroups(groupId: Types.ObjectId, minOverlap: number): Promise<readonly {
    group: MuscleGroup;
    overlapPercentage: number;
  }[]>;
}

export interface ITargetMuscleRepository {
  findByExerciseId(exerciseId: Types.ObjectId): Promise<TargetMuscle | null>;
  findByMuscle(muscleId: Types.ObjectId): Promise<readonly TargetMuscle[]>;
  findByPrimaryMuscle(muscleId: Types.ObjectId): Promise<readonly TargetMuscle[]>;
  create(exerciseId: Types.ObjectId, targetMuscle: TargetMuscle): Promise<TargetMuscle>;
  update(exerciseId: Types.ObjectId, updates: Partial<TargetMuscle>): Promise<TargetMuscle | null>;
  delete(exerciseId: Types.ObjectId): Promise<boolean>;
  findSimilarTargeting(targetMuscle: TargetMuscle, threshold: number): Promise<readonly {
    exerciseId: Types.ObjectId;
    similarity: number;
  }[]>;
}

export interface IMuscleAnalytics {
  readonly muscleUsageFrequency: Record<string, number>;
  readonly popularCombinations: readonly {
    muscles: readonly Types.ObjectId[];
    frequency: number;
  }[];
  readonly zoneDistribution: Record<MuscleZone, number>;
  readonly hierarchyDepthAnalysis: {
    averageDepth: number;
    maxDepth: number;
    leafNodeCount: number;
  };
}

export interface IMuscleGroupAnalytics {
  readonly groupSizeDistribution: Record<number, number>;
  readonly overlapAnalysis: {
    totalOverlaps: number;
    averageOverlap: number;
    highlyOverlappingPairs: readonly {
      group1: Types.ObjectId;
      group2: Types.ObjectId;
      overlapPercentage: number;
    }[];
  };
  readonly zoneRepresentation: Record<MuscleZone, number>;
}

export interface IMuscleValidationResult {
  readonly isValid: boolean;
  readonly errors: readonly string[];
  readonly warnings: readonly string[];
  readonly suggestions: readonly string[];
}

export interface IMuscleCreationData {
  readonly name: string;
  readonly conventionalName: string;
  readonly latinTerm: string;
  readonly zone: MuscleZone;
  readonly type: MuscleType;
  readonly level: MuscleLevel;
  readonly parentMuscleId?: Types.ObjectId;
  readonly description: string;
}

export interface IMuscleGroupCreationData {
  readonly name: string;
  readonly description: string;
  readonly muscleIds: readonly Types.ObjectId[];
  readonly primaryZones: readonly MuscleZone[];
}

export interface ITargetMuscleCreationData {
  readonly primaryTargets: readonly Types.ObjectId[];
  readonly secondaryTargets?: readonly Types.ObjectId[];
  readonly stabilizers?: readonly Types.ObjectId[];
  readonly synergists?: readonly Types.ObjectId[];
}
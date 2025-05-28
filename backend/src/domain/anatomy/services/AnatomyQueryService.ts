import { ValidationError } from '@/infrastructure/errors/types/ValidationError';
import { MuscleZone } from '@/types/fitness/enums/exercise';
import { Types } from 'mongoose';
import { Muscle } from '../entities/Muscle';
import { TargetMuscle } from '../entities/TargetMuscle';
import {
  ITargetMuscleRepository,
  ITargetMuscleCreationData,
  IMuscleAnalytics,
  IMuscleGroupAnalytics,
  IMuscleGroupRepository,
  IMuscleRepository
} from '../interfaces/AnatomyInterfaces';

export class AnatomyQueryService {
  constructor(
    private readonly muscleRepository: IMuscleRepository,
    private readonly muscleGroupRepository: IMuscleGroupRepository,
    private readonly targetMuscleRepository: ITargetMuscleRepository
  ) {}

  async createTargetMuscle(
    exerciseId: Types.ObjectId,
    data: ITargetMuscleCreationData
  ): Promise<TargetMuscle> {
    await this.validateTargetMuscleCreation(data);

    const targetMuscle = new TargetMuscle({
      primaryTargets: data.primaryTargets,
      secondaryTargets: data.secondaryTargets,
      stabilizers: data.stabilizers,
      synergists: data.synergists
    });

    return await this.targetMuscleRepository.create(exerciseId, targetMuscle);
  }

  async getTargetMuscleByExercise(exerciseId: Types.ObjectId): Promise<TargetMuscle | null> {
    return await this.targetMuscleRepository.findByExerciseId(exerciseId);
  }

  async getExercisesByMuscle(muscleId: Types.ObjectId): Promise<readonly TargetMuscle[]> {
    return await this.targetMuscleRepository.findByMuscle(muscleId);
  }

  async getExercisesByPrimaryMuscle(muscleId: Types.ObjectId): Promise<readonly TargetMuscle[]> {
    return await this.targetMuscleRepository.findByPrimaryMuscle(muscleId);
  }

  async findSimilarExercises(
    exerciseId: Types.ObjectId,
    threshold: number = 0.7
  ): Promise<readonly { exerciseId: Types.ObjectId; similarity: number }[]> {
    const targetMuscle = await this.targetMuscleRepository.findByExerciseId(exerciseId);
    if (!targetMuscle) return [];

    return await this.targetMuscleRepository.findSimilarTargeting(targetMuscle, threshold);
  }

  async updateTargetMuscle(
    exerciseId: Types.ObjectId,
    updates: Partial<TargetMuscle>
  ): Promise<TargetMuscle | null> {
    return await this.targetMuscleRepository.update(exerciseId, updates);
  }

  async deleteTargetMuscle(exerciseId: Types.ObjectId): Promise<boolean> {
    return await this.targetMuscleRepository.delete(exerciseId);
  }

  async getMuscleAnalytics(): Promise<IMuscleAnalytics> {
    const muscles = await this.muscleRepository.search({});
    const targetMuscles = await Promise.all(
      muscles.map(m => this.targetMuscleRepository.findByMuscle(m.id))
    );

    const muscleUsageFrequency: Record<string, number> = {};
    const combinations: Map<string, number> = new Map();

    for (const muscle of muscles) {
      const usage = targetMuscles.filter(tm => 
        tm.some(t => t.getAllTargetedMuscles().some(id => id.equals(muscle.id)))
      ).length;
      muscleUsageFrequency[muscle.id.toString()] = usage;
    }

    // Calculate popular muscle combinations
    for (const targetMuscleList of targetMuscles) {
      for (const tm of targetMuscleList) {
        const muscleIds = tm.getAllTargetedMuscles().map(id => id.toString()).sort((a, b) => a.localeCompare(b));
        if (muscleIds.length > 1) {
          const key = muscleIds.join(',');
          combinations.set(key, (combinations.get(key) ?? 0) + 1);
        }
      }
    }

    const popularCombinations = Array.from(combinations.entries())
      .map(([key, frequency]) => ({
        muscles: key.split(',').map(id => new Types.ObjectId(id)),
        frequency
      }))
      .sort((a, b) => b.frequency - a.frequency)
      .slice(0, 10);

    const zoneDistribution: Record<MuscleZone, number> = {} as Record<MuscleZone, number>;
    for (const muscle of muscles) {
      zoneDistribution[muscle.zone] = (zoneDistribution[muscle.zone] ?? 0) + 1;
    }

    // Calculate hierarchy depth analysis
    const hierarchies = await Promise.all(
      muscles.map(m => this.muscleRepository.getHierarchy(m.id))
    );

    const depths = hierarchies.map(h => h.depth);
    const leafNodes = muscles.filter(m => m.subMuscles.length === 0);

    return {
      muscleUsageFrequency,
      popularCombinations,
      zoneDistribution,
      hierarchyDepthAnalysis: {
        averageDepth: depths.reduce((sum, d) => sum + d, 0) / depths.length,
        maxDepth: Math.max(...depths),
        leafNodeCount: leafNodes.length
      }
    };
  }

  async getMuscleGroupAnalytics(): Promise<IMuscleGroupAnalytics> {
    const groups = await this.muscleGroupRepository.search({});

    const groupSizeDistribution: Record<number, number> = {};
    const overlapPairs: { group1: Types.ObjectId; group2: Types.ObjectId; overlapPercentage: number }[] = [];

    for (const group of groups) {
      const size = group.getMuscleCount();
      groupSizeDistribution[size] = (groupSizeDistribution[size] ?? 0) + 1;
    }

    // Calculate overlaps between all group pairs
    for (let i = 0; i < groups.length; i++) {
      for (let j = i + 1; j < groups.length; j++) {
        const overlap = groups[i].getOverlapWith(groups[j]);
        if (overlap > 0.1) { // Only include significant overlaps
          overlapPairs.push({
            group1: groups[i].id,
            group2: groups[j].id,
            overlapPercentage: overlap
          });
        }
      }
    }

    const zoneRepresentation: Record<MuscleZone, number> = {} as Record<MuscleZone, number>;
    for (const group of groups) {
      for (const zone of group.primaryZones) {
        zoneRepresentation[zone] = (zoneRepresentation[zone] ?? 0) + 1;
      }
    }

    return {
      groupSizeDistribution,
      overlapAnalysis: {
        totalOverlaps: overlapPairs.length,
        averageOverlap: overlapPairs.reduce((sum, p) => sum + p.overlapPercentage, 0) / Math.max(overlapPairs.length, 1),
        highlyOverlappingPairs: overlapPairs
          .filter(p => p.overlapPercentage > 0.5)
          .sort((a, b) => b.overlapPercentage - a.overlapPercentage)
          .slice(0, 5)
      },
      zoneRepresentation
    };
  }

  async getMuscleRecommendations(
    currentMuscles: readonly Types.ObjectId[],
    targetZones: readonly MuscleZone[]
  ): Promise<readonly Muscle[]> {
    const recommendations: Muscle[] = [];

    for (const zone of targetZones) {
      const zoneMuscles = await this.muscleRepository.findByZone(zone);
      const missingMuscles = zoneMuscles.filter(muscle =>
        !currentMuscles.some(id => id.equals(muscle.id))
      );
      recommendations.push(...missingMuscles.slice(0, 3)); // Top 3 per zone
    }

    return recommendations;
  }

  private async validateTargetMuscleCreation(data: ITargetMuscleCreationData): Promise<void> {
    // Validate primary targets
    if (!data.primaryTargets || data.primaryTargets.length === 0) {
      throw new ValidationError(
        'primaryTargets',
        data.primaryTargets,
        'required',
        'At least one primary target muscle is required'
      );
    }

    // Validate all muscle IDs exist
    const allMuscleIds = [
      ...data.primaryTargets,
      ...(data.secondaryTargets ?? []),
      ...(data.stabilizers ?? []),
      ...(data.synergists ?? [])
    ];

    for (const muscleId of allMuscleIds) {
      const muscle = await this.muscleRepository.findById(muscleId);
      if (!muscle) {
        throw new ValidationError(
          'muscleIds',
          muscleId,
          'not_found',
          `Muscle with ID ${muscleId} not found`
        );
      }
    }

    // Check for duplicate muscles across categories
    const seen = new Set<string>();
    for (const muscleId of allMuscleIds) {
      const idStr = muscleId.toString();
      if (seen.has(idStr)) {
        throw new ValidationError(
          'muscleIds',
          muscleId,
          'duplicate',
          'Muscle cannot be in multiple target categories'
        );
      }
      seen.add(idStr);
    }
  }
}
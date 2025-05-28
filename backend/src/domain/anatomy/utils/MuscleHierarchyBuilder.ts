import { Types } from 'mongoose';
import { Muscle } from '../entities/Muscle';
import { IMuscleHierarchy } from '../interfaces/AnatomyInterfaces';

export class MuscleHierarchyBuilder {
  private readonly muscles: Map<string, Muscle> = new Map();
  private readonly children: Map<string, Muscle[]> = new Map();
  private readonly hierarchies: Map<string, IMuscleHierarchy> = new Map();

  constructor(muscles: readonly Muscle[]) {
    this.buildMaps(muscles);
  }

  buildHierarchy(muscleId: Types.ObjectId): IMuscleHierarchy {
    const muscleIdStr = muscleId.toString();
    
    if (this.hierarchies.has(muscleIdStr)) {
      return this.hierarchies.get(muscleIdStr)!;
    }

    const muscle = this.muscles.get(muscleIdStr);
    if (!muscle) {
      throw new Error(`Muscle with ID ${muscleId} not found`);
    }

    const hierarchy = this.buildHierarchyRecursive(muscle, []);
    this.hierarchies.set(muscleIdStr, hierarchy);
    return hierarchy;
  }

  getAllHierarchies(): readonly IMuscleHierarchy[] {
    const hierarchies: IMuscleHierarchy[] = [];
    
    for (const muscle of this.muscles.values()) {
      hierarchies.push(this.buildHierarchy(muscle.id));
    }

    return hierarchies;
  }

  getRootMuscles(): readonly Muscle[] {
    return Array.from(this.muscles.values()).filter(muscle => !muscle.parentMuscle);
  }

  getLeafMuscles(): readonly Muscle[] {
    return Array.from(this.muscles.values()).filter(muscle => 
      !this.children.has(muscle.id.toString()) || 
      this.children.get(muscle.id.toString())!.length === 0
    );
  }

  getMaxDepth(): number {
    let maxDepth = 0;
    
    for (const muscle of this.muscles.values()) {
      const hierarchy = this.buildHierarchy(muscle.id);
      maxDepth = Math.max(maxDepth, hierarchy.depth);
    }

    return maxDepth;
  }

  validateHierarchy(): {
    isValid: boolean;
    errors: readonly string[];
    orphans: readonly Muscle[];
    cycles: readonly string[];
  } {
    const errors: string[] = [];
    const orphans: Muscle[] = [];
    const cycles: string[] = [];

    // Check for orphaned muscles (parent doesn't exist)
    for (const muscle of this.muscles.values()) {
      if (muscle.parentMuscle && !this.muscles.has(muscle.parentMuscle.toString())) {
        orphans.push(muscle);
        errors.push(`Muscle "${muscle.name}" references non-existent parent ${muscle.parentMuscle}`);
      }
    }

    // Check for cycles
    for (const muscle of this.muscles.values()) {
      try {
        this.buildHierarchy(muscle.id);
      } catch (error) {
        if (error instanceof Error && error.message.includes('cycle')) {
          cycles.push(muscle.id.toString());
          errors.push(`Cycle detected in hierarchy for muscle "${muscle.name}"`);
        }
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      orphans,
      cycles
    };
  }

  private buildMaps(muscles: readonly Muscle[]): void {
    // Build muscle lookup map
    for (const muscle of muscles) {
      this.muscles.set(muscle.id.toString(), muscle);
    }

    // Build children map
    for (const muscle of muscles) {
      if (muscle.parentMuscle) {
        const parentIdStr = muscle.parentMuscle.toString();
        if (!this.children.has(parentIdStr)) {
          this.children.set(parentIdStr, []);
        }
        this.children.get(parentIdStr)!.push(muscle);
      }
    }
  }

  private buildHierarchyRecursive(
    muscle: Muscle, 
    visitedIds: string[]
  ): IMuscleHierarchy {
    const muscleIdStr = muscle.id.toString();
    
    // Check for cycles
    if (visitedIds.includes(muscleIdStr)) {
      throw new Error(`Cycle detected in muscle hierarchy: ${visitedIds.join(' -> ')} -> ${muscleIdStr}`);
    }
    
    // Build path from root to current muscle
    const path: Muscle[] = [];
    let current: Muscle | undefined = muscle;
    const pathIds: string[] = [];

    while (current && !pathIds.includes(current.id.toString())) {
      pathIds.unshift(current.id.toString());
      path.unshift(current);
      
      if (current.parentMuscle) {
        current = this.muscles.get(current.parentMuscle.toString());
      } else {
        break;
      }
    }

    // Get parent
    const parent = muscle.parentMuscle ? 
      this.muscles.get(muscle.parentMuscle.toString()) : 
      undefined;

    // Get children
    const children = this.children.get(muscleIdStr) ?? [];

    return {
      muscle,
      parent,
      children,
      depth: path.length - 1,
      path
    };
  }
}


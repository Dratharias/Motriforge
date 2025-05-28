import { TargetMuscle } from '../entities/TargetMuscle';
import { IMuscleEngagement } from '../interfaces/AnatomyInterfaces';

export class EngagementCalculator {
  static calculateTotalEngagement(targetMuscle: TargetMuscle): number {
    const primaryWeight = 1.0;
    const secondaryWeight = 0.7;
    const stabilizerWeight = 0.5;
    const synergistWeight = 0.6;

    return (
      targetMuscle.primaryTargets.length * primaryWeight +
      targetMuscle.secondaryTargets.length * secondaryWeight +
      targetMuscle.stabilizers.length * stabilizerWeight +
      targetMuscle.synergists.length * synergistWeight
    );
  }

  static calculateEngagementScore(
    targetMuscle1: TargetMuscle,
    targetMuscle2: TargetMuscle
  ): number {
    const overlap = this.calculateOverlap(targetMuscle1, targetMuscle2);
    const total1 = this.calculateTotalEngagement(targetMuscle1);
    const total2 = this.calculateTotalEngagement(targetMuscle2);
    
    return overlap / Math.max(total1, total2);
  }

  static calculateOverlap(
    targetMuscle1: TargetMuscle,
    targetMuscle2: TargetMuscle
  ): number {
    const muscles1 = targetMuscle1.getAllTargetedMuscles();
    const muscles2 = targetMuscle2.getAllTargetedMuscles();
    
    let overlap = 0;
    
    for (const muscle1 of muscles1) {
      for (const muscle2 of muscles2) {
        if (muscle1.equals(muscle2)) {
          const level1 = targetMuscle1.getEngagementLevel(muscle1);
          const level2 = targetMuscle2.getEngagementLevel(muscle2);
          overlap += this.getEngagementWeight(level1) * this.getEngagementWeight(level2);
        }
      }
    }
    
    return overlap;
  }

  static generateEngagementProfile(targetMuscle: TargetMuscle): readonly IMuscleEngagement[] {
    const engagements: IMuscleEngagement[] = [];

    // Primary targets
    for (const muscleId of targetMuscle.primaryTargets) {
      engagements.push({
        muscleId,
        engagementType: 'primary',
        intensityLevel: 10,
        isRequired: true
      });
    }

    // Secondary targets
    for (const muscleId of targetMuscle.secondaryTargets) {
      engagements.push({
        muscleId,
        engagementType: 'secondary',
        intensityLevel: 7,
        isRequired: false
      });
    }

    // Stabilizers
    for (const muscleId of targetMuscle.stabilizers) {
      engagements.push({
        muscleId,
        engagementType: 'stabilizer',
        intensityLevel: 5,
        isRequired: false
      });
    }

    // Synergists
    for (const muscleId of targetMuscle.synergists) {
      engagements.push({
        muscleId,
        engagementType: 'synergist',
        intensityLevel: 6,
        isRequired: false
      });
    }

    return engagements;
  }

  static findComplementaryMuscles(
    currentTargets: readonly TargetMuscle[],
    availableTargets: readonly TargetMuscle[]
  ): readonly TargetMuscle[] {
    const currentMuscleSet = new Set<string>();
    
    // Collect all currently targeted muscles
    for (const target of currentTargets) {
      for (const muscleId of target.getAllTargetedMuscles()) {
        currentMuscleSet.add(muscleId.toString());
      }
    }

    // Find targets that add new muscles with minimal overlap
    const complementary: { target: TargetMuscle; newMuscles: number; overlap: number }[] = [];
    
    for (const target of availableTargets) {
      let newMuscles = 0;
      let overlap = 0;
      
      for (const muscleId of target.getAllTargetedMuscles()) {
        if (currentMuscleSet.has(muscleId.toString())) {
          overlap++;
        } else {
          newMuscles++;
        }
      }
      
      if (newMuscles > 0) {
        complementary.push({ target, newMuscles, overlap });
      }
    }

    // Sort by highest new muscles, lowest overlap
    return complementary
      .toSorted((a, b) => {
        const scoreA = a.newMuscles - (a.overlap * 0.5);
        const scoreB = b.newMuscles - (b.overlap * 0.5);
        return scoreB - scoreA;
      })
      .map(item => item.target)
      .slice(0, 5);
  }

  private static getEngagementWeight(level: string | null): number {
    switch (level) {
      case 'primary': return 1.0;
      case 'secondary': return 0.7;
      case 'stabilizer': return 0.5;
      case 'synergist': return 0.6;
      default: return 0;
    }
  }
}


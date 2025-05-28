import { Types } from 'mongoose';
import { TargetMuscle } from '../entities/TargetMuscle';
import { describe, it, expect, beforeEach } from 'vitest';

describe('TargetMuscle Entity', () => {
  let targetMuscleData: any;
  let targetMuscle: TargetMuscle;

  beforeEach(() => {
    targetMuscleData = {
      primaryTargets: [new Types.ObjectId(), new Types.ObjectId()],
      secondaryTargets: [new Types.ObjectId()],
      stabilizers: [new Types.ObjectId(), new Types.ObjectId()],
      synergists: [new Types.ObjectId()]
    };
    targetMuscle = new TargetMuscle(targetMuscleData);
  });

  it('should create target muscle with all properties', () => {
    expect(targetMuscle.primaryTargets).toEqual(targetMuscleData.primaryTargets);
    expect(targetMuscle.secondaryTargets).toEqual(targetMuscleData.secondaryTargets);
    expect(targetMuscle.stabilizers).toEqual(targetMuscleData.stabilizers);
    expect(targetMuscle.synergists).toEqual(targetMuscleData.synergists);
  });

  it('should calculate total muscle engagement correctly', () => {
    expect(targetMuscle.getTotalMuscleEngagement()).toBe(6);
  });

  it('should identify engagement levels correctly', () => {
    const primaryMuscleId = targetMuscleData.primaryTargets[0];
    const secondaryMuscleId = targetMuscleData.secondaryTargets[0];
    const stabilizerMuscleId = targetMuscleData.stabilizers[0];
    const synergistMuscleId = targetMuscleData.synergists[0];
    const unknownMuscleId = new Types.ObjectId();

    expect(targetMuscle.getEngagementLevel(primaryMuscleId)).toBe('primary');
    expect(targetMuscle.getEngagementLevel(secondaryMuscleId)).toBe('secondary');
    expect(targetMuscle.getEngagementLevel(stabilizerMuscleId)).toBe('stabilizer');
    expect(targetMuscle.getEngagementLevel(synergistMuscleId)).toBe('synergist');
    expect(targetMuscle.getEngagementLevel(unknownMuscleId)).toBe(null);
  });

  it('should check primary targets correctly', () => {
    const primaryMuscleId = targetMuscleData.primaryTargets[0];
    const secondaryMuscleId = targetMuscleData.secondaryTargets[0];

    expect(targetMuscle.hasPrimaryTarget(primaryMuscleId)).toBe(true);
    expect(targetMuscle.hasPrimaryTarget(secondaryMuscleId)).toBe(false);
  });

  it('should get all targeted muscles correctly', () => {
    const allTargeted = targetMuscle.getAllTargetedMuscles();
    expect(allTargeted).toHaveLength(6);
    
    // Should include all muscles from all categories
    expect(allTargeted).toEqual(expect.arrayContaining(targetMuscleData.primaryTargets));
    expect(allTargeted).toEqual(expect.arrayContaining(targetMuscleData.secondaryTargets));
    expect(allTargeted).toEqual(expect.arrayContaining(targetMuscleData.stabilizers));
    expect(allTargeted).toEqual(expect.arrayContaining(targetMuscleData.synergists));
  });

  it('should detect overlap with other target muscles correctly', () => {
    const overlappingTarget = new TargetMuscle({
      primaryTargets: [targetMuscleData.primaryTargets[0]], // Same primary
      secondaryTargets: [new Types.ObjectId()], // Different secondary
      stabilizers: [],
      synergists: []
    });

    const nonOverlappingTarget = new TargetMuscle({
      primaryTargets: [new Types.ObjectId()],
      secondaryTargets: [new Types.ObjectId()],
      stabilizers: [],
      synergists: []
    });

    expect(targetMuscle.hasOverlapWith(overlappingTarget)).toBe(true);
    expect(targetMuscle.hasOverlapWith(nonOverlappingTarget)).toBe(false);
  });

  it('should update target muscle correctly', () => {
    const newPrimaryTargets = [new Types.ObjectId()];
    const updatedTarget = targetMuscle.update({
      primaryTargets: newPrimaryTargets
    });

    expect(updatedTarget.primaryTargets).toEqual(newPrimaryTargets);
    expect(updatedTarget.secondaryTargets).toEqual(targetMuscleData.secondaryTargets);
    expect(updatedTarget.stabilizers).toEqual(targetMuscleData.stabilizers);
    expect(updatedTarget.synergists).toEqual(targetMuscleData.synergists);
  });

  it('should handle empty categories correctly', () => {
    const minimalTarget = new TargetMuscle({
      primaryTargets: [new Types.ObjectId()]
    });

    expect(minimalTarget.secondaryTargets).toHaveLength(0);
    expect(minimalTarget.stabilizers).toHaveLength(0);
    expect(minimalTarget.synergists).toHaveLength(0);
    expect(minimalTarget.getTotalMuscleEngagement()).toBe(1);
  });
});


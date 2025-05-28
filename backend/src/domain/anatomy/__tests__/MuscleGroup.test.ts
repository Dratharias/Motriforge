import { Types } from 'mongoose';
import { describe, it, expect, beforeEach } from 'vitest';
import { MuscleZone, MuscleType, MuscleLevel } from '../../../types/fitness/enums/exercise';
import { Muscle } from '../entities/Muscle';
import { MuscleGroup } from '../entities/MuscleGroup';

describe('MuscleGroup Entity', () => {
  let groupData: any;
  let muscleGroup: MuscleGroup;

  beforeEach(() => {
    groupData = {
      id: new Types.ObjectId(),
      name: 'Arm Muscles',
      muscles: [new Types.ObjectId(), new Types.ObjectId(), new Types.ObjectId()],
      primaryZones: [MuscleZone.BICEPS, MuscleZone.TRICEPS],
      description: 'Primary arm muscles',
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: new Types.ObjectId(),
      isActive: true
    };
    muscleGroup = new MuscleGroup(groupData);
  });

  it('should create muscle group with all properties', () => {
    expect(muscleGroup.id).toBe(groupData.id);
    expect(muscleGroup.name).toBe(groupData.name);
    expect(muscleGroup.muscles).toEqual(groupData.muscles);
    expect(muscleGroup.primaryZones).toEqual(groupData.primaryZones);
    expect(muscleGroup.getMuscleCount()).toBe(3);
  });

  it('should check muscle containment correctly', () => {
    const muscleId = groupData.muscles[0];
    const muscle = new Muscle({
      id: muscleId,
      name: 'Test Muscle',
      conventionalName: 'Test',
      latinTerm: 'Testus',
      zone: MuscleZone.BICEPS,
      type: MuscleType.MUSCLE,
      level: MuscleLevel.COMMON,
      description: 'Test muscle',
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: new Types.ObjectId(),
      isActive: true
    });

    expect(muscleGroup.contains(muscle)).toBe(true);
  });

  it('should calculate overlap correctly', () => {
    const otherMuscles = [groupData.muscles[0], new Types.ObjectId()]; // 1 overlap
    const otherGroup = new MuscleGroup({
      ...groupData,
      id: new Types.ObjectId(),
      muscles: otherMuscles
    });

    const overlap = muscleGroup.getOverlapWith(otherGroup);
    expect(overlap).toBeCloseTo(1/3, 2); // 1 common muscle out of 3 total
  });

  it('should check primary zones correctly', () => {
    expect(muscleGroup.hasPrimaryZone(MuscleZone.BICEPS)).toBe(true);
    expect(muscleGroup.hasPrimaryZone(MuscleZone.CHEST)).toBe(false);
  });

  it('should add and remove muscles correctly', () => {
    const newMuscleId = new Types.ObjectId();
    
    // Add muscle
    const updatedGroup = muscleGroup.addMuscle(newMuscleId);
    expect(updatedGroup.getMuscleCount()).toBe(4);
    expect(updatedGroup.muscles).toContain(newMuscleId);

    // Remove muscle
    const removedGroup = updatedGroup.removeMuscle(newMuscleId);
    expect(removedGroup.getMuscleCount()).toBe(3);
    expect(removedGroup.muscles).not.toContain(newMuscleId);

    // Adding duplicate should not increase count
    const duplicateGroup = muscleGroup.addMuscle(groupData.muscles[0]);
    expect(duplicateGroup.getMuscleCount()).toBe(3);
  });

  it('should handle deletion validation correctly', () => {
    expect(muscleGroup.canBeDeleted()).toBe(false);

    const emptyGroup = new MuscleGroup({
      ...groupData,
      muscles: []
    });
    expect(emptyGroup.canBeDeleted()).toBe(true);
  });
});


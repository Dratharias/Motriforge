import { describe, it, expect, beforeEach } from 'vitest';
import { Types } from 'mongoose';
import { Muscle } from '../entities/Muscle';
import { MuscleZone, MuscleType, MuscleLevel } from '../../../types/fitness/enums/exercise';

describe('Muscle Entity', () => {
  let muscleData: any;
  let muscle: Muscle;

  beforeEach(() => {
    muscleData = {
      id: new Types.ObjectId(),
      name: 'Biceps Brachii',
      conventionalName: 'Biceps',
      latinTerm: 'Musculus biceps brachii',
      zone: MuscleZone.BICEPS,
      type: MuscleType.MUSCLE,
      level: MuscleLevel.COMMON,
      description: 'A two-headed muscle in the upper arm',
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: new Types.ObjectId(),
      isActive: true
    };
    muscle = new Muscle(muscleData);
  });

  it('should create muscle with all properties', () => {
    expect(muscle.id).toBe(muscleData.id);
    expect(muscle.name).toBe(muscleData.name);
    expect(muscle.conventionalName).toBe(muscleData.conventionalName);
    expect(muscle.latinTerm).toBe(muscleData.latinTerm);
    expect(muscle.zone).toBe(muscleData.zone);
    expect(muscle.type).toBe(muscleData.type);
    expect(muscle.level).toBe(muscleData.level);
    expect(muscle.isActive).toBe(true);
    expect(muscle.isDraft).toBe(false);
  });

  it('should handle sub-muscles correctly', () => {
    const subMuscleIds = [new Types.ObjectId(), new Types.ObjectId()];
    const parentMuscle = new Muscle({
      ...muscleData,
      subMuscles: subMuscleIds
    });

    expect(parentMuscle.hasSubMuscles()).toBe(true);
    expect(parentMuscle.getAssociationCount()).toBe(2);
    expect(parentMuscle.canBeDeleted()).toBe(false);
  });

  it('should identify muscle characteristics correctly', () => {
    expect(muscle.isCommonMuscle()).toBe(true);
    expect(muscle.isPrimaryMuscle()).toBe(true);

    const subMuscle = new Muscle({
      ...muscleData,
      parentMuscle: new Types.ObjectId(),
      level: MuscleLevel.MEDICAL
    });

    expect(subMuscle.isCommonMuscle()).toBe(false);
    expect(subMuscle.isPrimaryMuscle()).toBe(false);
  });

  it('should check muscle relationships correctly', () => {
    const parentId = new Types.ObjectId();
    const parentMuscle = new Muscle({ ...muscleData, id: parentId });
    const childMuscle = new Muscle({
      ...muscleData,
      id: new Types.ObjectId(),
      parentMuscle: parentId
    });

    expect(childMuscle.isPartOf(parentMuscle)).toBe(true);
    expect(parentMuscle.isPartOf(childMuscle)).toBe(false);
  });

  it('should update muscle properties correctly', () => {
    const updates = {
      name: 'Updated Biceps',
      description: 'Updated description'
    };

    const updatedMuscle = muscle.update(updates);

    expect(updatedMuscle.name).toBe('Updated Biceps');
    expect(updatedMuscle.description).toBe('Updated description');
    expect(updatedMuscle.conventionalName).toBe(muscle.conventionalName);
    expect(updatedMuscle.updatedAt).not.toBe(muscle.updatedAt);
  });
});


import { describe, it, expect, beforeEach } from 'vitest';
import { Types } from 'mongoose';
import { Equipment } from '../entities/Equipment';
import { EquipmentCategory } from '../../../types/fitness/enums/exercise';
import { Status } from '../../../types/core/enums';
import { MeasurementUnit } from '../../../types/fitness/enums/progress';

describe('Equipment Entity', () => {
  let equipmentData: any;
  let equipment: Equipment;

  beforeEach(() => {
    equipmentData = {
      id: new Types.ObjectId(),
      name: 'Treadmill Pro X1',
      category: EquipmentCategory.CARDIO,
      description: 'Professional grade treadmill with advanced features',
      specifications: {
        weight: { value: 150, unit: MeasurementUnit.KG },
        dimensions: {
          length: 200,
          width: 90,
          height: 150,
          unit: MeasurementUnit.CENTIMETERS
        },
        capacity: { value: 200, unit: MeasurementUnit.KG },
        features: ['Heart Rate Monitor', 'Incline Control', 'Speed Control'],
        safetyFeatures: ['Emergency Stop', 'Safety Key', 'Side Rails'],
        manufacturer: 'FitnessTech',
        model: 'Pro X1',
        serialNumber: 'FT-TX1-001'
      },
      isAvailable: true,
      status: Status.ACTIVE,
      organization: new Types.ObjectId(),
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: new Types.ObjectId(),
      isActive: true
    };
    equipment = new Equipment(equipmentData);
  });

  it('should create equipment with all properties', () => {
    expect(equipment.id).toBe(equipmentData.id);
    expect(equipment.name).toBe(equipmentData.name);
    expect(equipment.category).toBe(equipmentData.category);
    expect(equipment.description).toBe(equipmentData.description);
    expect(equipment.isAvailable).toBe(true);
    expect(equipment.isActive).toBe(true);
    expect(equipment.isDraft).toBe(false);
  });

  it('should check equipment availability correctly', () => {
    expect(equipment.isEquipmentAvailable()).toBe(true);

    const unavailableEquipment = new Equipment({
      ...equipmentData,
      isAvailable: false
    });
    expect(unavailableEquipment.isEquipmentAvailable()).toBe(false);

    const inactiveEquipment = new Equipment({
      ...equipmentData,
      isActive: false
    });
    expect(inactiveEquipment.isEquipmentAvailable()).toBe(false);

    const suspendedEquipment = new Equipment({
      ...equipmentData,
      status: Status.SUSPENDED
    });
    expect(suspendedEquipment.isEquipmentAvailable()).toBe(false);
  });

  it('should manage alternatives correctly', () => {
    const alternativeId = new Types.ObjectId();
    
    // Add alternative
    const withAlternative = equipment.addAlternative(alternativeId);
    expect(withAlternative.alternatives).toContain(alternativeId);
    expect(withAlternative.alternatives).toHaveLength(1);

    // Adding same alternative should not duplicate
    const withDuplicate = withAlternative.addAlternative(alternativeId);
    expect(withDuplicate.alternatives).toHaveLength(1);

    // Remove alternative
    const withoutAlternative = withAlternative.removeAlternative(alternativeId);
    expect(withoutAlternative.alternatives).not.toContain(alternativeId);
    expect(withoutAlternative.alternatives).toHaveLength(0);
  });

  it('should update equipment properties correctly', () => {
    const updates = {
      name: 'Updated Treadmill',
      description: 'Updated description',
      specifications: {
        features: ['New Feature']
      },
      isAvailable: false,
      status: Status.INACTIVE
    };

    const updatedEquipment = equipment.update(updates);
    
    expect(updatedEquipment.name).toBe('Updated Treadmill');
    expect(updatedEquipment.description).toBe('Updated description');
    expect(updatedEquipment.specifications.features).toEqual(['New Feature']);
    expect(updatedEquipment.isAvailable).toBe(false);
    expect(updatedEquipment.status).toBe(Status.INACTIVE);
    expect(updatedEquipment.category).toBe(equipment.category); // Unchanged
    expect(updatedEquipment.updatedAt).not.toBe(equipment.updatedAt);
  });

  it('should set availability correctly', () => {
    const unavailableEquipment = equipment.setAvailability(false);
    expect(unavailableEquipment.isAvailable).toBe(false);
    expect(unavailableEquipment.updatedAt).not.toBe(equipment.updatedAt);

    const availableAgain = unavailableEquipment.setAvailability(true);
    expect(availableAgain.isAvailable).toBe(true);
  });

  it('should determine deletion eligibility correctly', () => {
    // Available equipment cannot be deleted
    expect(equipment.canBeDeleted()).toBe(false);

    // Unavailable equipment can be deleted
    const unavailableEquipment = equipment.setAvailability(false);
    expect(unavailableEquipment.canBeDeleted()).toBe(true);
  });

  it('should check compatibility correctly', () => {
    const exerciseId = new Types.ObjectId();
    // This is a placeholder - in real implementation would check exercise compatibility
    expect(equipment.isCompatibleWith(exerciseId)).toBe(true);
  });
});
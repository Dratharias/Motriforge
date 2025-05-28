import { vi, MockedFunction, beforeEach, describe, expect, it } from 'vitest';
import { EquipmentService } from '../services/EquipmentService';
import { IEquipmentRepository } from '../interfaces/EquipmentInterfaces';
import { ValidationError } from '../../../infrastructure/errors/types/ValidationError';
import { Types } from 'mongoose';
import { EquipmentCategory } from '../../../types/fitness/enums/exercise';
import { Equipment } from '../entities/Equipment';
import { MeasurementUnit } from '../../../types/fitness/enums/progress';

describe('EquipmentService', () => {
  let equipmentService: EquipmentService;
  let mockEquipmentRepository: {
    [K in keyof IEquipmentRepository]: MockedFunction<IEquipmentRepository[K]>
  };

  beforeEach(() => {
    mockEquipmentRepository = {
      findById: vi.fn(),
      findByName: vi.fn(),
      findByCategory: vi.fn(),
      findByOrganization: vi.fn(),
      findAvailable: vi.fn(),
      search: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      archive: vi.fn(),
      restore: vi.fn(),
      isNameAvailable: vi.fn(),
      getStatistics: vi.fn(),
      getUsageStats: vi.fn(),
      findAlternatives: vi.fn(),
      findCompatibleEquipment: vi.fn()
    };

    equipmentService = new EquipmentService(mockEquipmentRepository);
  });

  describe('createEquipment', () => {
    const validEquipmentData = {
      name: 'Test Treadmill',
      category: EquipmentCategory.CARDIO,
      description: 'High-quality treadmill for cardio workouts',
      specifications: {
        weight: { value: 150, unit: MeasurementUnit.KG },
        features: ['Heart Rate Monitor'],
        safetyFeatures: ['Emergency Stop']
      },
      organizationId: new Types.ObjectId()
    };

    it('should create equipment with valid data', async () => {
      mockEquipmentRepository.isNameAvailable.mockResolvedValue(true);
      mockEquipmentRepository.create.mockResolvedValue(expect.any(Equipment));

      await equipmentService.createEquipment(validEquipmentData, new Types.ObjectId());

      expect(mockEquipmentRepository.isNameAvailable).toHaveBeenCalledWith(
        'Test Treadmill',
        validEquipmentData.organizationId,
        undefined
      );
      expect(mockEquipmentRepository.create).toHaveBeenCalled();
    });

    it('should throw validation error for empty name', async () => {
      const invalidData = { ...validEquipmentData, name: '' };
      await expect(equipmentService.createEquipment(invalidData, new Types.ObjectId()))
        .rejects.toThrow(ValidationError);
    });

    it('should throw validation error for duplicate name', async () => {
      mockEquipmentRepository.isNameAvailable.mockResolvedValue(false);
      await expect(equipmentService.createEquipment(validEquipmentData, new Types.ObjectId()))
        .rejects.toThrow(ValidationError);
    });

    it('should throw validation error for empty description', async () => {
      const invalidData = { ...validEquipmentData, description: '' };
      await expect(equipmentService.createEquipment(invalidData, new Types.ObjectId()))
        .rejects.toThrow(ValidationError);
    });

    it('should throw validation error for invalid specifications', async () => {
      const invalidData = {
        ...validEquipmentData,
        specifications: {
          ...validEquipmentData.specifications,
          weight: { value: -10, unit: MeasurementUnit.KG }
        }
      };
      await expect(equipmentService.createEquipment(invalidData, new Types.ObjectId()))
        .rejects.toThrow(ValidationError);
    });
  });

  describe('archiveEquipment', () => {
    it('should archive equipment if it can be deleted', async () => {
      const mockEquipment = {
        canBeDeleted: vi.fn().mockReturnValue(true)
      } as any;
      mockEquipmentRepository.findById.mockResolvedValue(mockEquipment);
      mockEquipmentRepository.archive.mockResolvedValue(true);

      const result = await equipmentService.archiveEquipment(new Types.ObjectId());

      expect(result).toBe(true);
      expect(mockEquipmentRepository.archive).toHaveBeenCalled();
    });

    it('should throw validation error if equipment cannot be deleted', async () => {
      const mockEquipment = {
        canBeDeleted: vi.fn().mockReturnValue(false),
        id: new Types.ObjectId()
      } as any;
      mockEquipmentRepository.findById.mockResolvedValue(mockEquipment);

      await expect(equipmentService.archiveEquipment(new Types.ObjectId()))
        .rejects.toThrow(ValidationError);
    });
  });

  describe('addEquipmentAlternative', () => {
    it('should add alternative if both equipment exist in same organization', async () => {
      const equipmentId = new Types.ObjectId();
      const alternativeId = new Types.ObjectId();
      const organizationId = new Types.ObjectId();

      const mockEquipment = {
        id: equipmentId,
        organization: organizationId,
        addAlternative: vi.fn().mockReturnValue({
          alternatives: [alternativeId]
        })
      } as any;

      const mockAlternative = {
        id: alternativeId,
        organization: organizationId
      } as any;

      mockEquipmentRepository.findById
        .mockResolvedValueOnce(mockEquipment)
        .mockResolvedValueOnce(mockAlternative);
      mockEquipmentRepository.update.mockResolvedValue(mockEquipment);

      const result = await equipmentService.addEquipmentAlternative(equipmentId, alternativeId);

      expect(result).toBeDefined();
      expect(mockEquipment.addAlternative).toHaveBeenCalledWith(alternativeId);
      expect(mockEquipmentRepository.update).toHaveBeenCalled();
    });

    it('should throw error if alternative equipment not found', async () => {
      const equipmentId = new Types.ObjectId();
      const alternativeId = new Types.ObjectId();

      const mockEquipment = { id: equipmentId } as any;
      mockEquipmentRepository.findById
        .mockResolvedValueOnce(mockEquipment)
        .mockResolvedValueOnce(null);

      await expect(equipmentService.addEquipmentAlternative(equipmentId, alternativeId))
        .rejects.toThrow(ValidationError);
    });
  });

  describe('validateEquipmentAvailability', () => {
    it('should categorize equipment by availability', async () => {
      const equipmentIds = [new Types.ObjectId(), new Types.ObjectId(), new Types.ObjectId()];
      
      const availableEquipment = {
        id: equipmentIds[0],
        isEquipmentAvailable: vi.fn().mockReturnValue(true)
      } as any;

      const unavailableEquipment = {
        id: equipmentIds[1],
        isEquipmentAvailable: vi.fn().mockReturnValue(false)
      } as any;

      mockEquipmentRepository.findById
        .mockResolvedValueOnce(availableEquipment)
        .mockResolvedValueOnce(unavailableEquipment)
        .mockResolvedValueOnce(null); // Equipment not found

      const result = await equipmentService.validateEquipmentAvailability(
        equipmentIds,
        new Date(),
        new Date()
      );

      expect(result.available).toContain(equipmentIds[0]);
      expect(result.unavailable).toContain(unavailableEquipment);
      expect(result.available).toHaveLength(1);
      expect(result.unavailable).toHaveLength(1);
    });
  });
});
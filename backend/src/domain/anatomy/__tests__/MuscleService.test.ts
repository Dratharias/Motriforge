import { vi, MockedFunction, beforeEach, describe, expect, it } from 'vitest';
import { MuscleService } from '../services/MuscleService';
import { IMuscleRepository } from '../interfaces/AnatomyInterfaces';
import { ValidationError } from '../../../infrastructure/errors/types/ValidationError';
import { Types } from 'mongoose';
import { MuscleZone, MuscleType, MuscleLevel } from '../../../types/fitness/enums/exercise';
import { Muscle } from '../entities/Muscle';

describe('MuscleService', () => {
  let muscleService: MuscleService;
  let mockRepository: {
    [K in keyof IMuscleRepository]: MockedFunction<IMuscleRepository[K]>
  };

  beforeEach(() => {
    mockRepository = {
      findById: vi.fn(),
      findByName: vi.fn(),
      findByZone: vi.fn(),
      findByType: vi.fn(),
      findByLevel: vi.fn(),
      findChildren: vi.fn(),
      findParent: vi.fn(),
      findRootMuscles: vi.fn(),
      search: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      archive: vi.fn(),
      restore: vi.fn(),
      isNameAvailable: vi.fn(),
      getHierarchy: vi.fn(),
      getStatistics: vi.fn()
    };

    muscleService = new MuscleService(mockRepository);
  });

  describe('createMuscle', () => {
    const validMuscleData = {
      name: 'Biceps Brachii',
      conventionalName: 'Biceps',
      latinTerm: 'Musculus biceps brachii',
      zone: MuscleZone.BICEPS,
      type: MuscleType.MUSCLE,
      level: MuscleLevel.COMMON,
      description: 'A two-headed muscle in the upper arm'
    };

    it('should create muscle with valid data', async () => {
      mockRepository.isNameAvailable.mockResolvedValue(true);
      mockRepository.create.mockResolvedValue(expect.any(Muscle));

      await muscleService.createMuscle(validMuscleData, new Types.ObjectId());

      expect(mockRepository.isNameAvailable).toHaveBeenCalledWith('Biceps Brachii', undefined);
      expect(mockRepository.create).toHaveBeenCalled();
    });

    it('should throw validation error for empty name', async () => {
      const invalidData = { ...validMuscleData, name: '' };

      await expect(muscleService.createMuscle(invalidData, new Types.ObjectId()))
        .rejects.toThrow(ValidationError);
    });

    it('should throw validation error for duplicate name', async () => {
      mockRepository.isNameAvailable.mockResolvedValue(false);

      await expect(muscleService.createMuscle(validMuscleData, new Types.ObjectId()))
        .rejects.toThrow(ValidationError);
    });

    it('should validate parent muscle exists', async () => {
      const dataWithParent = { 
        ...validMuscleData, 
        parentMuscleId: new Types.ObjectId() 
      };
      
      mockRepository.isNameAvailable.mockResolvedValue(true);
      mockRepository.findById.mockResolvedValue(null);

      await expect(muscleService.createMuscle(dataWithParent, new Types.ObjectId()))
        .rejects.toThrow(ValidationError);
    });
  });

  describe('archiveMuscle', () => {
    it('should archive muscle if it can be deleted', async () => {
      const mockMuscle = {
        canBeDeleted: vi.fn().mockReturnValue(true)
      } as any;

      mockRepository.findById.mockResolvedValue(mockMuscle);
      mockRepository.archive.mockResolvedValue(true);

      const result = await muscleService.archiveMuscle(new Types.ObjectId());

      expect(result).toBe(true);
      expect(mockRepository.archive).toHaveBeenCalled();
    });

    it('should throw validation error if muscle has sub-muscles', async () => {
      const mockMuscle = {
        canBeDeleted: vi.fn().mockReturnValue(false),
        id: new Types.ObjectId()
      } as any;

      mockRepository.findById.mockResolvedValue(mockMuscle);

      await expect(muscleService.archiveMuscle(new Types.ObjectId()))
        .rejects.toThrow(ValidationError);
    });
  });
});
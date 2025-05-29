import { Types } from 'mongoose';
import { Muscle } from '../entities/Muscle';
import {
  IMuscleRepository,
  IMuscleCreationData,
  IMuscleSearchCriteria,
  IMuscleStatistics,
  IMuscleHierarchy,
} from '../interfaces/AnatomyInterfaces';
import { MuscleZone, MuscleType, MuscleLevel } from '../../../types/fitness/enums/exercise';
import { ValidationError } from '../../../infrastructure/errors/types/ValidationError';

export class MuscleService {
  constructor(
    private readonly muscleRepository: IMuscleRepository
  ) {}

  async createMuscle(data: IMuscleCreationData, createdBy: Types.ObjectId): Promise<Muscle> {
    await this.validateMuscleCreation(data);

    const now = new Date();
    const muscleId = new Types.ObjectId();

    const muscle = new Muscle({
      id: muscleId,
      name: data.name.trim(),
      conventionalName: data.conventionalName.trim(),
      latinTerm: data.latinTerm.trim(),
      zone: data.zone,
      type: data.type,
      level: data.level,
      parentMuscle: data.parentMuscleId,
      description: data.description.trim(),
      createdAt: now,
      updatedAt: now,
      createdBy,
      isActive: true
    });

    return await this.muscleRepository.create(muscle);
  }

  async getMuscleById(id: Types.ObjectId): Promise<Muscle | null> {
    return await this.muscleRepository.findById(id);
  }

  async getMuscleByName(name: string): Promise<Muscle | null> {
    return await this.muscleRepository.findByName(name.trim());
  }

  async getMusclesByZone(zone: MuscleZone): Promise<readonly Muscle[]> {
    return await this.muscleRepository.findByZone(zone);
  }

  async getMusclesByType(type: MuscleType): Promise<readonly Muscle[]> {
    return await this.muscleRepository.findByType(type);
  }

  async getMusclesByLevel(level: MuscleLevel): Promise<readonly Muscle[]> {
    return await this.muscleRepository.findByLevel(level);
  }

  async updateMuscle(
    id: Types.ObjectId,
    updates: {
      name?: string;
      conventionalName?: string;
      latinTerm?: string;
      description?: string;
    }
  ): Promise<Muscle | null> {
    if (updates.name) {
      await this.validateMuscleName(updates.name, id);
    }

    const finalUpdates = {
      ...updates,
      name: updates.name?.trim(),
      conventionalName: updates.conventionalName?.trim(),
      latinTerm: updates.latinTerm?.trim(),
      description: updates.description?.trim()
    };

    return await this.muscleRepository.update(id, finalUpdates);
  }

  async searchMuscles(criteria: IMuscleSearchCriteria): Promise<readonly Muscle[]> {
    return await this.muscleRepository.search(criteria);
  }

  async getMuscleHierarchy(muscleId: Types.ObjectId): Promise<IMuscleHierarchy> {
    return await this.muscleRepository.getHierarchy(muscleId);
  }

  async getMuscleChildren(parentId: Types.ObjectId): Promise<readonly Muscle[]> {
    return await this.muscleRepository.findChildren(parentId);
  }

  async getMuscleParent(childId: Types.ObjectId): Promise<Muscle | null> {
    return await this.muscleRepository.findParent(childId);
  }

  async getRootMuscles(): Promise<readonly Muscle[]> {
    return await this.muscleRepository.findRootMuscles();
  }

  async archiveMuscle(id: Types.ObjectId): Promise<boolean> {
    const muscle = await this.muscleRepository.findById(id);
    if (!muscle) {
      return false;
    }

    if (!muscle.canBeDeleted()) {
      throw new ValidationError(
        'muscle',
        muscle.id,
        'archive_validation',
        'Cannot archive muscle with sub-muscles'
      );
    }

    return await this.muscleRepository.archive(id);
  }

  async restoreMuscle(id: Types.ObjectId): Promise<boolean> {
    return await this.muscleRepository.restore(id);
  }

  async getMuscleStatistics(): Promise<IMuscleStatistics> {
    return await this.muscleRepository.getStatistics();
  }

  async getCommonMuscles(): Promise<readonly Muscle[]> {
    return await this.muscleRepository.findByLevel(MuscleLevel.COMMON);
  }

  async getMedicalMuscles(): Promise<readonly Muscle[]> {
    return await this.muscleRepository.findByLevel(MuscleLevel.MEDICAL);
  }

  async validateMuscleHierarchy(parentId: Types.ObjectId, childId: Types.ObjectId): Promise<boolean> {
    const hierarchy = await this.muscleRepository.getHierarchy(childId);
    
    // Check for circular reference
    return !hierarchy.path.some(muscle => muscle.id.equals(parentId));
  }

  private async validateMuscleCreation(data: IMuscleCreationData): Promise<void> {
    // Validate name
    await this.validateMuscleName(data.name);

    // Validate conventional name
    if (!data.conventionalName || data.conventionalName.trim().length === 0) {
      throw new ValidationError(
        'conventionalName',
        data.conventionalName,
        'required',
        'Conventional name is required'
      );
    }

    // Validate latin term
    if (!data.latinTerm || data.latinTerm.trim().length === 0) {
      throw new ValidationError(
        'latinTerm',
        data.latinTerm,
        'required',
        'Latin term is required'
      );
    }

    // Validate description
    if (!data.description || data.description.trim().length === 0) {
      throw new ValidationError(
        'description',
        data.description,
        'required',
        'Description is required'
      );
    }

    if (data.description.length > 500) {
      throw new ValidationError(
        'description',
        data.description,
        'max_length',
        'Description must be less than 500 characters'
      );
    }

    // Validate parent muscle exists
    if (data.parentMuscleId) {
      const parent = await this.muscleRepository.findById(data.parentMuscleId);
      if (!parent) {
        throw new ValidationError(
          'parentMuscleId',
          data.parentMuscleId,
          'not_found',
          'Parent muscle not found'
        );
      }
    }
  }

  private async validateMuscleName(name: string, excludeId?: Types.ObjectId): Promise<void> {
    if (!name || name.trim().length === 0) {
      throw new ValidationError(
        'name',
        name,
        'required',
        'Muscle name is required'
      );
    }

    if (name.length < 2) {
      throw new ValidationError(
        'name',
        name,
        'min_length',
        'Muscle name must be at least 2 characters'
      );
    }

    if (name.length > 100) {
      throw new ValidationError(
        'name',
        name,
        'max_length',
        'Muscle name must be less than 100 characters'
      );
    }

    const isAvailable = await this.muscleRepository.isNameAvailable(name, excludeId);
    if (!isAvailable) {
      throw new ValidationError(
        'name',
        name,
        'unique',
        'Muscle name is already taken'
      );
    }
  }
}


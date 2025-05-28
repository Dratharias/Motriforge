import { ValidationError } from '@/infrastructure/errors/types/ValidationError';
import { MuscleZone } from '@/types/fitness/enums/exercise';
import { Types } from 'mongoose';
import { MuscleGroup } from '../entities/MuscleGroup';
import {
  IMuscleGroupRepository,
  IMuscleGroupCreationData,
  IMuscleGroupSearchCriteria,
  IMuscleGroupStatistics,
  IMuscleRepository
} from '../interfaces/AnatomyInterfaces';

export class MuscleGroupService {
  constructor(
    private readonly muscleGroupRepository: IMuscleGroupRepository,
    private readonly muscleRepository: IMuscleRepository
  ) {}

  async createMuscleGroup(data: IMuscleGroupCreationData, createdBy: Types.ObjectId): Promise<MuscleGroup> {
    await this.validateMuscleGroupCreation(data);

    const now = new Date();
    const groupId = new Types.ObjectId();

    const group = new MuscleGroup({
      id: groupId,
      name: data.name.trim(),
      muscles: data.muscleIds,
      primaryZones: data.primaryZones,
      description: data.description.trim(),
      createdAt: now,
      updatedAt: now,
      createdBy,
      isActive: true
    });

    return await this.muscleGroupRepository.create(group);
  }

  async getMuscleGroupById(id: Types.ObjectId): Promise<MuscleGroup | null> {
    return await this.muscleGroupRepository.findById(id);
  }

  async getMuscleGroupByName(name: string): Promise<MuscleGroup | null> {
    return await this.muscleGroupRepository.findByName(name.trim());
  }

  async getMuscleGroupsByZone(zone: MuscleZone): Promise<readonly MuscleGroup[]> {
    return await this.muscleGroupRepository.findByZone(zone);
  }

  async getGroupsContainingMuscle(muscleId: Types.ObjectId): Promise<readonly MuscleGroup[]> {
    return await this.muscleGroupRepository.findContainingMuscle(muscleId);
  }

  async updateMuscleGroup(
    id: Types.ObjectId,
    updates: {
      name?: string;
      description?: string;
      primaryZones?: readonly MuscleZone[];
    }
  ): Promise<MuscleGroup | null> {
    if (updates.name) {
      await this.validateMuscleGroupName(updates.name, id);
    }

    const finalUpdates = {
      ...updates,
      name: updates.name?.trim(),
      description: updates.description?.trim()
    };

    return await this.muscleGroupRepository.update(id, finalUpdates);
  }

  async addMuscleToGroup(groupId: Types.ObjectId, muscleId: Types.ObjectId): Promise<MuscleGroup | null> {
    const group = await this.muscleGroupRepository.findById(groupId);
    if (!group) return null;

    const muscle = await this.muscleRepository.findById(muscleId);
    if (!muscle) {
      throw new ValidationError(
        'muscleId',
        muscleId,
        'not_found',
        'Muscle not found'
      );
    }

    const updatedGroup = group.addMuscle(muscleId);
    return await this.muscleGroupRepository.update(groupId, {
      muscles: updatedGroup.muscles
    });
  }

  async removeMuscleFromGroup(groupId: Types.ObjectId, muscleId: Types.ObjectId): Promise<MuscleGroup | null> {
    const group = await this.muscleGroupRepository.findById(groupId);
    if (!group) return null;

    const updatedGroup = group.removeMuscle(muscleId);
    return await this.muscleGroupRepository.update(groupId, {
      muscles: updatedGroup.muscles
    });
  }

  async searchMuscleGroups(criteria: IMuscleGroupSearchCriteria): Promise<readonly MuscleGroup[]> {
    return await this.muscleGroupRepository.search(criteria);
  }

  async findOverlappingGroups(groupId: Types.ObjectId, minOverlap: number = 0.1): Promise<readonly {
    group: MuscleGroup;
    overlapPercentage: number;
  }[]> {
    return await this.muscleGroupRepository.findOverlappingGroups(groupId, minOverlap);
  }

  async getMuscleGroupStatistics(): Promise<IMuscleGroupStatistics> {
    return await this.muscleGroupRepository.getStatistics();
  }

  async archiveMuscleGroup(id: Types.ObjectId): Promise<boolean> {
    const group = await this.muscleGroupRepository.findById(id);
    if (!group) {
      return false;
    }

    if (!group.canBeDeleted()) {
      throw new ValidationError(
        'muscleGroup',
        group.id,
        'archive_validation',
        'Cannot archive muscle group with associated muscles'
      );
    }

    return await this.muscleGroupRepository.archive(id);
  }

  async restoreMuscleGroup(id: Types.ObjectId): Promise<boolean> {
    return await this.muscleGroupRepository.restore(id);
  }

  private async validateMuscleGroupCreation(data: IMuscleGroupCreationData): Promise<void> {
    // Validate name
    await this.validateMuscleGroupName(data.name);

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

    // Validate muscle IDs
    if (!data.muscleIds || data.muscleIds.length === 0) {
      throw new ValidationError(
        'muscleIds',
        data.muscleIds,
        'required',
        'At least one muscle is required'
      );
    }

    if (data.muscleIds.length > 50) {
      throw new ValidationError(
        'muscleIds',
        data.muscleIds,
        'max_length',
        'Cannot have more than 50 muscles in a group'
      );
    }

    // Validate that all muscles exist
    for (const muscleId of data.muscleIds) {
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

    // Validate primary zones
    if (!data.primaryZones || data.primaryZones.length === 0) {
      throw new ValidationError(
        'primaryZones',
        data.primaryZones,
        'required',
        'At least one primary zone is required'
      );
    }
  }

  private async validateMuscleGroupName(name: string, excludeId?: Types.ObjectId): Promise<void> {
    if (!name || name.trim().length === 0) {
      throw new ValidationError(
        'name',
        name,
        'required',
        'Muscle group name is required'
      );
    }

    if (name.length < 2) {
      throw new ValidationError(
        'name',
        name,
        'min_length',
        'Muscle group name must be at least 2 characters'
      );
    }

    if (name.length > 100) {
      throw new ValidationError(
        'name',
        name,
        'max_length',
        'Muscle group name must be less than 100 characters'
      );
    }

    const isAvailable = await this.muscleGroupRepository.isNameAvailable(name, excludeId);
    if (!isAvailable) {
      throw new ValidationError(
        'name',
        name,
        'unique',
        'Muscle group name is already taken'
      );
    }
  }
}


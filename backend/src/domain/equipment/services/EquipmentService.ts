import { Types } from 'mongoose';
import { Equipment } from '../entities/Equipment';
import {
  IEquipmentRepository,
  IEquipmentCreationData,
  IEquipmentUpdateData,
  IEquipmentSearchCriteria,
  IEquipmentStatistics,
  IEquipmentUsageStats
} from '../interfaces/EquipmentInterfaces';
import { EquipmentCategory } from '../../../types/fitness/enums/exercise';
import { Status } from '../../../types/core/enums';
import { ValidationError } from '../../../infrastructure/errors/types/ValidationError';

export class EquipmentService {
  constructor(
    private readonly equipmentRepository: IEquipmentRepository
  ) {}

  async createEquipment(data: IEquipmentCreationData, createdBy: Types.ObjectId): Promise<Equipment> {
    await this.validateEquipmentCreation(data);

    const now = new Date();
    const equipmentId = new Types.ObjectId();

    const equipment = new Equipment({
      id: equipmentId,
      name: data.name.trim(),
      category: data.category,
      description: data.description.trim(),
      specifications: data.specifications,
      isAvailable: data.isAvailable ?? true,
      status: data.status ?? Status.ACTIVE,
      organization: data.organizationId,
      createdAt: now,
      updatedAt: now,
      createdBy,
      isActive: true
    });

    return await this.equipmentRepository.create(equipment);
  }

  async getEquipmentById(id: Types.ObjectId): Promise<Equipment | null> {
    return await this.equipmentRepository.findById(id);
  }

  async getEquipmentByName(name: string, organizationId: Types.ObjectId): Promise<Equipment | null> {
    const results = await this.equipmentRepository.search({
      name: name.trim(),
      organizationId
    });
    return results.length > 0 ? results[0] : null;
  }

  async getEquipmentByCategory(category: EquipmentCategory): Promise<readonly Equipment[]> {
    return await this.equipmentRepository.findByCategory(category);
  }

  async getOrganizationEquipment(organizationId: Types.ObjectId): Promise<readonly Equipment[]> {
    return await this.equipmentRepository.findByOrganization(organizationId);
  }

  async getAvailableEquipment(organizationId: Types.ObjectId): Promise<readonly Equipment[]> {
    return await this.equipmentRepository.findAvailable(organizationId);
  }

  async updateEquipment(
    id: Types.ObjectId,
    updates: IEquipmentUpdateData
  ): Promise<Equipment | null> {
    if (updates.name) {
      const equipment = await this.equipmentRepository.findById(id);
      if (equipment) {
        await this.validateEquipmentName(updates.name, equipment.organization, id);
      }
    }

    const finalUpdates = {
      ...updates,
      name: updates.name?.trim(),
      description: updates.description?.trim()
    };

    return await this.equipmentRepository.update(id, finalUpdates);
  }

  async setEquipmentAvailability(id: Types.ObjectId, isAvailable: boolean): Promise<Equipment | null> {
    return await this.equipmentRepository.update(id, { isAvailable });
  }

  async addEquipmentAlternative(
    equipmentId: Types.ObjectId,
    alternativeId: Types.ObjectId
  ): Promise<Equipment | null> {
    const equipment = await this.equipmentRepository.findById(equipmentId);
    if (!equipment) return null;

    const alternative = await this.equipmentRepository.findById(alternativeId);
    if (!alternative) {
      throw new ValidationError(
        'alternativeId',
        alternativeId,
        'not_found',
        'Alternative equipment not found'
      );
    }

    if (!alternative.organization.equals(equipment.organization)) {
      throw new ValidationError(
        'alternativeId',
        alternativeId,
        'organization_mismatch',
        'Alternative equipment must be from the same organization'
      );
    }

    const updatedEquipment = equipment.addAlternative(alternativeId);
    return await this.equipmentRepository.update(equipmentId, {
      alternatives: updatedEquipment.alternatives
    });
  }

  async removeEquipmentAlternative(
    equipmentId: Types.ObjectId,
    alternativeId: Types.ObjectId
  ): Promise<Equipment | null> {
    const equipment = await this.equipmentRepository.findById(equipmentId);
    if (!equipment) return null;

    const updatedEquipment = equipment.removeAlternative(alternativeId);
    return await this.equipmentRepository.update(equipmentId, {
      alternatives: updatedEquipment.alternatives
    });
  }

  async searchEquipment(criteria: IEquipmentSearchCriteria): Promise<readonly Equipment[]> {
    return await this.equipmentRepository.search(criteria);
  }

  async getEquipmentStatistics(organizationId: Types.ObjectId): Promise<IEquipmentStatistics> {
    return await this.equipmentRepository.getStatistics(organizationId);
  }

  async getEquipmentUsageStats(equipmentId: Types.ObjectId): Promise<IEquipmentUsageStats> {
    return await this.equipmentRepository.getUsageStats(equipmentId);
  }

  async archiveEquipment(id: Types.ObjectId): Promise<boolean> {
    const equipment = await this.equipmentRepository.findById(id);
    if (!equipment) {
      return false;
    }

    if (!equipment.canBeDeleted()) {
      throw new ValidationError(
        'equipment',
        equipment.id,
        'archive_validation',
        'Cannot archive equipment that is currently in use or available'
      );
    }

    return await this.equipmentRepository.archive(id);
  }

  async restoreEquipment(id: Types.ObjectId): Promise<boolean> {
    return await this.equipmentRepository.restore(id);
  }

  async findCompatibleEquipment(exerciseId: Types.ObjectId): Promise<readonly Equipment[]> {
    return await this.equipmentRepository.findCompatibleEquipment(exerciseId);
  }

  async getEquipmentAlternatives(equipmentId: Types.ObjectId): Promise<readonly Equipment[]> {
    return await this.equipmentRepository.findAlternatives(equipmentId);
  }

  async validateEquipmentAvailability(
    equipmentIds: readonly Types.ObjectId[],
    startTime: Date,
    endTime: Date
  ): Promise<{
    available: readonly Types.ObjectId[];
    unavailable: readonly Equipment[];
    conflicts: readonly Equipment[];
  }> {
    const available: Types.ObjectId[] = [];
    const unavailable: Equipment[] = [];
    const conflicts: Equipment[] = [];

    for (const equipmentId of equipmentIds) {
      const equipment = await this.equipmentRepository.findById(equipmentId);
      if (!equipment) continue;

      if (!equipment.isEquipmentAvailable()) {
        unavailable.push(equipment);
        continue;
      }

      // Check for scheduling conflicts
      // This would require integration with reservation system
      available.push(equipmentId);
    }

    return { available, unavailable, conflicts };
  }

  private async validateEquipmentCreation(data: IEquipmentCreationData): Promise<void> {
    await this.validateEquipmentName(data.name, data.organizationId);

    if (!data.description || data.description.trim().length === 0) {
      throw new ValidationError(
        'description',
        data.description,
        'required',
        'Description is required'
      );
    }

    if (data.description.length > 1000) {
      throw new ValidationError(
        'description',
        data.description,
        'max_length',
        'Description must be less than 1000 characters'
      );
    }

    if (!Object.values(EquipmentCategory).includes(data.category)) {
      throw new ValidationError(
        'category',
        data.category,
        'invalid',
        'Invalid equipment category'
      );
    }

    // Validate specifications
    if (data.specifications.weight && data.specifications.weight.value <= 0) {
      throw new ValidationError(
        'specifications.weight',
        data.specifications.weight.value,
        'positive_value',
        'Weight must be a positive value'
      );
    }

    if (data.specifications.capacity && data.specifications.capacity.value <= 0) {
      throw new ValidationError(
        'specifications.capacity',
        data.specifications.capacity.value,
        'positive_value',
        'Capacity must be a positive value'
      );
    }

    if (data.specifications.dimensions) {
      const { length, width, height } = data.specifications.dimensions;
      if (length <= 0 || width <= 0 || height <= 0) {
        throw new ValidationError(
          'specifications.dimensions',
          data.specifications.dimensions,
          'positive_values',
          'All dimension values must be positive'
        );
      }
    }
  }

  private async validateEquipmentName(
    name: string,
    organizationId: Types.ObjectId,
    excludeId?: Types.ObjectId
  ): Promise<void> {
    if (!name || name.trim().length === 0) {
      throw new ValidationError(
        'name',
        name,
        'required',
        'Equipment name is required'
      );
    }

    if (name.length < 2) {
      throw new ValidationError(
        'name',
        name,
        'min_length',
        'Equipment name must be at least 2 characters'
      );
    }

    if (name.length > 100) {
      throw new ValidationError(
        'name',
        name,
        'max_length',
        'Equipment name must be less than 100 characters'
      );
    }

    const isAvailable = await this.equipmentRepository.isNameAvailable(name, organizationId, excludeId);
    if (!isAvailable) {
      throw new ValidationError(
        'name',
        name,
        'unique',
        'Equipment name is already taken within this organization'
      );
    }
  }
}
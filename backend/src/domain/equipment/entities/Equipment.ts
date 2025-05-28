import { Types } from 'mongoose';
import { IEntity } from '../../../types/core/interfaces';
import { IArchivable, IShareable } from '../../../types/core/behaviors';
import { EquipmentCategory } from '../../../types/fitness/enums/exercise';
import { Status } from '../../../types/core/enums';
import { IEquipmentSpecs } from '../interfaces/EquipmentInterfaces';

export class Equipment implements IEntity, IArchivable, IShareable {
  public readonly id: Types.ObjectId;
  public readonly name: string;
  public readonly category: EquipmentCategory;
  public readonly description: string;
  public readonly media: readonly Types.ObjectId[];
  public readonly specifications: IEquipmentSpecs;
  public readonly alternatives: readonly Types.ObjectId[];
  public readonly isAvailable: boolean;
  public readonly status: Status;
  public readonly organization: Types.ObjectId;
  public readonly createdAt: Date;
  public readonly updatedAt: Date;
  public readonly createdBy: Types.ObjectId;
  public readonly isActive: boolean;
  public readonly isDraft: boolean = false;

  constructor(data: {
    id: Types.ObjectId;
    name: string;
    category: EquipmentCategory;
    description: string;
    media?: readonly Types.ObjectId[];
    specifications: IEquipmentSpecs;
    alternatives?: readonly Types.ObjectId[];
    isAvailable?: boolean;
    status?: Status;
    organization: Types.ObjectId;
    createdAt: Date;
    updatedAt: Date;
    createdBy: Types.ObjectId;
    isActive: boolean;
  }) {
    this.id = data.id;
    this.name = data.name;
    this.category = data.category;
    this.description = data.description;
    this.media = data.media ?? [];
    this.specifications = data.specifications;
    this.alternatives = data.alternatives ?? [];
    this.isAvailable = data.isAvailable ?? true;
    this.status = data.status ?? Status.ACTIVE;
    this.organization = data.organization;
    this.createdAt = data.createdAt;
    this.updatedAt = data.updatedAt;
    this.createdBy = data.createdBy;
    this.isActive = data.isActive;
  }

  async getAlternatives(): Promise<Equipment[]> {
    // Repository implementation would handle this
    return [];
  }

  isCompatibleWith(exerciseId: Types.ObjectId): boolean {
    // Implementation would check exercise compatibility
    return true;
  }

  isEquipmentAvailable(): boolean {
    return this.isAvailable && this.isActive && this.status === Status.ACTIVE;
  }

  setAvailability(isAvailable: boolean): Equipment {
    return new Equipment({
      ...this,
      isAvailable,
      updatedAt: new Date()
    });
  }

  addAlternative(equipmentId: Types.ObjectId): Equipment {
    if (this.alternatives.some(id => id.equals(equipmentId))) {
      return this;
    }

    return new Equipment({
      ...this,
      alternatives: [...this.alternatives, equipmentId],
      updatedAt: new Date()
    });
  }

  removeAlternative(equipmentId: Types.ObjectId): Equipment {
    return new Equipment({
      ...this,
      alternatives: this.alternatives.filter(id => !id.equals(equipmentId)),
      updatedAt: new Date()
    });
  }

  update(updates: {
    name?: string;
    description?: string;
    specifications?: Partial<IEquipmentSpecs>;
    isAvailable?: boolean;
    status?: Status;
  }): Equipment {
    const updatedSpecs = updates.specifications ? {
      ...this.specifications,
      ...updates.specifications
    } : this.specifications;

    return new Equipment({
      ...this,
      name: updates.name ?? this.name,
      description: updates.description ?? this.description,
      specifications: updatedSpecs,
      isAvailable: updates.isAvailable ?? this.isAvailable,
      status: updates.status ?? this.status,
      updatedAt: new Date()
    });
  }

  // IArchivable implementation
  archive(): void {
    // Implementation would be handled by repository
  }

  restore(): void {
    // Implementation would be handled by repository
  }

  canBeDeleted(): boolean {
    // Cannot delete if it has associated exercises or is currently available for use
    return !this.isEquipmentAvailable();
  }

  getAssociationCount(): number {
    // Would return count of associated exercises, reservations, etc.
    return 0;
  }

  // IShareable implementation
  canBeSharedWith(user: any): boolean {
    // Equipment can be shared with users in the same organization
    return true;
  }

  async share(targetUser: any, permissions: readonly any[]): Promise<void> {
    // Implementation would handle sharing logic
  }
}
import { Types } from 'mongoose';
import { EquipmentCategory } from '../../../types/fitness/enums/exercise';
import { MeasurementUnit } from '../../../types/fitness/enums/progress';
import { Status } from '../../../types/core/enums';
import { Equipment } from '../entities/Equipment';
import { NewEntity } from '../../../types/core/interfaces';

export interface IMeasurement {
  readonly value: number;
  readonly unit: MeasurementUnit;
}

export interface IDimensions {
  readonly length: number;
  readonly width: number;
  readonly height: number;
  readonly unit: MeasurementUnit;
}

export interface IEquipmentSpecs {
  readonly weight?: IMeasurement;
  readonly dimensions?: IDimensions;
  readonly capacity?: IMeasurement;
  readonly features?: readonly string[];
  readonly safetyFeatures?: readonly string[];
  readonly powerRequirements?: string;
  readonly material?: string;
  readonly manufacturer?: string;
  readonly model?: string;
  readonly serialNumber?: string;
  readonly warrantyInfo?: string;
}

export interface IEquipmentCompatibility {
  readonly exerciseTypes: readonly string[];
  readonly muscleZones: readonly string[];
  readonly difficultyLevels: readonly string[];
  readonly userRequirements: readonly string[];
  readonly contraindications: readonly string[];
}

export interface IEquipmentUsageStats {
  readonly totalUsage: number;
  readonly averageSessionDuration: number;
  readonly mostActiveUsers: readonly Types.ObjectId[];
  readonly usageByTimeOfDay: Record<string, number>;
  readonly usageByDayOfWeek: Record<string, number>;
  readonly maintenanceFrequency: number;
  readonly downtime: number;
}

export interface IEquipmentSearchCriteria {
  readonly name?: string;
  readonly category?: EquipmentCategory;
  readonly isAvailable?: boolean;
  readonly status?: Status;
  readonly organizationId?: Types.ObjectId;
  readonly hasFeatures?: readonly string[];
  readonly minCapacity?: number;
  readonly maxCapacity?: number;
  readonly manufacturer?: string;
  readonly model?: string;
}

export interface IEquipmentStatistics {
  readonly totalEquipment: number;
  readonly availableEquipment: number;
  readonly equipmentByCategory: Record<EquipmentCategory, number>;
  readonly equipmentByStatus: Record<Status, number>;
  readonly averageAge: number;
  readonly utilizationRate: number;
}

export interface IEquipmentCreationData {
  readonly name: string;
  readonly category: EquipmentCategory;
  readonly description: string;
  readonly specifications: IEquipmentSpecs;
  readonly organizationId: Types.ObjectId;
  readonly isAvailable?: boolean;
  readonly status?: Status;
}

export interface IEquipmentUpdateData {
  readonly name?: string;
  readonly description?: string;
  readonly specifications?: Partial<IEquipmentSpecs>;
  readonly isAvailable?: boolean;
  readonly status?: Status;
}

export interface IEquipmentRepository {
  findById(id: Types.ObjectId): Promise<Equipment | null>;
  findByName(name: string): Promise<Equipment | null>;
  findByCategory(category: EquipmentCategory): Promise<readonly Equipment[]>;
  findByOrganization(organizationId: Types.ObjectId): Promise<readonly Equipment[]>;
  findAvailable(organizationId: Types.ObjectId): Promise<readonly Equipment[]>;
  search(criteria: IEquipmentSearchCriteria): Promise<readonly Equipment[]>;
  create(equipment: Omit<Equipment, NewEntity>): Promise<Equipment>;
  update(id: Types.ObjectId, updates: Partial<Equipment>): Promise<Equipment | null>;
  archive(id: Types.ObjectId): Promise<boolean>;
  restore(id: Types.ObjectId): Promise<boolean>;
  isNameAvailable(name: string, organizationId: Types.ObjectId, excludeId?: Types.ObjectId): Promise<boolean>;
  getStatistics(organizationId: Types.ObjectId): Promise<IEquipmentStatistics>;
  getUsageStats(equipmentId: Types.ObjectId): Promise<IEquipmentUsageStats>;
  findAlternatives(equipmentId: Types.ObjectId): Promise<readonly Equipment[]>;
  findCompatibleEquipment(exerciseId: Types.ObjectId): Promise<readonly Equipment[]>;
}

export interface IEquipmentValidationResult {
  readonly isValid: boolean;
  readonly errors: readonly string[];
  readonly warnings: readonly string[];
  readonly suggestions: readonly string[];
}

export interface IEquipmentCompatibilityService {
  checkCompatibility(equipmentId: Types.ObjectId, exerciseId: Types.ObjectId): Promise<boolean>;
  findCompatibleEquipment(exerciseId: Types.ObjectId): Promise<readonly Equipment[]>;
  findCompatibleExercises(equipmentId: Types.ObjectId): Promise<readonly Types.ObjectId[]>;
  suggestAlternatives(equipmentId: Types.ObjectId): Promise<readonly Equipment[]>;
  validateEquipmentRequirements(exerciseId: Types.ObjectId, availableEquipment: readonly Types.ObjectId[]): Promise<IEquipmentValidationResult>;
}

export interface IEquipmentReservation {
  readonly id: Types.ObjectId;
  readonly equipmentId: Types.ObjectId;
  readonly userId: Types.ObjectId;
  readonly startTime: Date;
  readonly endTime: Date;
  readonly purpose: string;
  readonly status: 'PENDING' | 'CONFIRMED' | 'IN_USE' | 'COMPLETED' | 'CANCELLED';
  readonly notes?: string;
  readonly createdAt: Date;
}

export interface IEquipmentReservationRepository {
  findByEquipmentId(equipmentId: Types.ObjectId, startDate: Date, endDate: Date): Promise<readonly IEquipmentReservation[]>;
  findByUserId(userId: Types.ObjectId): Promise<readonly IEquipmentReservation[]>;
  findConflicting(equipmentId: Types.ObjectId, startTime: Date, endTime: Date): Promise<readonly IEquipmentReservation[]>;
  create(reservation: Omit<IEquipmentReservation, 'id' | 'createdAt'>): Promise<IEquipmentReservation>;
  update(id: Types.ObjectId, updates: Partial<IEquipmentReservation>): Promise<IEquipmentReservation | null>;
  cancel(id: Types.ObjectId): Promise<boolean>;
  checkAvailability(equipmentId: Types.ObjectId, startTime: Date, endTime: Date): Promise<boolean>;
}
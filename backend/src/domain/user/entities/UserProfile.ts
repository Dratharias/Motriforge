import { Types } from 'mongoose';
import { IEntity } from '../../../types/core/interfaces.js';
import { MuscleZone } from '../../../types/fitness/enums/exercise.js';
import { MeasurementUnit } from '../../../types/fitness/enums/progress.js';
import { 
  IMeasurement, 
  InjuryRecord, 
  FitnessGoal, 
  IEmergencyContact 
} from '../interfaces/UserInterfaces.js';

/**
 * User profile containing personal and fitness information
 */
export class UserProfile implements IEntity {
  public readonly id: Types.ObjectId;
  public readonly userId: Types.ObjectId;
  public readonly dateOfBirth?: Date;
  public readonly gender?: string;
  public readonly height?: IMeasurement;
  public readonly weight?: IMeasurement;
  public readonly medicalConditions: readonly string[];
  public readonly injuries: readonly InjuryRecord[];
  public readonly fitnessGoals: readonly FitnessGoal[];
  public readonly emergencyContact?: IEmergencyContact;
  public readonly createdAt: Date;
  public readonly updatedAt: Date;
  public readonly createdBy: Types.ObjectId;
  public readonly isActive: boolean;
  public readonly isDraft: boolean = false;

  constructor(data: {
    id: Types.ObjectId;
    userId: Types.ObjectId;
    dateOfBirth?: Date;
    gender?: string;
    height?: IMeasurement;
    weight?: IMeasurement;
    medicalConditions?: readonly string[];
    injuries?: readonly InjuryRecord[];
    fitnessGoals?: readonly FitnessGoal[];
    emergencyContact?: IEmergencyContact;
    createdAt: Date;
    updatedAt: Date;
    createdBy: Types.ObjectId;
    isActive: boolean;
  }) {
    this.id = data.id;
    this.userId = data.userId;
    this.dateOfBirth = data.dateOfBirth;
    this.gender = data.gender;
    this.height = data.height;
    this.weight = data.weight;
    this.medicalConditions = data.medicalConditions ?? [];
    this.injuries = data.injuries ?? [];
    this.fitnessGoals = data.fitnessGoals ?? [];
    this.emergencyContact = data.emergencyContact;
    this.createdAt = data.createdAt;
    this.updatedAt = data.updatedAt;
    this.createdBy = data.createdBy;
    this.isActive = data.isActive;
  }

  /**
   * Calculate user's age from date of birth
   */
  getAge(): number | null {
    if (!this.dateOfBirth) return null;
    
    const now = new Date();
    const birthDate = new Date(this.dateOfBirth);
    let age = now.getFullYear() - birthDate.getFullYear();
    
    if (now.getMonth() < birthDate.getMonth() || 
        (now.getMonth() === birthDate.getMonth() && now.getDate() < birthDate.getDate())) {
      age--;
    }
    
    return age;
  }

  /**
   * Calculate BMI if height and weight are available
   */
  getBMI(): number | null {
    if (!this.height || !this.weight) return null;
    
    // Convert everything to metric for calculation
    let heightInM = this.height.value;
    let weightInKg = this.weight.value;
    
    if (this.height.unit === MeasurementUnit.INCHES) {
      heightInM = this.height.value * 0.0254; // inches to meters
    } else if (this.height.unit === MeasurementUnit.CENTIMETERS) {
      heightInM = this.height.value / 100; // cm to meters
    }
    
    if (this.weight.unit === MeasurementUnit.LBS) {
      weightInKg = this.weight.value * 0.453592; // lbs to kg
    }
    
    return weightInKg / (heightInM * heightInM);
  }

  /**
   * Check if user has injury in specific body part
   */
  hasInjury(bodyPart: MuscleZone): boolean {
    return this.injuries.some(injury => 
      injury.bodyPart === bodyPart && injury.isActive()
    );
  }

  /**
   * Get active injuries
   */
  getActiveInjuries(): readonly InjuryRecord[] {
    return this.injuries.filter(injury => injury.isActive());
  }

  /**
   * Check if user has medical conditions
   */
  hasMedicalConditions(): boolean {
    return this.medicalConditions.length > 0;
  }

  /**
   * Get BMI category
   */
  getBMICategory(): string | null {
    const bmi = this.getBMI();
    if (!bmi) return null;
    
    if (bmi < 18.5) return 'Underweight';
    if (bmi < 25) return 'Normal weight';
    if (bmi < 30) return 'Overweight';
    return 'Obese';
  }

  /**
   * Check if profile is complete for fitness assessment
   */
  isCompleteForAssessment(): boolean {
    return !!(
      this.dateOfBirth &&
      this.height &&
      this.weight &&
      this.gender
    );
  }

  /**
   * Update profile data
   */
  update(updates: {
    dateOfBirth?: Date;
    gender?: string;
    height?: IMeasurement;
    weight?: IMeasurement;
    emergencyContact?: IEmergencyContact;
  }): UserProfile {
    return new UserProfile({
      ...this,
      dateOfBirth: updates.dateOfBirth ?? this.dateOfBirth,
      gender: updates.gender ?? this.gender,
      height: updates.height ?? this.height,
      weight: updates.weight ?? this.weight,
      emergencyContact: updates.emergencyContact ?? this.emergencyContact,
      updatedAt: new Date()
    });
  }

  /**
   * Add medical condition
   */
  addMedicalCondition(condition: string): UserProfile {
    if (this.medicalConditions.includes(condition)) {
      return this;
    }

    return new UserProfile({
      ...this,
      medicalConditions: [...this.medicalConditions, condition],
      updatedAt: new Date()
    });
  }

  /**
   * Remove medical condition
   */
  removeMedicalCondition(condition: string): UserProfile {
    return new UserProfile({
      ...this,
      medicalConditions: this.medicalConditions.filter(c => c !== condition),
      updatedAt: new Date()
    });
  }
}


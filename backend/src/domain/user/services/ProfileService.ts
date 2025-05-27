import { Types } from 'mongoose';
import { UserProfile } from '../entities/UserProfile';
import { 
  IUserProfileRepository, 
  IMeasurement, 
  IEmergencyContact 
} from '../interfaces/UserInterfaces';
import { MeasurementUnit } from '../../../types/fitness/enums/progress';
import { ValidationError } from '../../../infrastructure/errors/types/ValidationError';

/**
 * Service for managing user profiles
 */
export class ProfileService {
  constructor(
    private readonly profileRepository: IUserProfileRepository
  ) {}

  /**
   * Create a new user profile
   */
  async createProfile(data: {
    userId: Types.ObjectId;
    dateOfBirth?: Date;
    gender?: string;
    height?: IMeasurement;
    weight?: IMeasurement;
    emergencyContact?: IEmergencyContact;
    createdBy: Types.ObjectId;
  }): Promise<UserProfile> {
    // Validate the data
    this.validateProfileData(data);

    const now = new Date();
    const profileId = new Types.ObjectId();

    const profile = new UserProfile({
      id: profileId,
      userId: data.userId,
      dateOfBirth: data.dateOfBirth,
      gender: data.gender,
      height: data.height,
      weight: data.weight,
      emergencyContact: data.emergencyContact,
      createdAt: now,
      updatedAt: now,
      createdBy: data.createdBy,
      isActive: true,
    });

    return await this.profileRepository.create(profile);
  }

  /**
   * Get profile by user ID
   */
  async getProfileByUserId(userId: Types.ObjectId): Promise<UserProfile | null> {
    return await this.profileRepository.findByUserId(userId);
  }

  /**
   * Update user profile
   */
  async updateProfile(
    profileId: Types.ObjectId,
    updates: {
      dateOfBirth?: Date;
      gender?: string;
      height?: IMeasurement;
      weight?: IMeasurement;
      emergencyContact?: IEmergencyContact;
    }
  ): Promise<UserProfile | null> {
    // Validate the updates
    this.validateProfileUpdates(updates);

    return await this.profileRepository.update(profileId, updates);
  }

  /**
   * Add medical condition to profile
   */
  async addMedicalCondition(
    profileId: Types.ObjectId, 
    condition: string
  ): Promise<UserProfile | null> {
    const profile = await this.profileRepository.findById(profileId);
    if (!profile) return null;

    const updatedProfile = profile.addMedicalCondition(condition);
    return await this.profileRepository.update(profileId, {
      medicalConditions: updatedProfile.medicalConditions
    });
  }

  /**
   * Remove medical condition from profile
   */
  async removeMedicalCondition(
    profileId: Types.ObjectId, 
    condition: string
  ): Promise<UserProfile | null> {
    const profile = await this.profileRepository.findById(profileId);
    if (!profile) return null;

    const updatedProfile = profile.removeMedicalCondition(condition);
    return await this.profileRepository.update(profileId, {
      medicalConditions: updatedProfile.medicalConditions
    });
  }

  /**
   * Get profile completion percentage
   */
  async getProfileCompletion(userId: Types.ObjectId): Promise<{
    percentage: number;
    missingFields: string[];
    isCompleteForAssessment: boolean;
  }> {
    const profile = await this.profileRepository.findByUserId(userId);
    
    if (!profile) {
      return {
        percentage: 0,
        missingFields: ['dateOfBirth', 'gender', 'height', 'weight', 'emergencyContact'],
        isCompleteForAssessment: false
      };
    }

    const requiredFields = ['dateOfBirth', 'gender', 'height', 'weight'];
    const optionalFields = ['emergencyContact'];
    const allFields = [...requiredFields, ...optionalFields];

    const missingFields: string[] = [];
    let completedFields = 0;

    for (const field of allFields) {
      const value = (profile as any)[field];
      if (value !== undefined && value !== null) {
        completedFields++;
      } else {
        missingFields.push(field);
      }
    }

    return {
      percentage: Math.round((completedFields / allFields.length) * 100),
      missingFields,
      isCompleteForAssessment: profile.isCompleteForAssessment()
    };
  }

  /**
   * Get users with specific medical conditions
   */
  async getUsersWithMedicalCondition(condition: string): Promise<readonly UserProfile[]> {
    return await this.profileRepository.findByMedicalCondition(condition);
  }

  /**
   * Get users with active injuries
   */
  async getUsersWithActiveInjuries(): Promise<readonly UserProfile[]> {
    return await this.profileRepository.findWithActiveInjuries();
  }

  /**
   * Get incomplete profiles
   */
  async getIncompleteProfiles(): Promise<readonly UserProfile[]> {
    return await this.profileRepository.findIncompleteProfiles();
  }

  /**
   * Calculate BMI for user
   */
  async calculateBMI(userId: Types.ObjectId): Promise<{
    bmi: number | null;
    category: string | null;
  }> {
    const profile = await this.profileRepository.findByUserId(userId);
    
    if (!profile) {
      return { bmi: null, category: null };
    }

    return {
      bmi: profile.getBMI(),
      category: profile.getBMICategory()
    };
  }

  /**
   * Validate profile data
   */
  private validateProfileData(data: {
    dateOfBirth?: Date;
    gender?: string;
    height?: IMeasurement;
    weight?: IMeasurement;
    emergencyContact?: IEmergencyContact;
  }): void {
    if (data.dateOfBirth) {
      this.validateDateOfBirth(data.dateOfBirth);
    }

    if (data.height) {
      this.validateMeasurement(data.height, 'height', { min: 50, max: 300 });
    }

    if (data.weight) {
      this.validateMeasurement(data.weight, 'weight', { min: 20, max: 500 });
    }

    if (data.emergencyContact) {
      this.validateEmergencyContact(data.emergencyContact);
    }
  }

  /**
   * Validate profile updates
   */
  private validateProfileUpdates(updates: {
    dateOfBirth?: Date;
    gender?: string;
    height?: IMeasurement;
    weight?: IMeasurement;
    emergencyContact?: IEmergencyContact;
  }): void {
    this.validateProfileData(updates);
  }

  /**
   * Validate date of birth
   */
  private validateDateOfBirth(dateOfBirth: Date): void {
    const now = new Date();
    const age = now.getFullYear() - dateOfBirth.getFullYear();
    
    if (dateOfBirth > now) {
      throw new ValidationError(
        'dateOfBirth',
        dateOfBirth,
        'future_date',
        'Date of birth cannot be in the future'
      );
    }

    if (age > 120) {
      throw new ValidationError(
        'dateOfBirth',
        dateOfBirth,
        'invalid_age',
        'Age cannot be more than 120 years'
      );
    }

    if (age < 13) {
      throw new ValidationError(
        'dateOfBirth',
        dateOfBirth,
        'min_age',
        'User must be at least 13 years old'
      );
    }
  }

  /**
   * Validate measurement values
   */
  private validateMeasurement(
    measurement: IMeasurement, 
    field: string, 
    limits: { min: number; max: number }
  ): void {
    if (measurement.value <= 0) {
      throw new ValidationError(
        field,
        measurement.value,
        'positive_value',
        `${field} must be a positive value`
      );
    }

    if (measurement.value < limits.min || measurement.value > limits.max) {
      throw new ValidationError(
        field,
        measurement.value,
        'range',
        `${field} must be between ${limits.min} and ${limits.max}`
      );
    }

    const validUnits = Object.values(MeasurementUnit);
    if (!validUnits.includes(measurement.unit)) {
      throw new ValidationError(
        `${field}.unit`,
        measurement.unit,
        'invalid_unit',
        'Invalid measurement unit'
      );
    }
  }

  /**
   * Validate emergency contact
   */
  private validateEmergencyContact(contact: IEmergencyContact): void {
    if (!contact.name || contact.name.trim().length === 0) {
      throw new ValidationError(
        'emergencyContact.name',
        contact.name,
        'required',
        'Emergency contact name is required'
      );
    }

    if (!contact.phone || contact.phone.trim().length === 0) {
      throw new ValidationError(
        'emergencyContact.phone',
        contact.phone,
        'required',
        'Emergency contact phone is required'
      );
    }

    const phoneRegex = /^[+]?[1-9]\d{0,15}$/;
    if (!phoneRegex.test(contact.phone.replace(/[\s\-()]/g, ''))) {
      throw new ValidationError(
        'emergencyContact.phone',
        contact.phone,
        'format',
        'Invalid phone number format'
      );
    }
  }
}


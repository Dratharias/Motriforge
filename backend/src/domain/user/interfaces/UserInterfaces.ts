import { Types } from 'mongoose';
import { MeasurementUnit } from '../../../types/fitness/enums/progress';
import { MuscleZone } from '../../../types/fitness/enums/exercise';
import { User } from '../entities/User';
import { UserProfile } from '../entities/UserProfile';
import { UserPreferences } from '../entities/UserPreferences';
import { NewEntity } from '@/types/core/interfaces';

/**
 * Measurement value with unit
 */
export interface IMeasurement {
  readonly value: number;
  readonly unit: MeasurementUnit;
}

/**
 * Emergency contact information
 */
export interface IEmergencyContact {
  readonly name: string;
  readonly relationship: string;
  readonly phone: string;
  readonly email?: string;
  readonly isPrimary: boolean;
}

/**
 * Reminder settings for notifications
 */
export interface IReminderSettings {
  readonly workoutReminders: boolean;
  readonly progressReminders: boolean;
  readonly reminderTime: string; // HH:MM format
  readonly frequency: 'daily' | 'weekly' | 'monthly';
  readonly pushNotifications: boolean;
  readonly emailNotifications: boolean;
  readonly reminderDaysBefore: number;
}

/**
 * Privacy settings for data sharing
 */
export interface IPrivacySettings {
  readonly shareProgress: boolean;
  readonly shareWorkouts: boolean;
  readonly publicProfile: boolean;
  readonly dataRetention: number; // days
  readonly allowAnalytics: boolean;
  readonly allowMarketing: boolean;
  readonly shareWithTrainers: boolean;
  readonly shareWithOrganization: boolean;
}

/**
 * Accessibility settings for UI adaptation
 */
export interface IAccessibilitySettings {
  readonly fontSize: 'small' | 'medium' | 'large' | 'extra-large';
  readonly highContrast: boolean;
  readonly voiceInstructions: boolean;
  readonly largeButtons: boolean;
  readonly reducedMotion: boolean;
  readonly screenReader: boolean;
  readonly colorBlindSupport: boolean;
  readonly keyboardNavigation: boolean;
}

/**
 * Injury types
 */
export enum InjuryType {
  ACUTE = 'ACUTE',
  CHRONIC = 'CHRONIC',
  OVERUSE = 'OVERUSE',
  TRAUMATIC = 'TRAUMATIC',
  DEGENERATIVE = 'DEGENERATIVE'
}

/**
 * Injury severity levels
 */
export enum InjurySeverity {
  MINOR = 'MINOR',
  MODERATE = 'MODERATE',
  SEVERE = 'SEVERE',
  CRITICAL = 'CRITICAL'
}

/**
 * Injury status
 */
export enum InjuryStatus {
  ACTIVE = 'ACTIVE',
  HEALING = 'HEALING',
  HEALED = 'HEALED',
  CHRONIC = 'CHRONIC',
  RECURRING = 'RECURRING'
}

/**
 * Exercise restriction types
 */
export enum RestrictionType {
  MOVEMENT = 'MOVEMENT',
  WEIGHT_LIMIT = 'WEIGHT_LIMIT',
  DURATION_LIMIT = 'DURATION_LIMIT',
  POSITION = 'POSITION',
  INTENSITY = 'INTENSITY'
}

/**
 * Exercise restriction information
 */
export interface IExerciseRestriction {
  readonly type: RestrictionType;
  readonly affectedMovements: readonly string[];
  readonly severity: string;
  readonly alternatives: readonly Types.ObjectId[]; // Exercise IDs
}

/**
 * Injury record
 */
export interface InjuryRecord {
  readonly id: Types.ObjectId;
  readonly userId: Types.ObjectId;
  readonly type: InjuryType;
  readonly bodyPart: MuscleZone;
  readonly severity: InjurySeverity;
  readonly description: string;
  readonly dateOccurred: Date;
  readonly dateHealed?: Date;
  readonly treatment: readonly string[];
  readonly restrictions: readonly IExerciseRestriction[];
  readonly status: InjuryStatus;
  readonly verifiedBy?: Types.ObjectId; // User ID
  readonly notes: string;
  
  isActive(): boolean;
  affectsExercise(exerciseId: Types.ObjectId): boolean;
  getRestrictions(): readonly IExerciseRestriction[];
}

/**
 * Fitness goal types
 */
export enum GoalType {
  STRENGTH = 'STRENGTH',
  ENDURANCE = 'ENDURANCE',
  WEIGHT_LOSS = 'WEIGHT_LOSS',
  MUSCLE_GAIN = 'MUSCLE_GAIN',
  FLEXIBILITY = 'FLEXIBILITY',
  PERFORMANCE = 'PERFORMANCE',
  REHABILITATION = 'REHABILITATION',
  MAINTENANCE = 'MAINTENANCE'
}

/**
 * Goal priority levels
 */
export enum GoalPriority {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL'
}

/**
 * Goal status
 */
export enum GoalStatus {
  ACTIVE = 'ACTIVE',
  PAUSED = 'PAUSED',
  ACHIEVED = 'ACHIEVED',
  ABANDONED = 'ABANDONED',
  EXPIRED = 'EXPIRED'
}

/**
 * Fitness goal
 */
export interface FitnessGoal {
  readonly id: Types.ObjectId;
  readonly userId: Types.ObjectId;
  readonly title: string;
  readonly description: string;
  readonly type: GoalType;
  readonly targetValue?: number;
  readonly currentValue?: number;
  readonly unit?: MeasurementUnit;
  readonly deadline: Date;
  readonly priority: GoalPriority;
  readonly status: GoalStatus;
  readonly createdAt: Date;
  readonly updatedAt: Date;
  
  getProgress(): number;
  isAchieved(): boolean;
  getDaysRemaining(): number;
}

/**
 * Repository interface for User operations
 */
export interface IUserRepository {
  /**
   * Find user by ID
   */
  findById(id: Types.ObjectId): Promise<User | null>;

  /**
   * Find user by email
   */
  findByEmail(email: string): Promise<User | null>;

  /**
   * Find users by organization
   */
  findByOrganization(organizationId: Types.ObjectId): Promise<readonly User[]>;

  /**
   * Find users by role
   */
  findByRole(role: string): Promise<readonly User[]>;

  /**
   * Find active users
   */
  findActive(): Promise<readonly User[]>;

  /**
   * Create a new user
   */
  create(user: Omit<User, NewEntity>): Promise<User>;

  /**
   * Update user
   */
  update(id: Types.ObjectId, updates: Partial<User>): Promise<User | null>;

  /**
   * Archive user (soft delete)
   */
  archive(id: Types.ObjectId): Promise<boolean>;

  /**
   * Restore archived user
   */
  restore(id: Types.ObjectId): Promise<boolean>;

  /**
   * Check if email is available
   */
  isEmailAvailable(email: string, excludeId?: Types.ObjectId): Promise<boolean>;

  /**
   * Update last active timestamp
   */
  updateLastActive(id: Types.ObjectId): Promise<boolean>;

  /**
   * Find users with expired sessions
   */
  findInactiveUsers(daysInactive: number): Promise<readonly User[]>;
}

/**
 * Repository interface for UserProfile operations
 */
export interface IUserProfileRepository {
  /**
   * Find profile by user ID
   */
  findByUserId(userId: Types.ObjectId): Promise<UserProfile | null>;

  /**
   * Find profile by ID
   */
  findById(id: Types.ObjectId): Promise<UserProfile | null>;

  /**
   * Create a new profile
   */
  create(profile: Omit<UserProfile, NewEntity>): Promise<UserProfile>;

  /**
   * Update profile
   */
  update(id: Types.ObjectId, updates: Partial<UserProfile>): Promise<UserProfile | null>;

  /**
   * Delete profile
   */
  delete(id: Types.ObjectId): Promise<boolean>;

  /**
   * Find profiles with specific medical conditions
   */
  findByMedicalCondition(condition: string): Promise<readonly UserProfile[]>;

  /**
   * Find profiles with active injuries
   */
  findWithActiveInjuries(): Promise<readonly UserProfile[]>;

  /**
   * Find incomplete profiles
   */
  findIncompleteProfiles(): Promise<readonly UserProfile[]>;
}

/**
 * Repository interface for UserPreferences operations
 */
export interface IUserPreferencesRepository {
  /**
   * Find preferences by user ID
   */
  findByUserId(userId: Types.ObjectId): Promise<UserPreferences | null>;

  /**
   * Find preferences by ID
   */
  findById(id: Types.ObjectId): Promise<UserPreferences | null>;

  /**
   * Create new preferences
   */
  create(preferences: Omit<UserPreferences, NewEntity>): Promise<UserPreferences>;

  /**
   * Update preferences
   */
  update(id: Types.ObjectId, updates: Partial<UserPreferences>): Promise<UserPreferences | null>;

  /**
   * Delete preferences
   */
  delete(id: Types.ObjectId): Promise<boolean>;

  /**
   * Find users with specific measurement units
   */
  findByPreferredUnits(unit: MeasurementUnit): Promise<readonly UserPreferences[]>;

  /**
   * Find users with reminders enabled
   */
  findWithRemindersEnabled(): Promise<readonly UserPreferences[]>;
}

/**
 * User statistics interface
 */
export interface IUserStatistics {
  readonly totalUsers: number;
  readonly activeUsers: number;
  readonly usersByRole: Record<string, number>;
  readonly recentlyActive: number;
  readonly completedProfiles: number;
  readonly usersWithInjuries: number;
}

/**
 * User search criteria
 */
export interface IUserSearchCriteria {
  readonly name?: string;
  readonly email?: string;
  readonly role?: string;
  readonly organizationId?: Types.ObjectId;
  readonly isActive?: boolean;
  readonly hasProfile?: boolean;
  readonly hasInjuries?: boolean;
  readonly lastActiveBefore?: Date;
  readonly lastActiveAfter?: Date;
}

/**
 * User creation data
 */
export interface IUserCreationData {
  readonly email: string;
  readonly firstName: string;
  readonly lastName: string;
  readonly role: string;
  readonly organizationId: Types.ObjectId;
  readonly profile?: {
    readonly dateOfBirth?: Date;
    readonly gender?: string;
    readonly height?: IMeasurement;
    readonly weight?: IMeasurement;
    readonly emergencyContact?: IEmergencyContact;
  };
  readonly preferences?: {
    readonly preferredUnits?: MeasurementUnit;
    readonly reminderSettings?: Partial<IReminderSettings>;
    readonly privacySettings?: Partial<IPrivacySettings>;
    readonly accessibilitySettings?: Partial<IAccessibilitySettings>;
  };
}
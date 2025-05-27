import { Types } from 'mongoose';
import { IEntity } from '../../../types/core/interfaces.js';
import { MeasurementUnit } from '../../../types/fitness/enums/progress.js';
import { WorkoutType } from '../../../types/fitness/enums/workout.js';
import { 
  IReminderSettings, 
  IPrivacySettings, 
  IAccessibilitySettings 
} from '../interfaces/UserInterfaces.js';

/**
 * User preferences for application behavior and defaults
 */
export class UserPreferences implements IEntity {
  public readonly id: Types.ObjectId;
  public readonly userId: Types.ObjectId;
  public preferredUnits: MeasurementUnit;
  public defaultWorkoutType: WorkoutType;
  public reminderSettings: IReminderSettings;
  public privacySettings: IPrivacySettings;
  public accessibilitySettings: IAccessibilitySettings;
  public readonly createdAt: Date;
  public readonly updatedAt: Date;
  public readonly createdBy: Types.ObjectId;
  public readonly isActive: boolean;
  public readonly isDraft: boolean = false;

  constructor(data: {
    id: Types.ObjectId;
    userId: Types.ObjectId;
    preferredUnits?: MeasurementUnit;
    defaultWorkoutType?: WorkoutType;
    reminderSettings?: IReminderSettings;
    privacySettings?: IPrivacySettings;
    accessibilitySettings?: IAccessibilitySettings;
    createdAt: Date;
    updatedAt: Date;
    createdBy: Types.ObjectId;
    isActive: boolean;
  }) {
    this.id = data.id;
    this.userId = data.userId;
    this.preferredUnits = data.preferredUnits ?? MeasurementUnit.KG;
    this.defaultWorkoutType = data.defaultWorkoutType ?? WorkoutType.STRENGTH_TRAINING;
    this.reminderSettings = data.reminderSettings ?? UserPreferences.createDefaultReminders();
    this.privacySettings = data.privacySettings ?? UserPreferences.createDefaultPrivacy();
    this.accessibilitySettings = data.accessibilitySettings ?? UserPreferences.createDefaultAccessibility();
    this.createdAt = data.createdAt;
    this.updatedAt = data.updatedAt;
    this.createdBy = data.createdBy;
    this.isActive = data.isActive;
  }

  /**
   * Update preferences
   */
  update(updates: {
    preferredUnits?: MeasurementUnit;
    defaultWorkoutType?: WorkoutType;
    reminderSettings?: Partial<IReminderSettings>;
    privacySettings?: Partial<IPrivacySettings>;
    accessibilitySettings?: Partial<IAccessibilitySettings>;
  }): UserPreferences {
    return new UserPreferences({
      ...this,
      preferredUnits: updates.preferredUnits ?? this.preferredUnits,
      defaultWorkoutType: updates.defaultWorkoutType ?? this.defaultWorkoutType,
      reminderSettings: {
        ...this.reminderSettings,
        ...updates.reminderSettings
      },
      privacySettings: {
        ...this.privacySettings,
        ...updates.privacySettings
      },
      accessibilitySettings: {
        ...this.accessibilitySettings,
        ...updates.accessibilitySettings
      },
      updatedAt: new Date()
    });
  }

  /**
   * Create default reminder settings
   */
  static createDefaultReminders(): IReminderSettings {
    return {
      workoutReminders: true,
      progressReminders: false,
      reminderTime: '09:00',
      frequency: 'daily',
      pushNotifications: true,
      emailNotifications: false,
      reminderDaysBefore: 1
    };
  }

  /**
   * Create default privacy settings
   */
  static createDefaultPrivacy(): IPrivacySettings {
    return {
      shareProgress: false,
      shareWorkouts: false,
      publicProfile: false,
      dataRetention: 365,
      allowAnalytics: true,
      allowMarketing: false,
      shareWithTrainers: true,
      shareWithOrganization: true
    };
  }

  /**
   * Create default accessibility settings
   */
  static createDefaultAccessibility(): IAccessibilitySettings {
    return {
      fontSize: 'medium',
      highContrast: false,
      voiceInstructions: false,
      largeButtons: false,
      reducedMotion: false,
      screenReader: false,
      colorBlindSupport: false,
      keyboardNavigation: false
    };
  }

  /**
   * Check if user allows data sharing
   */
  allowsDataSharing(): boolean {
    return this.privacySettings.shareProgress || 
           this.privacySettings.shareWorkouts || 
           this.privacySettings.allowAnalytics;
  }

  /**
   * Check if user has accessibility needs
   */
  hasAccessibilityNeeds(): boolean {
    return this.accessibilitySettings.highContrast ||
           this.accessibilitySettings.voiceInstructions ||
           this.accessibilitySettings.largeButtons ||
           this.accessibilitySettings.reducedMotion ||
           this.accessibilitySettings.screenReader ||
           this.accessibilitySettings.colorBlindSupport ||
           this.accessibilitySettings.keyboardNavigation;
  }

  /**
   * Get notification preference summary
   */
  getNotificationSummary(): {
    hasReminders: boolean;
    channels: string[];
    frequency: string;
  } {
    const channels: string[] = [];
    
    if (this.reminderSettings.pushNotifications) channels.push('push');
    if (this.reminderSettings.emailNotifications) channels.push('email');
    
    return {
      hasReminders: this.reminderSettings.workoutReminders || this.reminderSettings.progressReminders,
      channels,
      frequency: this.reminderSettings.frequency
    };
  }
}
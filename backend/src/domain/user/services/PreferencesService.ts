import { Types } from 'mongoose';
import { UserPreferences } from '../entities/UserPreferences';
import { 
  IUserPreferencesRepository, 
  IReminderSettings, 
  IPrivacySettings, 
  IAccessibilitySettings 
} from '../interfaces/UserInterfaces';
import { MeasurementUnit } from '../../../types/fitness/enums/progress';
import { WorkoutType } from '../../../types/fitness/enums/workout';

/**
 * Service for managing user preferences
 */
export class PreferencesService {
  constructor(
    private readonly preferencesRepository: IUserPreferencesRepository
  ) {}

  /**
   * Create default preferences for a new user
   */
  async createDefaultPreferences(
    userId: Types.ObjectId, 
    createdBy: Types.ObjectId
  ): Promise<UserPreferences> {
    const now = new Date();
    const preferencesId = new Types.ObjectId();

    const preferences = new UserPreferences({
      id: preferencesId,
      userId,
      createdAt: now,
      updatedAt: now,
      createdBy,
      isActive: true,
    });

    return await this.preferencesRepository.create(preferences);
  }

  /**
   * Get preferences by user ID
   */
  async getPreferencesByUserId(userId: Types.ObjectId): Promise<UserPreferences | null> {
    return await this.preferencesRepository.findByUserId(userId);
  }


/**
 * Update user preferences
 */
async updatePreferences(
  preferencesId: Types.ObjectId,
  updates: {
    preferredUnits?: MeasurementUnit;
    defaultWorkoutType?: WorkoutType;
    reminderSettings?: Partial<IReminderSettings>;
    privacySettings?: Partial<IPrivacySettings>;
    accessibilitySettings?: Partial<IAccessibilitySettings>;
  }
): Promise<UserPreferences | null> {
  // Get current preferences to merge partial updates
  const currentPreferences = await this.preferencesRepository.findById(preferencesId);
  if (!currentPreferences) return null;

  // Build the update object with merged nested objects
  const updateData: Partial<UserPreferences> = {};
  
  if (updates.preferredUnits !== undefined) {
    updateData.preferredUnits = updates.preferredUnits;
  }
  
  if (updates.defaultWorkoutType !== undefined) {
    updateData.defaultWorkoutType = updates.defaultWorkoutType;
  }
  
  if (updates.reminderSettings) {
    updateData.reminderSettings = {
      ...currentPreferences.reminderSettings,
      ...updates.reminderSettings
    };
  }
  
  if (updates.privacySettings) {
    updateData.privacySettings = {
      ...currentPreferences.privacySettings,
      ...updates.privacySettings
    };
  }
  
  if (updates.accessibilitySettings) {
    updateData.accessibilitySettings = {
      ...currentPreferences.accessibilitySettings,
      ...updates.accessibilitySettings
    };
  }

  return await this.preferencesRepository.update(preferencesId, updateData);
}

  /**
   * Update privacy settings
   */
  async updatePrivacySettings(
    preferencesId: Types.ObjectId,
    privacySettings: Partial<IPrivacySettings>
  ): Promise<UserPreferences | null> {
    return await this.updatePreferences(preferencesId, { privacySettings });
  }

  /**
   * Update accessibility settings
   */
  async updateAccessibilitySettings(
    preferencesId: Types.ObjectId,
    accessibilitySettings: Partial<IAccessibilitySettings>
  ): Promise<UserPreferences | null> {
    return await this.updatePreferences(preferencesId, { accessibilitySettings });
  }

  /**
   * Get users with reminders enabled
   */
  async getUsersWithRemindersEnabled(): Promise<readonly UserPreferences[]> {
    return await this.preferencesRepository.findWithRemindersEnabled();
  }

  /**
   * Get users with specific measurement units
   */
  async getUsersByPreferredUnits(unit: MeasurementUnit): Promise<readonly UserPreferences[]> {
    return await this.preferencesRepository.findByPreferredUnits(unit);
  }

  /**
   * Get notification summary for user
   */
  async getNotificationSummary(userId: Types.ObjectId): Promise<{
    hasReminders: boolean;
    channels: string[];
    frequency: string;
  } | null> {
    const preferences = await this.preferencesRepository.findByUserId(userId);
    return preferences?.getNotificationSummary() ?? null;
  }

  /**
   * Check if user allows data sharing
   */
  async userAllowsDataSharing(userId: Types.ObjectId): Promise<boolean> {
    const preferences = await this.preferencesRepository.findByUserId(userId);
    return preferences?.allowsDataSharing() ?? false;
  }

  /**
   * Check if user has accessibility needs
   */
  async userHasAccessibilityNeeds(userId: Types.ObjectId): Promise<boolean> {
    const preferences = await this.preferencesRepository.findByUserId(userId);
    return preferences?.hasAccessibilityNeeds() ?? false;
  }

  /**
   * Get users who need accessibility features
   */
  async getUsersWithAccessibilityNeeds(): Promise<readonly UserPreferences[]> {
    const allPreferences = await this.preferencesRepository.findWithRemindersEnabled(); // Placeholder
    return allPreferences.filter(p => p.hasAccessibilityNeeds());
  }

  /**
   * Export user preferences (for data portability)
   */
  async exportUserPreferences(userId: Types.ObjectId): Promise<Record<string, unknown> | null> {
    const preferences = await this.preferencesRepository.findByUserId(userId);
    
    if (!preferences) return null;

    return {
      preferredUnits: preferences.preferredUnits,
      defaultWorkoutType: preferences.defaultWorkoutType,
      reminderSettings: preferences.reminderSettings,
      privacySettings: preferences.privacySettings,
      accessibilitySettings: preferences.accessibilitySettings,
      exportedAt: new Date().toISOString()
    };
  }
}
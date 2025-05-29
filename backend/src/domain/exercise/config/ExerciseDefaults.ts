import { IExerciseConfig } from './IExerciseConfig';
import { 
  ExerciseType, 
  Difficulty, 
  EquipmentCategory 
} from '../../../types/fitness/enums/exercise';
import { ContraindicationType } from '../interfaces/ExerciseInterfaces';

/**
 * Default exercise system configuration
 */
export class ExerciseDefaults {
  /**
   * Get default exercise configuration
   */
  static getDefaultConfig(): IExerciseConfig {
    return {
      validation: {
        nameMinLength: 3,
        nameMaxLength: 100,
        descriptionMinLength: 10,
        descriptionMaxLength: 2000,
        maxPrimaryMuscles: 3,
        maxSecondaryMuscles: 5,
        maxEquipment: 5,
        maxTags: 10,
        maxInstructions: 20,
        maxProgressions: 10,
        maxContraindications: 10,
        maxMediaFiles: 5,
        maxPrerequisites: 3,
        maxVariations: 10,
        tagMinLength: 2,
        tagMaxLength: 30,
        requireInstructionsForPublish: true,
        requireMediaForPublish: false,
        allowDuplicateNames: false
      },
      defaults: {
        type: ExerciseType.STRENGTH,
        difficulty: Difficulty.BEGINNER_I,
        estimatedDuration: 5,
        caloriesBurnedPerMinute: 3,
        minimumAge: 13,
        maximumAge: undefined,
        isDraft: true,
        isActive: true,
        tags: [],
        equipment: []
      },
      limits: {
        maxExercisesPerUser: 1000,
        maxDraftsPerUser: 50,
        maxInstructionLength: 500,
        maxProgressionCriteria: 5,
        maxMediaFileSize: 100 * 1024 * 1024, // 100MB
        maxMediaDuration: 600, // 10 minutes
        minCaloriesBurnRate: 0.5,
        maxCaloriesBurnRate: 20,
        minDuration: 1,
        maxDuration: 180, // 3 hours
        minAge: 13,
        maxAge: 120
      },
      features: {
        enableDrafts: true,
        enableProgressions: true,
        enableContraindications: true,
        enableMedia: true,
        enableVariations: true,
        enablePrerequisites: true,
        enableTags: true,
        enableSharing: true,
        enableCloning: true,
        enableVersioning: true,
        enableReviews: true,
        enableRatings: true,
        enableComments: true
      },
      safety: {
        requireMedicalReview: false,
        autoDetectContraindications: true,
        enforceAgeRestrictions: true,
        requireSafetyWarnings: true,
        mandatoryContraindicationTypes: [
          ContraindicationType.MEDICAL,
          ContraindicationType.INJURY
        ],
        highRiskExerciseTypes: [
          ExerciseType.REHABILITATION,
          ExerciseType.SPORTS_SPECIFIC
        ],
        requiredSafetyChecks: [
          'Age verification',
          'Medical clearance',
          'Injury assessment'
        ],
        emergencyContactRequired: false
      },
      media: {
        allowedImageFormats: ['jpg', 'jpeg', 'png', 'webp', 'gif'],
        allowedVideoFormats: ['mp4', 'webm', 'avi', 'mov'],
        allowedAudioFormats: ['mp3', 'wav', 'ogg', 'aac'],
        maxImageSize: 10 * 1024 * 1024, // 10MB
        maxVideoSize: 100 * 1024 * 1024, // 100MB
        maxAudioSize: 25 * 1024 * 1024, // 25MB
        maxVideoDuration: 600, // 10 minutes
        maxAudioDuration: 1800, // 30 minutes
        requireThumbnails: true,
        autoGenerateThumbnails: true,
        compressionEnabled: true,
        cdnEnabled: true
      },
      progression: {
        enableAutoProgression: true,
        maxProgressionLevels: 10,
        minDaysBetweenProgressions: 7,
        requireProgressionCriteria: true,
        allowCrossExerciseProgression: true,
        defaultEstimatedDays: 14,
        autoSuggestProgressions: true,
        trackProgressionHistory: true
      }
    };
  }

  /**
   * Get default exercise values for creation
   */
  static getCreationDefaults() {
    const config = this.getDefaultConfig();
    return config.defaults;
  }

  /**
   * Get validation rules
   */
  static getValidationRules() {
    const config = this.getDefaultConfig();
    return config.validation;
  }

  /**
   * Get system limits
   */
  static getSystemLimits() {
    const config = this.getDefaultConfig();
    return config.limits;
  }

  /**
   * Get safety configuration
   */
  static getSafetyConfig() {
    const config = this.getDefaultConfig();
    return config.safety;
  }

  /**
   * Check if feature is enabled
   */
  static isFeatureEnabled(feature: keyof IExerciseConfig['features']): boolean {
    const config = this.getDefaultConfig();
    return config.features[feature];
  }
}


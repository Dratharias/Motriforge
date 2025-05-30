import { IExerciseConfig } from './IExerciseConfig';
import {
  ExerciseType,
  Difficulty
} from '../../../types/fitness/enums/exercise';
import { ContraindicationType } from '../interfaces/ExerciseInterfaces';

export class ExerciseDefaults {
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
        maxMediaFileSize: 100 * 1024 * 1024,
        maxMediaDuration: 600,
        minCaloriesBurnRate: 0.5,
        maxCaloriesBurnRate: 20,
        minDuration: 1,
        maxDuration: 180
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
        enforceAgeRestrictions: false,
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
          'Medical clearance',
          'Injury assessment'
        ],
        emergencyContactRequired: false
      },
      media: {
        allowedImageFormats: ['jpg', 'jpeg', 'png', 'webp', 'gif'],
        allowedVideoFormats: ['mp4', 'webm', 'avi', 'mov'],
        allowedAudioFormats: ['mp3', 'wav', 'ogg', 'aac'],
        maxImageSize: 10 * 1024 * 1024,
        maxVideoSize: 100 * 1024 * 1024,
        maxAudioSize: 25 * 1024 * 1024,
        maxVideoDuration: 600,
        maxAudioDuration: 1800,
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

  static getCreationDefaults() {
    const config = this.getDefaultConfig();
    return config.defaults;
  }

  static getValidationRules() {
    const config = this.getDefaultConfig();
    return config.validation;
  }

  static getSystemLimits() {
    const config = this.getDefaultConfig();
    return config.limits;
  }

  static getSafetyConfig() {
    const config = this.getDefaultConfig();
    return config.safety;
  }

  static isFeatureEnabled(feature: keyof IExerciseConfig['features']): boolean {
    const config = this.getDefaultConfig();
    return config.features[feature];
  }
}


import { 
  ExerciseType, 
  Difficulty, 
  MuscleZone, 
  EquipmentCategory 
} from '../../../types/fitness/enums/exercise';
import { ContraindicationType, ContraindicationSeverity } from '../interfaces/ExerciseInterfaces';

/**
 * Exercise system configuration interface
 */
export interface IExerciseConfig {
  readonly validation: IExerciseValidationConfig;
  readonly defaults: IExerciseDefaults;
  readonly limits: IExerciseLimits;
  readonly features: IExerciseFeatures;
  readonly safety: IExerciseSafetyConfig;
  readonly media: IExerciseMediaConfig;
  readonly progression: IExerciseProgressionConfig;
}

/**
 * Exercise validation configuration
 */
export interface IExerciseValidationConfig {
  readonly nameMinLength: number;
  readonly nameMaxLength: number;
  readonly descriptionMinLength: number;
  readonly descriptionMaxLength: number;
  readonly maxPrimaryMuscles: number;
  readonly maxSecondaryMuscles: number;
  readonly maxEquipment: number;
  readonly maxTags: number;
  readonly maxInstructions: number;
  readonly maxProgressions: number;
  readonly maxContraindications: number;
  readonly maxMediaFiles: number;
  readonly maxPrerequisites: number;
  readonly maxVariations: number;
  readonly tagMinLength: number;
  readonly tagMaxLength: number;
  readonly requireInstructionsForPublish: boolean;
  readonly requireMediaForPublish: boolean;
  readonly allowDuplicateNames: boolean;
}

/**
 * Exercise default values configuration
 */
export interface IExerciseDefaults {
  readonly type: ExerciseType;
  readonly difficulty: Difficulty;
  readonly estimatedDuration: number;
  readonly caloriesBurnedPerMinute: number;
  readonly minimumAge: number;
  readonly maximumAge?: number;
  readonly isDraft: boolean;
  readonly isActive: boolean;
  readonly tags: readonly string[];
  readonly equipment: readonly EquipmentCategory[];
}

/**
 * Exercise system limits configuration
 */
export interface IExerciseLimits {
  readonly maxExercisesPerUser: number;
  readonly maxDraftsPerUser: number;
  readonly maxInstructionLength: number;
  readonly maxProgressionCriteria: number;
  readonly maxMediaFileSize: number; // in bytes
  readonly maxMediaDuration: number; // in seconds
  readonly minCaloriesBurnRate: number;
  readonly maxCaloriesBurnRate: number;
  readonly minDuration: number; // in minutes
  readonly maxDuration: number; // in minutes
  readonly minAge: number;
  readonly maxAge: number;
}

/**
 * Exercise features configuration
 */
export interface IExerciseFeatures {
  readonly enableDrafts: boolean;
  readonly enableProgressions: boolean;
  readonly enableContraindications: boolean;
  readonly enableMedia: boolean;
  readonly enableVariations: boolean;
  readonly enablePrerequisites: boolean;
  readonly enableTags: boolean;
  readonly enableSharing: boolean;
  readonly enableCloning: boolean;
  readonly enableVersioning: boolean;
  readonly enableReviews: boolean;
  readonly enableRatings: boolean;
  readonly enableComments: boolean;
}

/**
 * Exercise safety configuration
 */
export interface IExerciseSafetyConfig {
  readonly requireMedicalReview: boolean;
  readonly autoDetectContraindications: boolean;
  readonly enforceAgeRestrictions: boolean;
  readonly requireSafetyWarnings: boolean;
  readonly mandatoryContraindicationTypes: readonly ContraindicationType[];
  readonly highRiskExerciseTypes: readonly ExerciseType[];
  readonly requiredSafetyChecks: readonly string[];
  readonly emergencyContactRequired: boolean;
}

/**
 * Exercise media configuration
 */
export interface IExerciseMediaConfig {
  readonly allowedImageFormats: readonly string[];
  readonly allowedVideoFormats: readonly string[];
  readonly allowedAudioFormats: readonly string[];
  readonly maxImageSize: number; // in bytes
  readonly maxVideoSize: number; // in bytes
  readonly maxAudioSize: number; // in bytes
  readonly maxVideoDuration: number; // in seconds
  readonly maxAudioDuration: number; // in seconds
  readonly requireThumbnails: boolean;
  readonly autoGenerateThumbnails: boolean;
  readonly compressionEnabled: boolean;
  readonly cdnEnabled: boolean;
}

/**
 * Exercise progression configuration
 */
export interface IExerciseProgressionConfig {
  readonly enableAutoProgression: boolean;
  readonly maxProgressionLevels: number;
  readonly minDaysBetweenProgressions: number;
  readonly requireProgressionCriteria: boolean;
  readonly allowCrossExerciseProgression: boolean;
  readonly defaultEstimatedDays: number;
  readonly autoSuggestProgressions: boolean;
  readonly trackProgressionHistory: boolean;
}


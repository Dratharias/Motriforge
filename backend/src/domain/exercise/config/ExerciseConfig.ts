import {
  ExerciseType,
  Difficulty,
  EquipmentCategory,
  MuscleZone
} from '../../../types/fitness/enums/exercise';

export interface ExerciseValidationRules {
  readonly nameMinLength: number;
  readonly nameMaxLength: number;
  readonly descriptionMinLength: number;
  readonly descriptionMaxLength: number;
  readonly maxPrimaryMuscles: number;
  readonly maxSecondaryMuscles: number;
  readonly maxEquipment: number;
  readonly maxInstructions: number;
  readonly requireInstructionsForPublish: boolean;
}

export interface ExerciseDefaults {
  readonly type: ExerciseType;
  readonly difficulty: Difficulty;
  readonly estimatedDuration: number;
  readonly caloriesBurnedPerMinute: number;
  readonly isDraft: boolean;
  readonly isActive: boolean;
  readonly equipment: readonly EquipmentCategory[];
}

export interface SafetyConfig {
  readonly highRiskTypes: readonly ExerciseType[];
  readonly highRiskDifficulties: readonly Difficulty[];
  readonly highRiskMuscles: readonly MuscleZone[];
  readonly muscleContraindications: Partial<Record<MuscleZone, readonly string[]>>; // Changed to Partial
  readonly medicalClearanceConditions: readonly string[];
}

export interface ProgressionConfig {
  readonly allowedProgressions: Record<Difficulty, readonly Difficulty[]>;
  readonly minimumDays: Record<number, number>;
  readonly difficultyLevels: Record<Difficulty, number>;
}

export interface PublishingConfig {
  readonly requireMedicalReview: readonly ExerciseType[];
  readonly requireTrainerApproval: readonly Difficulty[];
  readonly qualityThreshold: number;
}

export class ExerciseConfig {
  static readonly validation: ExerciseValidationRules = {
    nameMinLength: 3,
    nameMaxLength: 100,
    descriptionMinLength: 10,
    descriptionMaxLength: 2000,
    maxPrimaryMuscles: 3,
    maxSecondaryMuscles: 5,
    maxEquipment: 5,
    maxInstructions: 20,
    requireInstructionsForPublish: true
  };

  static readonly defaults: ExerciseDefaults = {
    type: ExerciseType.STRENGTH,
    difficulty: Difficulty.BEGINNER_I,
    estimatedDuration: 5,
    caloriesBurnedPerMinute: 3,
    isDraft: true,
    isActive: true,
    equipment: []
  };

  static readonly safety: SafetyConfig = {
    highRiskTypes: [ExerciseType.REHABILITATION, ExerciseType.SPORTS_SPECIFIC],
    highRiskDifficulties: [Difficulty.ADVANCED_II, Difficulty.ADVANCED_III, Difficulty.MASTER],
    highRiskMuscles: [MuscleZone.NECK, MuscleZone.BACK, MuscleZone.KNEE, MuscleZone.SHOULDER],
    muscleContraindications: {
      [MuscleZone.BACK]: ['lower back pain', 'herniated disc', 'sciatica'],
      [MuscleZone.NECK]: ['cervical spine injuries', 'neck pain', 'whiplash history'],
      [MuscleZone.KNEE]: ['knee pain', 'ACL injury', 'meniscus tear'],
      [MuscleZone.SHOULDER]: ['rotator cuff tear', 'shoulder impingement', 'frozen shoulder'],
      [MuscleZone.HIP]: ['hip impingement', 'hip arthritis', 'hip flexor strain'],
      [MuscleZone.ANKLE]: ['ankle sprain history', 'ankle arthritis', 'Achilles tendonitis'],
      [MuscleZone.CORE]: ['diastasis recti', 'abdominal surgery', 'hernia'],
      [MuscleZone.CHEST]: ['recent chest surgery', 'rib fractures'],
      [MuscleZone.WRIST]: ['carpal tunnel syndrome', 'wrist arthritis'],
      [MuscleZone.TRICEPS]: ['elbow tendonitis', 'triceps strain'],
      [MuscleZone.BICEPS]: ['biceps tendonitis', 'biceps rupture history'],
      [MuscleZone.FOREARM]: ['tennis elbow', 'golfer\'s elbow', 'forearm strain'],
      [MuscleZone.QUADRICEPS]: ['quadriceps strain', 'knee issues'],
      [MuscleZone.HAMSTRINGS]: ['hamstring strain', 'sciatic nerve issues'],
      [MuscleZone.GLUTES]: ['piriformis syndrome', 'hip issues'],
      [MuscleZone.CALVES]: ['calf strain', 'Achilles issues']
    }, // Remove the 'as' type assertion
    medicalClearanceConditions: [
      'cardiovascular disease', 'uncontrolled hypertension', 'recent cardiac event',
      'diabetes complications', 'severe osteoporosis', 'pregnancy complications'
    ]
  };

  static readonly progression: ProgressionConfig = {
    allowedProgressions: {
      [Difficulty.BEGINNER_I]: [Difficulty.BEGINNER_II],
      [Difficulty.BEGINNER_II]: [Difficulty.BEGINNER_III, Difficulty.INTERMEDIATE_I],
      [Difficulty.BEGINNER_III]: [Difficulty.INTERMEDIATE_I],
      [Difficulty.INTERMEDIATE_I]: [Difficulty.INTERMEDIATE_II],
      [Difficulty.INTERMEDIATE_II]: [Difficulty.INTERMEDIATE_III, Difficulty.ADVANCED_I],
      [Difficulty.INTERMEDIATE_III]: [Difficulty.ADVANCED_I],
      [Difficulty.ADVANCED_I]: [Difficulty.ADVANCED_II],
      [Difficulty.ADVANCED_II]: [Difficulty.ADVANCED_III, Difficulty.MASTER],
      [Difficulty.ADVANCED_III]: [Difficulty.MASTER],
      [Difficulty.MASTER]: []
    },
    minimumDays: { 1: 7, 2: 14, 3: 21, 4: 28 },
    difficultyLevels: {
      [Difficulty.BEGINNER_I]: 1, [Difficulty.BEGINNER_II]: 2, [Difficulty.BEGINNER_III]: 3,
      [Difficulty.INTERMEDIATE_I]: 4, [Difficulty.INTERMEDIATE_II]: 5, [Difficulty.INTERMEDIATE_III]: 6,
      [Difficulty.ADVANCED_I]: 7, [Difficulty.ADVANCED_II]: 8, [Difficulty.ADVANCED_III]: 9,
      [Difficulty.MASTER]: 10
    }
  };

  static readonly publishing: PublishingConfig = {
    requireMedicalReview: [ExerciseType.REHABILITATION],
    requireTrainerApproval: [Difficulty.ADVANCED_II, Difficulty.ADVANCED_III, Difficulty.MASTER],
    qualityThreshold: 80
  };
}
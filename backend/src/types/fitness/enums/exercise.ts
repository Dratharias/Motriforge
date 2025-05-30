/**
 * Types of exercises in the fitness domain
 */
export enum ExerciseType {
  STRENGTH = 'STRENGTH',
  CARDIO = 'CARDIO',
  FLEXIBILITY = 'FLEXIBILITY',
  BALANCE = 'BALANCE',
  ENDURANCE = 'ENDURANCE',
  REHABILITATION = 'REHABILITATION',
  FUNCTIONAL = 'FUNCTIONAL',
  SPORTS_SPECIFIC = 'SPORTS_SPECIFIC'
}

/**
 * Difficulty levels with progressive scale
 */
export enum Difficulty {
  BEGINNER_I = 'BEGINNER_I',
  BEGINNER_II = 'BEGINNER_II',
  BEGINNER_III = 'BEGINNER_III',
  INTERMEDIATE_I = 'INTERMEDIATE_I',
  INTERMEDIATE_II = 'INTERMEDIATE_II',
  INTERMEDIATE_III = 'INTERMEDIATE_III',
  ADVANCED_I = 'ADVANCED_I',
  ADVANCED_II = 'ADVANCED_II',
  ADVANCED_III = 'ADVANCED_III',
  MASTER = 'MASTER'
}

/**
 * Body zones for muscle targeting
 */
export enum MuscleZone {
  ANKLE = 'ANKLE',
  KNEE = 'KNEE',
  HIP = 'HIP',
  CALVES = 'CALVES',
  SHOULDER = 'SHOULDER',
  NECK = 'NECK',
  CHEST = 'CHEST',
  BACK = 'BACK',
  ABS = 'ABS',
  FOREARM = 'FOREARM',
  BICEPS = 'BICEPS',
  TRICEPS = 'TRICEPS',
  GLUTES = 'GLUTES',
  QUADRICEPS = 'QUADRICEPS',
  HAMSTRINGS = 'HAMSTRINGS',
  CORE = 'CORE',
  WRIST = 'WRIST',
}

/**
 * Types of muscle structures
 */
export enum MuscleType {
  TENDON = 'TENDON',
  MUSCLE = 'MUSCLE',
  LIGAMENT = 'LIGAMENT'
}

/**
 * Muscle knowledge level classification
 */
export enum MuscleLevel {
  COMMON = 'COMMON',
  UNCOMMON = 'UNCOMMON',
  MEDICAL = 'MEDICAL'
}

/**
 * Equipment categories
 */
export enum EquipmentCategory {
  FREE_WEIGHTS = 'FREE_WEIGHTS',
  MACHINES = 'MACHINES',
  CARDIO = 'CARDIO',
  BODYWEIGHT = 'BODYWEIGHT',
  RESISTANCE_BANDS = 'RESISTANCE_BANDS',
  REHABILITATION = 'REHABILITATION',
  FUNCTIONAL = 'FUNCTIONAL'
}


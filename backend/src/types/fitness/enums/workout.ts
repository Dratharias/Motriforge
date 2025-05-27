/**
 * Workout status with lifecycle states
 */
export enum WorkoutStatus {
  DRAFT = 'DRAFT',
  ACTIVE = 'ACTIVE',
  SCHEDULED = 'SCHEDULED',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  PAUSED = 'PAUSED',
  CANCELLED = 'CANCELLED',
  ARCHIVED = 'ARCHIVED',
  PUBLISHED = 'PUBLISHED',
  TEMPLATE = 'TEMPLATE'
}

/**
 * Types of workouts
 */
export enum WorkoutType {
  STRENGTH_TRAINING = 'STRENGTH_TRAINING',
  CARDIO = 'CARDIO',
  FLEXIBILITY = 'FLEXIBILITY',
  REHABILITATION = 'REHABILITATION',
  CIRCUIT = 'CIRCUIT',
  HIIT = 'HIIT',
  ENDURANCE = 'ENDURANCE',
  RECOVERY = 'RECOVERY'
}

/**
 * Types of exercise sets
 */
export enum SetType {
  REGULAR = 'REGULAR',
  WARM_UP = 'WARM_UP',
  DROP_SET = 'DROP_SET',
  SUPER_SET = 'SUPER_SET',
  REST_PAUSE = 'REST_PAUSE',
  CLUSTER = 'CLUSTER',
  FAILURE = 'FAILURE'
}


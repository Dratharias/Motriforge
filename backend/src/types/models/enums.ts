// All enum types extracted from models

/**
 * Media enums
 */
export enum MediaType {
  IMAGE = 'image',
  VIDEO = 'video',
  GIF = 'gif',
  AUDIO = 'audio',
  DOCUMENT = 'document'
}

export enum MediaCategory {
  EXERCISE = 'exercise',
  WORKOUT = 'workout',
  PROGRAM = 'program',
  EQUIPMENT = 'equipment',
  USER = 'user',
  ORGANIZATION = 'organization',
  ACHIEVEMENT = 'achievement',
  GUIDE = 'guide',
  OTHER = 'other'
}

/**
 * Muscle group enums
 */
export enum MuscleGroupCategory {
  UPPER_BODY = 'Upper Body',
  LOWER_BODY = 'Lower Body',
  ARMS = 'Arms',
  CORE = 'Core',
  BACK = 'Back',
  LEGS = 'Legs',
  FULL_BODY = 'Full Body',
  OTHER = 'Other'
}

/**
 * Workout enums
 */
export enum WorkoutGoal {
  STRENGTH = 'strength',
  HYPERTROPHY = 'hypertrophy',
  ENDURANCE = 'endurance',
  CARDIO = 'cardio',
  FLEXIBILITY = 'flexibility',
  WEIGHT_LOSS = 'weight_loss',
  REHABILITATION = 'rehabilitation',
  SKILL = 'skill',
  GENERAL_FITNESS = 'general_fitness',
  SPORT_SPECIFIC = 'sport_specific',
  BALANCE = 'balance',
  POWER = 'power'
}

export enum BlockType {
  WARM_UP = 'warm_up',
  COOL_DOWN = 'cool_down',
  STRENGTH = 'strength',
  CARDIO = 'cardio',
  CIRCUIT = 'circuit',
  SUPERSET = 'superset',
  GIANT_SET = 'giant_set',
  EMOM = 'emom',
  AMRAP = 'amrap',
  PYRAMID = 'pyramid',
  DROP_SET = 'drop_set',
  TABATA = 'tabata',
  HIIT = 'hiit',
  ACTIVE_RECOVERY = 'active_recovery',
  MOBILITY = 'mobility',
  CUSTOM = 'custom'
}

/**
 * Activity enums
 */
export enum ActivityAction {
  WORKOUT_STARTED = 'workout_started',
  WORKOUT_COMPLETED = 'workout_completed',
  WORKOUT_PAUSED = 'workout_paused',
  WORKOUT_RESUMED = 'workout_resumed',
  WORKOUT_CANCELLED = 'workout_cancelled',
  PROGRAM_STARTED = 'program_started',
  PROGRAM_COMPLETED = 'program_completed',
  PROGRAM_PAUSED = 'program_paused',
  PROGRAM_RESUMED = 'program_resumed',
  PROGRAM_CANCELLED = 'program_cancelled',
  EXERCISE_COMPLETED = 'exercise_completed',
  PERSONAL_RECORD = 'personal_record',
  GOAL_ACHIEVED = 'goal_achieved',
  FEEDBACK_RECEIVED = 'feedback_received',
  PROFILE_UPDATED = 'profile_updated',
  LOGGED_IN = 'logged_in',
  LOGGED_OUT = 'logged_out',
  JOINED_ORGANIZATION = 'joined_organization',
  CONTENT_CREATED = 'content_created',
  CONTENT_SAVED = 'content_saved'
}

/**
 * Session enums
 */
export enum SessionStatus {
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  ABANDONED = 'abandoned',
  PAUSED = 'paused',
  RESCHEDULED = 'rescheduled',
  SCHEDULED = 'scheduled',
  CANCELLED = "cancelled",
}

export enum SessionType {
  ASSESSMENT = 'assessment',
  TRAINING = 'training',
  REVIEW = 'review',
  GOAL_SETTING = 'goal_setting',
  NUTRITION = 'nutrition',
  RECOVERY = 'recovery'
}

/**
 * Goal tracking enums
 */
export enum GoalStatus {
  NOT_STARTED = 'not_started',
  IN_PROGRESS = 'in_progress',
  ON_TRACK = 'on_track',
  BEHIND = 'behind',
  ACHIEVED = 'achieved',
  MISSED = 'missed'
}

/**
 * Progression tracking enums
 */
export enum MetricType {
  WEIGHT = 'weight',
  REPS = 'reps',
  SETS = 'sets',
  DISTANCE = 'distance',
  DURATION = 'duration',
  SPEED = 'speed',
  ONE_REP_MAX = 'one_rep_max',
  VOLUME = 'volume',
  RPE = 'rpe',
  ORM = 'orm',
  HEART_RATE = 'heart_rate',
  REST_TIME = 'rest_time',
  RANGE_OF_MOTION = 'range_of_motion'
}

export enum TimeResolution {
  DAILY = 'daily',
  WEEKLY = 'weekly',
  MONTHLY = 'monthly',
  QUARTERLY = 'quarterly',
  YEARLY = 'yearly'
}

/**
 * Alert enums
 */
export enum AlertType {
  MISSED_WORKOUT = 'missed_workout',
  PERFORMANCE_DECLINE = 'performance_decline',
  GOAL_ACHIEVED = 'goal_achieved',
  INJURY_REPORTED = 'injury_reported',
  PROGRAM_COMPLETED = 'program_completed',
  INACTIVITY = 'inactivity'
}

export enum AlertSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

/**
 * Relationship enums
 */
export enum RelationshipStatus {
  PENDING = 'pending',
  ACTIVE = 'active',
  PAUSED = 'paused',
  TERMINATED = 'terminated',
  EXPIRED = 'expired'
}

/**
 * Assignment enums
 */
export enum AssignmentStatus {
  ASSIGNED = 'assigned',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
  MODIFIED = 'modified'
}

/**
 * Invitation enums
 */
export enum InvitationStatus {
  PENDING = 'pending',
  ACCEPTED = 'accepted',
  DECLINED = 'declined',
  EXPIRED = 'expired',
  REVOKED = 'revoked'
}

/**
 * Enum for exercise types
 */
export enum ExerciseType {
  Strength = 'strength',
  Cardio = 'cardio',
  Flexibility = 'flexibility',
  Balance = 'balance',
  Plyometric = 'plyometric',
  Compound = 'compound',
  Isolation = 'isolation',
  Calisthenics = 'calisthenics',
  SportSpecific = 'sport_specific',
  Rehabilitation = 'rehabilitation',
  Other = 'other',
}

/**
 * Enum for difficulty levels
 */
export enum DifficultyLevel {
  BeginnerI = 'beginner I',
  BeginnerII = 'beginner II',
  BeginnerIII = 'beginner III',
  IntermediateI = 'intermediate I',
  IntermediateII = 'intermediate II',
  IntermediateIII = 'intermediate III',
  AdvancedI = 'advanced I',
  AdvancedII = 'advanced II',
  AdvancedIII = 'advanced III',
  Expert = 'expert',
  Master = 'master',
  Elite = 'elite',
  All = 'all',
}

/**
 * Enum for muscle zones
 */
export enum MuscleZone {
  Ankle = 'ankle',
  Knee = 'knee',
  Hip = 'hip',
  Calf = 'calf',
  Shoulder = 'shoulder',
  Neck = 'neck',
  Chest = 'chest',
  Back = 'back',
  Abs = 'abs',
  Forearm = 'forearm',
  Biceps = 'biceps',
  Triceps = 'triceps',
  Glutes = 'glutes',
  Quadriceps = 'quadriceps',
  Hamstrings = 'hamstrings',
}

/**
 * Enum for muscle types
 */
export enum MuscleType {
  Muscle = 'muscle',
  Tendon = 'tendon',
}

/**
 * Enum for muscle levels
 */
export enum MuscleLevel {
  Training = 'training',
  Intermediate = 'intermediate',
  Medical = 'medical',
}

/**
 * Enum for organization types
 */
export enum OrganizationType {
  Gym = 'gym',
  Studio = 'studio',
  PersonalTrainer = 'personal_trainer',
  PhysicalTherapy = 'physical_therapy',
  Corporate = 'corporate',
  School = 'school',
  Team = 'team',
  Family = 'family',
  Other = 'other',
}

/**
 * Enum for organization visibility
 */
export enum OrganizationVisibility {
  Public = 'public',
  Private = 'private',
  Secret = 'secret',
}

/**
 * Enum for organization roles
 */
export enum OrganizationRole {
  Owner = 'owner',
  Admin = 'admin',
  Manager = 'manager',
  Trainer = 'trainer',
  Member = 'member',
  Guest = 'guest',
}

/**
 * Enum for trust levels
 */
export enum TrustLevel {
  Unverified = 'unverified',
  Verified = 'verified',
  Certified = 'certified',
  Partner = 'partner',
  Official = 'official',
}

export enum IntensityLevel {
  VeryLight = 'very_light',
  Light = 'light',
  Moderate = 'moderate',
  Vigorous = 'vigorous',
  Intense = 'intense',
  Maximum = 'maximum',
}


/**
 * Enum value types for database storage
 */
export type IntensityLevelValue = keyof typeof IntensityLevel;
export type OrganizationTypeValue = keyof typeof OrganizationType;
export type OrganizationVisibilityValue = keyof typeof OrganizationVisibility;
export type OrganizationRoleValue = keyof typeof OrganizationRole;
export type TrustLevelValue = keyof typeof TrustLevel;
export type MuscleTypeValue = keyof typeof MuscleType;
export type MuscleLevelValue = keyof typeof MuscleLevel;
export type MuscleZoneValue = keyof typeof MuscleZone;
export type DifficultyLevelValue = keyof typeof DifficultyLevel;
export type ExerciseTypeValue = keyof typeof ExerciseType;
export type MediaTypeValue = keyof typeof MediaType;
export type MediaCategoryValue = keyof typeof MediaCategory;
export type MuscleGroupCategoryValue = keyof typeof MuscleGroupCategory;
export type WorkoutGoalValue = keyof typeof WorkoutGoal;
export type BlockTypeValue = keyof typeof BlockType;
export type ActivityActionValue = keyof typeof ActivityAction;
export type SessionStatusValue = keyof typeof SessionStatus;
export type SessionTypeValue = keyof typeof SessionType;
export type GoalStatusValue = keyof typeof GoalStatus;
export type MetricTypeValue = keyof typeof MetricType;
export type TimeResolutionValue = keyof typeof TimeResolution;
export type AlertTypeValue = keyof typeof AlertType;
export type AlertSeverityValue = keyof typeof AlertSeverity;
export type RelationshipStatusValue = keyof typeof RelationshipStatus;
export type AssignmentStatusValue = keyof typeof AssignmentStatus;
export type InvitationStatusValue = keyof typeof InvitationStatus;
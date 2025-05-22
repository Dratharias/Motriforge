/**
 * Exercise progression event types
 */
export enum ProgressionEventTypes {
  // Performance tracking events
  PERFORMANCE_RECORDED = 'progression.performance.recorded',
  PERFORMANCE_UPDATED = 'progression.performance.updated',
  PERFORMANCE_DELETED = 'progression.performance.deleted',
  
  // Personal record events
  PERSONAL_RECORD_ACHIEVED = 'progression.record.achieved',
  PERSONAL_RECORD_BROKEN = 'progression.record.broken',
  
  // Goal events
  GOAL_CREATED = 'progression.goal.created',
  GOAL_UPDATED = 'progression.goal.updated',
  GOAL_ACHIEVED = 'progression.goal.achieved',
  GOAL_MISSED = 'progression.goal.missed',
  GOAL_DELETED = 'progression.goal.deleted',
  
  // Milestone events
  MILESTONE_ACHIEVED = 'progression.milestone.achieved',
  MILESTONE_MISSED = 'progression.milestone.missed',
  
  // Workout session events
  SESSION_STARTED = 'progression.session.started',
  SESSION_COMPLETED = 'progression.session.completed',
  SESSION_CANCELLED = 'progression.session.cancelled',
  
  // Analysis events
  PLATEAU_DETECTED = 'progression.analysis.plateau',
  PROGRESS_ACCELERATED = 'progression.analysis.accelerated',
  PROGRESS_SLOWED = 'progression.analysis.slowed',
  
  // Data management events
  DATA_IMPORTED = 'progression.data.imported',
  DATA_EXPORTED = 'progression.data.exported',
  DATA_CLEARED = 'progression.data.cleared'
}

/**
 * Performance metric type
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
  HEART_RATE = 'heart_rate',
  REST_TIME = 'rest_time',
  RANGE_OF_MOTION = 'range_of_motion'
}

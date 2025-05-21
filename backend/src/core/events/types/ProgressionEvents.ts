import { DomainEvent } from '../models/DomainEvent';
import { EventType } from './EventType';

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

/**
 * Performance data recorded by a user for an exercise
 */
export interface PerformanceData {
  /** User who performed the exercise */
  userId: string;
  
  /** Exercise that was performed */
  exerciseId: string;
  
  /** Date when the exercise was performed */
  date: Date;
  
  /** Performance metrics recorded */
  metrics: Record<MetricType, number>;
  
  /** Optional workout session context */
  workoutSession?: {
    id: string;
    name: string;
  };
  
  /** Optional program context */
  program?: {
    id: string;
    name: string;
  };
  
  /** Optional contextual notes */
  notes?: string;
  
  /** Optional rating of perceived exertion */
  rpe?: number;
  
  /** Optional equipment used */
  equipmentId?: string;
  
  /** Optional details about individual sets */
  sets?: Array<{
    setNumber: number;
    weight?: number;
    reps?: number;
    distance?: number;
    duration?: number;
    rpe?: number;
  }>;
}

/**
 * Personal record data
 */
export interface PersonalRecordData {
  /** User who achieved the record */
  userId: string;
  
  /** Exercise the record was achieved on */
  exerciseId: string;
  
  /** Type of metric for this record */
  metric: MetricType;
  
  /** Value of the record */
  value: number;
  
  /** Date the record was achieved */
  date: Date;
  
  /** Previous record value */
  previousRecord?: number;
  
  /** Improvement over previous record */
  improvement?: number;
  
  /** Percentage improvement */
  improvementPercentage?: number;
  
  /** Context of the record achievement */
  context?: {
    workoutSession?: {
      id: string;
      name: string;
    };
    program?: {
      id: string;
      name: string;
    };
  };
}

/**
 * Goal tracking data
 */
export interface GoalData {
  /** ID of the goal */
  id: string;
  
  /** User who set the goal */
  userId: string;
  
  /** Exercise the goal is for */
  exerciseId: string;
  
  /** Type of metric for this goal */
  metric: MetricType;
  
  /** Target value to achieve */
  targetValue: number;
  
  /** Starting value when goal was set */
  startValue: number;
  
  /** Current value toward goal */
  currentValue: number;
  
  /** Deadline for achieving the goal */
  deadline: Date;
  
  /** Progress percentage */
  progressPercentage: number;
  
  /** Whether the goal has been achieved */
  isAchieved: boolean;
  
  /** Date when goal was achieved */
  achievedDate?: Date;
  
  /** ID of trainer who set the goal (if applicable) */
  trainerId?: string;
}

/**
 * Event for when performance data is recorded
 */
export class PerformanceRecordedEvent extends DomainEvent<PerformanceData> {
  constructor(data: {
    userId: string;
    exerciseId: string;
    performanceData: PerformanceData;
  }) {
    super({
      type: ProgressionEventTypes.PERFORMANCE_RECORDED as EventType,
      entityType: 'exercise',
      entityId: data.exerciseId,
      action: 'performance.recorded',
      data: data.performanceData,
      userId: data.userId
    });
  }
}

/**
 * Event for when a personal record is achieved
 */
export class PersonalRecordAchievedEvent extends DomainEvent<PersonalRecordData> {
  constructor(data: {
    userId: string;
    exerciseId: string;
    recordData: PersonalRecordData;
  }) {
    super({
      type: ProgressionEventTypes.PERSONAL_RECORD_ACHIEVED as EventType,
      entityType: 'exercise',
      entityId: data.exerciseId,
      action: 'record.achieved',
      data: data.recordData,
      userId: data.userId
    });
  }
}

/**
 * Event for when a goal is created
 */
export class GoalCreatedEvent extends DomainEvent<GoalData> {
  constructor(data: {
    userId: string;
    exerciseId: string;
    goalData: GoalData;
  }) {
    super({
      type: ProgressionEventTypes.GOAL_CREATED as EventType,
      entityType: 'exercise',
      entityId: data.exerciseId,
      action: 'goal.created',
      data: data.goalData,
      userId: data.userId
    });
  }
}

/**
 * Event for when a goal is achieved
 */
export class GoalAchievedEvent extends DomainEvent<GoalData> {
  constructor(data: {
    userId: string;
    exerciseId: string;
    goalData: GoalData;
  }) {
    super({
      type: ProgressionEventTypes.GOAL_ACHIEVED as EventType,
      entityType: 'exercise',
      entityId: data.exerciseId,
      action: 'goal.achieved',
      data: data.goalData,
      userId: data.userId
    });
  }
}

/**
 * Event for when a workout session is completed
 */
export class SessionCompletedEvent extends DomainEvent<{
  sessionId: string;
  workoutId: string;
  userId: string;
  startTime: Date;
  endTime: Date;
  duration: number;
  exercises: Array<{
    exerciseId: string;
    metrics: Record<MetricType, number>;
  }>;
  completionPercentage: number;
  notes?: string;
}> {
  constructor(data: {
    userId: string;
    workoutId: string;
    sessionId: string;
    sessionData: {
      startTime: Date;
      endTime: Date;
      duration: number;
      exercises: Array<{
        exerciseId: string;
        metrics: Record<MetricType, number>;
      }>;
      completionPercentage: number;
      notes?: string;
    };
  }) {
    super({
      type: ProgressionEventTypes.SESSION_COMPLETED as EventType,
      entityType: 'workout',
      entityId: data.workoutId,
      action: 'session.completed',
      data: {
        sessionId: data.sessionId,
        workoutId: data.workoutId,
        userId: data.userId,
        ...data.sessionData
      },
      userId: data.userId
    });
  }
}

/**
 * Event for when a plateau is detected in progression
 */
export class PlateauDetectedEvent extends DomainEvent<{
  userId: string;
  exerciseId: string;
  metric: MetricType;
  duration: number; // days
  averageValue: number;
  fluctuationRange: number;
  suggestions: string[];
}> {
  constructor(data: {
    userId: string;
    exerciseId: string;
    plateauData: {
      metric: MetricType;
      duration: number;
      averageValue: number;
      fluctuationRange: number;
      suggestions: string[];
    };
  }) {
    super({
      type: ProgressionEventTypes.PLATEAU_DETECTED as EventType,
      entityType: 'exercise',
      entityId: data.exerciseId,
      action: 'analysis.plateau',
      data: {
        userId: data.userId,
        exerciseId: data.exerciseId,
        ...data.plateauData
      },
      userId: data.userId
    });
  }
}
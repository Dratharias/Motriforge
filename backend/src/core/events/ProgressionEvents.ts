import { EventType, GoalData, PerformanceData, PersonalRecordData, ProgressionEventTypes } from "@/types/events";
import { MetricType } from "@/types/models";
import { DomainEvent } from "./models/DomainEvent";

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
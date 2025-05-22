import { MetricType } from "../models";

/**
 * Metrics for a specific event type
 */
export interface EventTypeMetrics {
  published: number;
  processed: number;
  errors: number;
  avgProcessingTime: number;
  maxProcessingTime: number;
  processingTimeHistory: number[];
  errorTypeDistribution?: Record<string, number>;
}

/**
 * Metrics for a specific subscriber
 */
export interface SubscriberMetrics {
  processed: number;
  errors: number;
  avgProcessingTime: number;
  eventTypes: Record<string, number>;
}

/**
 * Overall event system metrics
 */
export interface EventSystemMetrics {
  totalPublished: number;
  totalProcessed: number;
  totalErrors: number;
  publishedLastMinute: number;
  processedLastMinute: number;
  queueSize: number;
  errorRate: number;
  errorRateLastMinute: number;
  eventTypeCount: number;
  mostPublishedEventType: string | null;
  mostErroredEventType: string | null;
  averageProcessingTime: number;
  byEventType: Record<string, EventTypeMetrics>;
  bySubscriber: Record<string, SubscriberMetrics>;
}


/**
 * Performance data recorded by a user for an exercise
 */
export interface PerformanceData {
  userId: string;
  exerciseId: string;
  date: Date;
  metrics: Record<MetricType, number>;
  workoutSession?: {
    id: string;
    name: string;
  };
  program?: {
    id: string;
    name: string;
  };
  notes?: string;
  rpe?: number;
  equipmentId?: string;
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
  userId: string;
  exerciseId: string;
  metric: MetricType;
  value: number;
  date: Date;
  previousRecord?: number;
  improvement?: number;
  improvementPercentage?: number;
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
  id: string;
  userId: string;
  exerciseId: string;
  metric: MetricType;
  targetValue: number;
  startValue: number;
  currentValue: number;
  deadline: Date;
  progressPercentage: number;
  isAchieved: boolean;
  achievedDate?: Date;
  trainerId?: string;
}

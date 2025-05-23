import { ObjectId } from 'mongodb';
import { ApplicationContext, IntegrationEventType } from '../enums/common';
import { IDomainEvent, IIntegrationEvent } from '../base-types';

/**
 * Base implementation for domain events
 */
export abstract class BaseDomainEvent implements IDomainEvent {
  public readonly eventId: ObjectId;
  public readonly occurredOn: Date;
  public readonly eventVersion: number;
  public readonly aggregateId: ObjectId;
  public readonly aggregateType: string;
  public readonly contextName: string;

  constructor(
    aggregateId: ObjectId,
    aggregateType: string,
    contextName: string,
    eventVersion: number = 1
  ) {
    this.eventId = new ObjectId();
    this.occurredOn = new Date();
    this.aggregateId = aggregateId;
    this.aggregateType = aggregateType;
    this.contextName = contextName;
    this.eventVersion = eventVersion;
  }

  public abstract get eventType(): string;
  public abstract get eventData(): Record<string, any>;

  public get metadata(): Record<string, any> {
    return {
      eventId: this.eventId.toHexString(),
      occurredOn: this.occurredOn.toISOString(),
      eventVersion: this.eventVersion,
      aggregateId: this.aggregateId.toHexString(),
      aggregateType: this.aggregateType,
      contextName: this.contextName,
      eventType: this.eventType
    };
  }
}

/**
 * Base implementation for integration events
 */
export abstract class BaseIntegrationEvent extends BaseDomainEvent implements IIntegrationEvent {
  public readonly sourceContext: ApplicationContext;
  public readonly targetContexts: readonly ApplicationContext[];
  public readonly correlationId: string;
  public readonly causationId?: string;

  constructor(
    aggregateId: ObjectId,
    aggregateType: string,
    sourceContext: ApplicationContext,
    targetContexts: readonly ApplicationContext[],
    correlationId?: string,
    causationId?: string,
    eventVersion: number = 1
  ) {
    super(aggregateId, aggregateType, sourceContext, eventVersion);
    this.sourceContext = sourceContext;
    this.targetContexts = targetContexts;
    this.correlationId = correlationId ?? this.eventId.toHexString();
    this.causationId = causationId;
  }

  public get metadata(): Record<string, any> {
    return {
      ...super.metadata,
      sourceContext: this.sourceContext,
      targetContexts: this.targetContexts,
      correlationId: this.correlationId,
      ...(this.causationId && { causationId: this.causationId })
    };
  }
}

/**
 * User registered integration event
 */
export class UserRegisteredIntegrationEvent extends BaseIntegrationEvent {
  public readonly userData: {
    readonly userId: ObjectId;
    readonly email: string;
    readonly firstName: string;
    readonly lastName: string;
    readonly organizationId?: ObjectId;
  };

  constructor(userData: {
    userId: ObjectId;
    email: string;
    firstName: string;
    lastName: string;
    organizationId?: ObjectId;
    correlationId?: string;
  }) {
    super(
      userData.userId,
      'User',
      ApplicationContext.USER,
      [ApplicationContext.IDENTITY, ApplicationContext.NOTIFICATION, ApplicationContext.ANALYTICS],
      userData.correlationId
    );

    this.userData = {
      userId: userData.userId,
      email: userData.email,
      firstName: userData.firstName,
      lastName: userData.lastName,
      organizationId: userData.organizationId
    };
  }

  public get eventType(): string {
    return IntegrationEventType.USER_REGISTERED;
  }

  public get eventData(): Record<string, any> {
    return {
      ...this.userData,
      userId: this.userData.userId.toHexString(),
      organizationId: this.userData.organizationId?.toHexString()
    };
  }
}

/**
 * Workout completed integration event
 */
export class WorkoutCompletedIntegrationEvent extends BaseIntegrationEvent {
  public readonly workoutData: {
    readonly workoutId: ObjectId;
    readonly userId: ObjectId;
    readonly duration: number;
    readonly completedAt: Date;
    readonly exerciseCount: number;
    readonly totalVolume?: number;
    readonly caloriesBurned?: number;
  };

  constructor(workoutData: {
    workoutId: ObjectId;
    userId: ObjectId;
    duration: number;
    exerciseCount: number;
    totalVolume?: number;
    caloriesBurned?: number;
    correlationId?: string;
  }) {
    super(
      workoutData.workoutId,
      'Workout',
      ApplicationContext.WORKOUT,
      [ApplicationContext.PROGRESSION, ApplicationContext.ANALYTICS, ApplicationContext.NOTIFICATION],
      workoutData.correlationId
    );

    this.workoutData = {
      workoutId: workoutData.workoutId,
      userId: workoutData.userId,
      duration: workoutData.duration,
      completedAt: new Date(),
      exerciseCount: workoutData.exerciseCount,
      totalVolume: workoutData.totalVolume,
      caloriesBurned: workoutData.caloriesBurned
    };
  }

  public get eventType(): string {
    return IntegrationEventType.WORKOUT_COMPLETED;
  }

  public get eventData(): Record<string, any> {
    return {
      ...this.workoutData,
      workoutId: this.workoutData.workoutId.toHexString(),
      userId: this.workoutData.userId.toHexString(),
      completedAt: this.workoutData.completedAt.toISOString()
    };
  }
}

/**
 * Goal achieved integration event
 */
export class GoalAchievedIntegrationEvent extends BaseIntegrationEvent {
  public readonly goalData: {
    readonly goalId: ObjectId;
    readonly userId: ObjectId;
    readonly goalType: string;
    readonly targetValue: number;
    readonly achievedValue: number;
    readonly achievedAt: Date;
  };

  constructor(goalData: {
    goalId: ObjectId;
    userId: ObjectId;
    goalType: string;
    targetValue: number;
    achievedValue: number;
    correlationId?: string;
  }) {
    super(
      goalData.goalId,
      'Goal',
      ApplicationContext.PROGRESSION,
      [ApplicationContext.NOTIFICATION, ApplicationContext.ANALYTICS, ApplicationContext.TRAINER],
      goalData.correlationId
    );

    this.goalData = {
      goalId: goalData.goalId,
      userId: goalData.userId,
      goalType: goalData.goalType,
      targetValue: goalData.targetValue,
      achievedValue: goalData.achievedValue,
      achievedAt: new Date()
    };
  }

  public get eventType(): string {
    return IntegrationEventType.GOAL_ACHIEVED;
  }

  public get eventData(): Record<string, any> {
    return {
      ...this.goalData,
      goalId: this.goalData.goalId.toHexString(),
      userId: this.goalData.userId.toHexString(),
      achievedAt: this.goalData.achievedAt.toISOString()
    };
  }
}

/**
 * Progress recorded integration event
 */
export class ProgressRecordedIntegrationEvent extends BaseIntegrationEvent {
  public readonly progressData: {
    readonly progressId: ObjectId;
    readonly userId: ObjectId;
    readonly exerciseId: ObjectId;
    readonly metricType: string;
    readonly previousValue?: number;
    readonly currentValue: number;
    readonly improvementPercentage?: number;
    readonly recordedAt: Date;
  };

  constructor(progressData: {
    progressId: ObjectId;
    userId: ObjectId;
    exerciseId: ObjectId;
    metricType: string;
    currentValue: number;
    previousValue?: number;
    correlationId?: string;
  }) {
    super(
      progressData.progressId,
      'Progress',
      ApplicationContext.PROGRESSION,
      [ApplicationContext.ANALYTICS, ApplicationContext.NOTIFICATION, ApplicationContext.TRAINER],
      progressData.correlationId
    );

    const improvementPercentage = progressData.previousValue 
      ? ((progressData.currentValue - progressData.previousValue) / progressData.previousValue) * 100
      : undefined;

    this.progressData = {
      progressId: progressData.progressId,
      userId: progressData.userId,
      exerciseId: progressData.exerciseId,
      metricType: progressData.metricType,
      previousValue: progressData.previousValue,
      currentValue: progressData.currentValue,
      improvementPercentage,
      recordedAt: new Date()
    };
  }

  public get eventType(): string {
    return IntegrationEventType.PROGRESS_RECORDED;
  }

  public get eventData(): Record<string, any> {
    return {
      ...this.progressData,
      progressId: this.progressData.progressId.toHexString(),
      userId: this.progressData.userId.toHexString(),
      exerciseId: this.progressData.exerciseId.toHexString(),
      recordedAt: this.progressData.recordedAt.toISOString()
    };
  }
}

/**
 * Payment processed integration event
 */
export class PaymentProcessedIntegrationEvent extends BaseIntegrationEvent {
  public readonly paymentData: {
    readonly paymentId: ObjectId;
    readonly userId: ObjectId;
    readonly organizationId?: ObjectId;
    readonly amount: number;
    readonly currency: string;
    readonly paymentMethod: string;
    readonly status: string;
    readonly processedAt: Date;
  };

  constructor(paymentData: {
    paymentId: ObjectId;
    userId: ObjectId;
    amount: number;
    currency: string;
    paymentMethod: string;
    status: string;
    organizationId?: ObjectId;
    correlationId?: string;
  }) {
    super(
      paymentData.paymentId,
      'Payment',
      ApplicationContext.ORGANIZATION, // Assuming payments are handled in org context
      [ApplicationContext.ANALYTICS, ApplicationContext.NOTIFICATION, ApplicationContext.AUDIT],
      paymentData.correlationId
    );

    this.paymentData = {
      paymentId: paymentData.paymentId,
      userId: paymentData.userId,
      organizationId: paymentData.organizationId,
      amount: paymentData.amount,
      currency: paymentData.currency,
      paymentMethod: paymentData.paymentMethod,
      status: paymentData.status,
      processedAt: new Date()
    };
  }

  public get eventType(): string {
    return IntegrationEventType.PAYMENT_PROCESSED;
  }

  public get eventData(): Record<string, any> {
    return {
      ...this.paymentData,
      paymentId: this.paymentData.paymentId.toHexString(),
      userId: this.paymentData.userId.toHexString(),
      organizationId: this.paymentData.organizationId?.toHexString(),
      processedAt: this.paymentData.processedAt.toISOString()
    };
  }
}

/**
 * Event envelope for serialization and metadata
 */
export interface EventEnvelope {
  readonly eventId: string;
  readonly eventType: string;
  readonly streamId: string;
  readonly version: number;
  readonly timestamp: string;
  readonly data: Record<string, any>;
  readonly metadata: Record<string, any>;
}

/**
 * Event stream metadata
 */
export interface EventStreamMetadata {
  readonly streamId: string;
  readonly version: number;
  readonly createdAt: Date;
  readonly updatedAt: Date;
  readonly eventCount: number;
  readonly isSnapshot: boolean;
}
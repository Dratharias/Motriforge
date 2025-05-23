import { ObjectId } from 'mongodb';
import { ApplicationContext, IntegrationEventType } from '../enums/common';
import { 
  BaseIntegrationEvent,
  UserRegisteredIntegrationEvent,
  WorkoutCompletedIntegrationEvent,
  GoalAchievedIntegrationEvent,
  ProgressRecordedIntegrationEvent,
  PaymentProcessedIntegrationEvent
} from './base-events';

/**
 * Session completed integration event
 */
export class SessionCompletedIntegrationEvent extends BaseIntegrationEvent {
  public readonly sessionData: {
    readonly sessionId: ObjectId;
    readonly trainerId: ObjectId;
    readonly clientId: ObjectId;
    readonly sessionType: string;
    readonly duration: number;
    readonly rating?: number;
    readonly notes?: string;
    readonly completedAt: Date;
  };

  constructor(sessionData: {
    sessionId: ObjectId;
    trainerId: ObjectId;
    clientId: ObjectId;
    sessionType: string;
    duration: number;
    rating?: number;
    notes?: string;
    correlationId?: string;
  }) {
    super(
      sessionData.sessionId,
      'Session',
      ApplicationContext.TRAINER,
      [ApplicationContext.PROGRESSION, ApplicationContext.ANALYTICS, ApplicationContext.NOTIFICATION],
      sessionData.correlationId
    );

    this.sessionData = {
      sessionId: sessionData.sessionId,
      trainerId: sessionData.trainerId,
      clientId: sessionData.clientId,
      sessionType: sessionData.sessionType,
      duration: sessionData.duration,
      rating: sessionData.rating,
      notes: sessionData.notes,
      completedAt: new Date()
    };
  }

  public get eventType(): string {
    return IntegrationEventType.SESSION_COMPLETED;
  }

  public get eventData(): Record<string, any> {
    return {
      ...this.sessionData,
      sessionId: this.sessionData.sessionId.toHexString(),
      trainerId: this.sessionData.trainerId.toHexString(),
      clientId: this.sessionData.clientId.toHexString(),
      completedAt: this.sessionData.completedAt.toISOString()
    };
  }
}

/**
 * Medical clearance issued integration event
 */
export class MedicalClearanceIssuedIntegrationEvent extends BaseIntegrationEvent {
  public readonly clearanceData: {
    readonly clearanceId: ObjectId;
    readonly patientId: ObjectId;
    readonly medicalProfessionalId: ObjectId;
    readonly clearanceType: string;
    readonly clearanceLevel: string;
    readonly restrictions?: string[];
    readonly validUntil?: Date;
    readonly issuedAt: Date;
  };

  constructor(clearanceData: {
    clearanceId: ObjectId;
    patientId: ObjectId;
    medicalProfessionalId: ObjectId;
    clearanceType: string;
    clearanceLevel: string;
    restrictions?: string[];
    validUntil?: Date;
    correlationId?: string;
  }) {
    super(
      clearanceData.clearanceId,
      'MedicalClearance',
      ApplicationContext.MEDICAL,
      [ApplicationContext.WORKOUT, ApplicationContext.PROGRESSION, ApplicationContext.TRAINER],
      clearanceData.correlationId
    );

    this.clearanceData = {
      clearanceId: clearanceData.clearanceId,
      patientId: clearanceData.patientId,
      medicalProfessionalId: clearanceData.medicalProfessionalId,
      clearanceType: clearanceData.clearanceType,
      clearanceLevel: clearanceData.clearanceLevel,
      restrictions: clearanceData.restrictions,
      validUntil: clearanceData.validUntil,
      issuedAt: new Date()
    };
  }

  public get eventType(): string {
    return IntegrationEventType.MEDICAL_CLEARANCE_ISSUED;
  }

  public get eventData(): Record<string, any> {
    return {
      ...this.clearanceData,
      clearanceId: this.clearanceData.clearanceId.toHexString(),
      patientId: this.clearanceData.patientId.toHexString(),
      medicalProfessionalId: this.clearanceData.medicalProfessionalId.toHexString(),
      validUntil: this.clearanceData.validUntil?.toISOString(),
      issuedAt: this.clearanceData.issuedAt.toISOString()
    };
  }
}

/**
 * Organization created integration event
 */
export class OrganizationCreatedIntegrationEvent extends BaseIntegrationEvent {
  public readonly organizationData: {
    readonly organizationId: ObjectId;
    readonly name: string;
    readonly adminUserId: ObjectId;
    readonly subscriptionTier: string;
    readonly industry?: string;
    readonly size?: string;
    readonly createdAt: Date;
  };

  constructor(organizationData: {
    organizationId: ObjectId;
    name: string;
    adminUserId: ObjectId;
    subscriptionTier: string;
    industry?: string;
    size?: string;
    correlationId?: string;
  }) {
    super(
      organizationData.organizationId,
      'Organization',
      ApplicationContext.ORGANIZATION,
      [ApplicationContext.IDENTITY, ApplicationContext.ANALYTICS, ApplicationContext.NOTIFICATION],
      organizationData.correlationId
    );

    this.organizationData = {
      organizationId: organizationData.organizationId,
      name: organizationData.name,
      adminUserId: organizationData.adminUserId,
      subscriptionTier: organizationData.subscriptionTier,
      industry: organizationData.industry,
      size: organizationData.size,
      createdAt: new Date()
    };
  }

  public get eventType(): string {
    return IntegrationEventType.ORGANIZATION_CREATED;
  }

  public get eventData(): Record<string, any> {
    return {
      ...this.organizationData,
      organizationId: this.organizationData.organizationId.toHexString(),
      adminUserId: this.organizationData.adminUserId.toHexString(),
      createdAt: this.organizationData.createdAt.toISOString()
    };
  }
}

/**
 * User updated integration event
 */
export class UserUpdatedIntegrationEvent extends BaseIntegrationEvent {
  public readonly updateData: {
    readonly userId: ObjectId;
    readonly updatedFields: string[];
    readonly previousValues: Record<string, any>;
    readonly currentValues: Record<string, any>;
    readonly updatedAt: Date;
  };

  constructor(updateData: {
    userId: ObjectId;
    updatedFields: string[];
    previousValues: Record<string, any>;
    currentValues: Record<string, any>;
    correlationId?: string;
  }) {
    super(
      updateData.userId,
      'User',
      ApplicationContext.USER,
      [ApplicationContext.IDENTITY, ApplicationContext.ANALYTICS],
      updateData.correlationId
    );

    this.updateData = {
      userId: updateData.userId,
      updatedFields: updateData.updatedFields,
      previousValues: updateData.previousValues,
      currentValues: updateData.currentValues,
      updatedAt: new Date()
    };
  }

  public get eventType(): string {
    return IntegrationEventType.USER_UPDATED;
  }

  public get eventData(): Record<string, any> {
    return {
      ...this.updateData,
      userId: this.updateData.userId.toHexString(),
      updatedAt: this.updateData.updatedAt.toISOString()
    };
  }
}

/**
 * User deactivated integration event
 */
export class UserDeactivatedIntegrationEvent extends BaseIntegrationEvent {
  public readonly deactivationData: {
    readonly userId: ObjectId;
    readonly reason: string;
    readonly deactivatedBy: ObjectId;
    readonly dataRetentionDays?: number;
    readonly deactivatedAt: Date;
  };

  constructor(deactivationData: {
    userId: ObjectId;
    reason: string;
    deactivatedBy: ObjectId;
    dataRetentionDays?: number;
    correlationId?: string;
  }) {
    super(
      deactivationData.userId,
      'User',
      ApplicationContext.USER,
      [ApplicationContext.IDENTITY, ApplicationContext.AUDIT, ApplicationContext.ANALYTICS],
      deactivationData.correlationId
    );

    this.deactivationData = {
      userId: deactivationData.userId,
      reason: deactivationData.reason,
      deactivatedBy: deactivationData.deactivatedBy,
      dataRetentionDays: deactivationData.dataRetentionDays,
      deactivatedAt: new Date()
    };
  }

  public get eventType(): string {
    return IntegrationEventType.USER_DEACTIVATED;
  }

  public get eventData(): Record<string, any> {
    return {
      ...this.deactivationData,
      userId: this.deactivationData.userId.toHexString(),
      deactivatedBy: this.deactivationData.deactivatedBy.toHexString(),
      deactivatedAt: this.deactivationData.deactivatedAt.toISOString()
    };
  }
}

/**
 * Integration event factory for creating common events
 */
export class IntegrationEventFactory {
  /**
   * Creates a user registered event
   */
  static createUserRegistered(data: {
    userId: ObjectId;
    email: string;
    firstName: string;
    lastName: string;
    organizationId?: ObjectId;
    correlationId?: string;
  }): UserRegisteredIntegrationEvent {
    return new UserRegisteredIntegrationEvent(data);
  }

  /**
   * Creates a workout completed event
   */
  static createWorkoutCompleted(data: {
    workoutId: ObjectId;
    userId: ObjectId;
    duration: number;
    exerciseCount: number;
    totalVolume?: number;
    caloriesBurned?: number;
    correlationId?: string;
  }): WorkoutCompletedIntegrationEvent {
    return new WorkoutCompletedIntegrationEvent(data);
  }

  /**
   * Creates a goal achieved event
   */
  static createGoalAchieved(data: {
    goalId: ObjectId;
    userId: ObjectId;
    goalType: string;
    targetValue: number;
    achievedValue: number;
    correlationId?: string;
  }): GoalAchievedIntegrationEvent {
    return new GoalAchievedIntegrationEvent(data);
  }

  /**
   * Creates a progress recorded event
   */
  static createProgressRecorded(data: {
    progressId: ObjectId;
    userId: ObjectId;
    exerciseId: ObjectId;
    metricType: string;
    currentValue: number;
    previousValue?: number;
    correlationId?: string;
  }): ProgressRecordedIntegrationEvent {
    return new ProgressRecordedIntegrationEvent(data);
  }

  /**
   * Creates a payment processed event
   */
  static createPaymentProcessed(data: {
    paymentId: ObjectId;
    userId: ObjectId;
    amount: number;
    currency: string;
    paymentMethod: string;
    status: string;
    organizationId?: ObjectId;
    correlationId?: string;
  }): PaymentProcessedIntegrationEvent {
    return new PaymentProcessedIntegrationEvent(data);
  }

  /**
   * Creates a session completed event
   */
  static createSessionCompleted(data: {
    sessionId: ObjectId;
    trainerId: ObjectId;
    clientId: ObjectId;
    sessionType: string;
    duration: number;
    rating?: number;
    notes?: string;
    correlationId?: string;
  }): SessionCompletedIntegrationEvent {
    return new SessionCompletedIntegrationEvent(data);
  }

  /**
   * Creates a medical clearance issued event
   */
  static createMedicalClearanceIssued(data: {
    clearanceId: ObjectId;
    patientId: ObjectId;
    medicalProfessionalId: ObjectId;
    clearanceType: string;
    clearanceLevel: string;
    restrictions?: string[];
    validUntil?: Date;
    correlationId?: string;
  }): MedicalClearanceIssuedIntegrationEvent {
    return new MedicalClearanceIssuedIntegrationEvent(data);
  }

  /**
   * Creates an organization created event
   */
  static createOrganizationCreated(data: {
    organizationId: ObjectId;
    name: string;
    adminUserId: ObjectId;
    subscriptionTier: string;
    industry?: string;
    size?: string;
    correlationId?: string;
  }): OrganizationCreatedIntegrationEvent {
    return new OrganizationCreatedIntegrationEvent(data);
  }

  /**
   * Creates a user updated event
   */
  static createUserUpdated(data: {
    userId: ObjectId;
    updatedFields: string[];
    previousValues: Record<string, any>;
    currentValues: Record<string, any>;
    correlationId?: string;
  }): UserUpdatedIntegrationEvent {
    return new UserUpdatedIntegrationEvent(data);
  }

  /**
   * Creates a user deactivated event
   */
  static createUserDeactivated(data: {
    userId: ObjectId;
    reason: string;
    deactivatedBy: ObjectId;
    dataRetentionDays?: number;
    correlationId?: string;
  }): UserDeactivatedIntegrationEvent {
    return new UserDeactivatedIntegrationEvent(data);
  }
}
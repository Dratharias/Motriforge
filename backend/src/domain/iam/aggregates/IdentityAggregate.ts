import { Types } from 'mongoose';
import { Identity } from '../entities/Identity';
import { AccessControl } from '../entities/AccessControl';
import { Session } from '../entities/Session';
import { DomainEvent, EventType } from '@/types/iam/interfaces';

export class IdentityAggregate {
  private readonly domainEvents: DomainEvent[] = [];

  constructor(
    private readonly identity: Identity,
    private readonly accessControl: AccessControl,
    private readonly activeSessions: Session[]
  ) {}

  static create(username: string, email: string): IdentityAggregate {
    const identity = Identity.create(username, email);
    const accessControl = AccessControl.create(identity.id);

    const aggregate = new IdentityAggregate(identity, accessControl, []);
    
    aggregate.addDomainEvent({
      id: new Types.ObjectId(),
      type: EventType.IDENTITY_CREATED,
      aggregateId: identity.id,
      aggregateType: 'Identity',
      eventData: {
        username: username,
        email: email
      },
      metadata: {
        correlationId: new Types.ObjectId().toString()
      },
      timestamp: new Date()
    });

    return aggregate;
  }

  getIdentity(): Identity {
    return this.identity;
  }

  getAccessControl(): AccessControl {
    return this.accessControl;
  }

  getActiveSessions(): readonly Session[] {
    return this.activeSessions.filter(s => s.isActive());
  }

  getDomainEvents(): readonly DomainEvent[] {
    return this.domainEvents;
  }

  clearDomainEvents(): void {
    this.domainEvents.length = 0;
  }

  private addDomainEvent(event: DomainEvent): void {
    this.domainEvents.push(event);
  }

  createSession(
    deviceId: Types.ObjectId,
    ipAddress: string,
    userAgent: string,
    authMethod: import('@/types/iam/interfaces').AuthenticationMethod
  ): Session {
    if (!this.identity.canAuthenticate()) {
      throw new Error('Identity cannot authenticate');
    }

    const session = Session.create(
      this.identity.id,
      deviceId,
      ipAddress,
      userAgent,
      authMethod
    );

    this.activeSessions.push(session);

    this.addDomainEvent({
      id: new Types.ObjectId(),
      type: EventType.SESSION_CREATED,
      aggregateId: this.identity.id,
      aggregateType: 'Identity',
      eventData: {
        sessionId: session.sessionId.value,
        deviceId: deviceId.toString(),
        ipAddress,
        authMethod
      },
      metadata: {
        correlationId: new Types.ObjectId().toString()
      },
      timestamp: new Date()
    });

    return session;
  }

  terminateSession(sessionId: string, reason: string): void {
    const sessionIndex = this.activeSessions.findIndex(
      s => s.sessionId.value === sessionId
    );

    if (sessionIndex >= 0) {
      const session = this.activeSessions[sessionIndex];
      const terminatedSession = session.terminate(reason);
      this.activeSessions[sessionIndex] = terminatedSession;

      this.addDomainEvent({
        id: new Types.ObjectId(),
        type: EventType.SESSION_EXPIRED,
        aggregateId: this.identity.id,
        aggregateType: 'Identity',
        eventData: {
          sessionId,
          reason
        },
        metadata: {
          correlationId: new Types.ObjectId().toString()
        },
        timestamp: new Date()
      });
    }
  }

  assignRole(roleId: Types.ObjectId): void {
    const updatedAccessControl = this.accessControl.assignRole(roleId);
    (this as any).accessControl = updatedAccessControl;

    this.addDomainEvent({
      id: new Types.ObjectId(),
      type: EventType.ROLE_ASSIGNED,
      aggregateId: this.identity.id,
      aggregateType: 'Identity',
      eventData: {
        roleId: roleId.toString()
      },
      metadata: {
        correlationId: new Types.ObjectId().toString()
      },
      timestamp: new Date()
    });
  }

  grantPermission(permissionId: Types.ObjectId): void {
    const updatedAccessControl = this.accessControl.grantPermission(permissionId);
    (this as any).accessControl = updatedAccessControl;

    this.addDomainEvent({
      id: new Types.ObjectId(),
      type: EventType.PERMISSION_GRANTED,
      aggregateId: this.identity.id,
      aggregateType: 'Identity',
      eventData: {
        permissionId: permissionId.toString()
      },
      metadata: {
        correlationId: new Types.ObjectId().toString()
      },
      timestamp: new Date()
    });
  }
}
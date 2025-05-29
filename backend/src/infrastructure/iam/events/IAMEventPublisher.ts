import { Types } from 'mongoose';
import { EventBus } from '../../events/core/EventBus';
import { ResourceType, Action, Role, EventType } from '../../../types/core/enums';
import { AccessEvent, AccessEventPayload } from './AccessEvent';
import { BaseEvent } from '@/infrastructure/events/core/BaseEvent';

export interface AccessEventData {
  readonly userId: Types.ObjectId;
  readonly resource: ResourceType;
  readonly action: Action;
  readonly organizationId: Types.ObjectId;
  readonly granted: boolean;
  readonly reason?: string;
  readonly resourceId?: Types.ObjectId;
  readonly sessionId?: string;
  readonly traceId?: string;
}

export interface RoleChangeEventData {
  readonly userId: Types.ObjectId;
  readonly previousRole: Role;
  readonly newRole: Role;
  readonly changedBy: Types.ObjectId;
  readonly organizationId: Types.ObjectId;
  readonly sessionId?: string;
  readonly traceId?: string;
}

export class IAMEventPublisher {
  constructor(private readonly eventBus: EventBus) {}

  async publishAccessEvent(data: AccessEventData): Promise<void> {
    try {
      const payload: AccessEventPayload = {
        userId: data.userId,
        resource: data.resource,
        action: data.action,
        organizationId: data.organizationId,
        granted: data.granted,
        reason: data.reason,
        resourceId: data.resourceId
      };

      const event = new AccessEvent(payload, data.sessionId, data.traceId);
      await this.eventBus.emit(event);
    } catch (error) {
      console.error('Failed to publish access event:', error);
    }
  }

  async publishAccessGranted(data: Omit<AccessEventData, 'granted'>): Promise<void> {
    await this.publishAccessEvent({ ...data, granted: true });
  }

  async publishAccessDenied(data: Omit<AccessEventData, 'granted'>): Promise<void> {
    await this.publishAccessEvent({ ...data, granted: false });
  }

  async publishRoleChange(data: RoleChangeEventData): Promise<void> {
    try {
      const event = new BaseEvent({
        type: EventType.USER_ACTION,
        source: 'IAMService',
        payload: {
          userId: data.userId,
          previousRole: data.previousRole,
          newRole: data.newRole,
          changedBy: data.changedBy,
          organizationId: data.organizationId
        },
        originUserId: data.changedBy.toString(),
        sessionId: data.sessionId,
        traceId: data.traceId,
        context: 'RoleManagement'
      });

      await this.eventBus.emit(event);
    } catch (error) {
      console.error('Failed to publish role change event:', error);
    }
  }
}


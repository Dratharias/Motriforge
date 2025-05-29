import { Types } from 'mongoose';
import { BaseEvent } from '../../events/core/BaseEvent';
import { EventType, ResourceType, Action } from '../../../types/core/enums';

export interface AccessEventPayload {
  readonly userId: Types.ObjectId;
  readonly resource: ResourceType;
  readonly action: Action;
  readonly organizationId: Types.ObjectId;
  readonly granted: boolean;
  readonly reason?: string;
  readonly resourceId?: Types.ObjectId;
}

export class AccessEvent extends BaseEvent {
  constructor(payload: AccessEventPayload, sessionId?: string, traceId?: string) {
    super({
      type: payload.granted ? EventType.ACCESS : EventType.SECURITY,
      source: 'IAMService',
      payload,
      originUserId: payload.userId.toString(),
      sessionId,
      traceId,
      context: 'AccessControl',
      metadata: {
        granted: payload.granted,
        resource: payload.resource,
        action: payload.action
      }
    });
  }

  getAccessPayload(): AccessEventPayload {
    return this.payload as AccessEventPayload;
  }

  isAccessGranted(): boolean {
    return this.getAccessPayload().granted;
  }

  getUserId(): Types.ObjectId {
    return this.getAccessPayload().userId;
  }

  getResource(): ResourceType {
    return this.getAccessPayload().resource;
  }

  getAction(): Action {
    return this.getAccessPayload().action;
  }
}


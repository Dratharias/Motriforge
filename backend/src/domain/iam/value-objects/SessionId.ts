import { SessionId as ISessionId } from '@/types/iam/interfaces';
import { randomUUID } from 'crypto';

export class SessionId implements ISessionId {
  constructor(public readonly value: string) {
    if (!this.value || this.value.trim().length === 0) {
      throw new Error('Session ID cannot be empty');
    }
  }

  static generate(): SessionId {
    return new SessionId(randomUUID());
  }

  equals(other: SessionId): boolean {
    return this.value === other.value;
  }
}


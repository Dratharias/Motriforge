import { Types } from 'mongoose';
import { Session } from '../entities/Session';
import { SessionStatus } from '@/types/iam/interfaces';

export interface ISessionRepository {
  findById(id: Types.ObjectId): Promise<Session | null>;
  findBySessionId(sessionId: string): Promise<Session | null>;
  findByIdentityId(identityId: Types.ObjectId): Promise<Session[]>;
  findActiveByIdentityId(identityId: Types.ObjectId): Promise<Session[]>;
  save(session: Session): Promise<void>;
  delete(id: Types.ObjectId): Promise<void>;
  deleteBySessionId(sessionId: string): Promise<void>;
  findByStatus(status: SessionStatus): Promise<Session[]>;
  findExpiredSessions(): Promise<Session[]>;
  cleanupExpiredSessions(): Promise<number>;
}


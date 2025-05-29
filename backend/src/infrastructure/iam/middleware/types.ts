import { Types } from 'mongoose';
import { IUser } from '../../../types/core/interfaces';

export interface IAMContext {
  user?: IUser;
  sessionId: string;
  traceId: string;
  organizationId?: Types.ObjectId;
  authenticated: boolean;
  timestamp: Date;
}

export interface AuthResult {
  success: boolean;
  user?: IUser;
  reason?: string;
}

declare module 'hono' {
  interface ContextVariableMap {
    iamContext: IAMContext;
  }
}


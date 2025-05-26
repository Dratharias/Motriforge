
import { Schema, model } from 'mongoose';
import { SessionStatus, AuthenticationMethod } from '@/types/iam/enums';
import { SessionDocument } from '../repositories/types/DocumentInterfaces';

const SessionSchema = new Schema<SessionDocument>({
  sessionId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  identityId: {
    type: Schema.Types.ObjectId,
    ref: 'Identity',
    required: true,
    index: true
  },
  deviceId: {
    type: Schema.Types.ObjectId,
    ref: 'Device',
    required: true
  },
  status: {
    type: String,
    enum: Object.values(SessionStatus),
    default: SessionStatus.ACTIVE,
    index: true
  },
  expiresAt: {
    type: Date,
    required: true,
    index: true
  },
  lastAccessedAt: {
    type: Date,
    default: Date.now
  },
  ipAddress: {
    type: String,
    required: true
  },
  userAgent: {
    type: String,
    required: true
  },
  authenticationMethod: {
    type: String,
    enum: Object.values(AuthenticationMethod),
    required: true
  },
  riskScore: {
    type: Number,
    default: 0,
    min: 0,
    max: 100
  },
  metadata: {
    type: Schema.Types.Mixed,
    default: {}
  }
}, {
  timestamps: true,
  collection: 'sessions'
});

// Indexes
SessionSchema.index({ sessionId: 1 });
SessionSchema.index({ identityId: 1, status: 1 });
SessionSchema.index({ identityId: 1, status: 1, expiresAt: 1 });
SessionSchema.index({ status: 1, expiresAt: 1 });

export const SessionModel = model<SessionDocument>('Session', SessionSchema);
import { Schema, model } from 'mongoose';
import { SessionStatus, AuthenticationMethod } from '@/types/iam/enums';

const SessionSchema = new Schema({
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
  createdAt: {
    type: Date,
    default: Date.now,
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
SessionSchema.index({ expiresAt: 1 }); // For cleanup
SessionSchema.index({ createdAt: 1 });
SessionSchema.index({ ipAddress: 1 });
SessionSchema.index({ riskScore: 1 });

// Compound indexes
SessionSchema.index({ identityId: 1, status: 1, expiresAt: 1 });
SessionSchema.index({ status: 1, expiresAt: 1 });

export const SessionModel = model('Session', SessionSchema);


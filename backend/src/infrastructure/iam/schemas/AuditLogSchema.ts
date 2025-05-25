import { Schema, model } from 'mongoose';
import { EventType, RiskLevel } from '@/types/iam/enums';

const AuditLogSchema = new Schema({
  eventType: {
    type: String,
    enum: Object.values(EventType),
    required: true,
    index: true
  },
  identityId: {
    type: Schema.Types.ObjectId,
    ref: 'Identity',
    index: true
  },
  ipAddress: {
    type: String,
    index: true
  },
  userAgent: {
    type: String
  },
  details: {
    type: Schema.Types.Mixed,
    required: true
  },
  riskLevel: {
    type: String,
    enum: Object.values(RiskLevel),
    required: true,
    index: true
  },
  timestamp: {
    type: Date,
    default: Date.now,
    index: true
  },
  correlationId: {
    type: String,
    index: true
  }
}, {
  timestamps: true,
  collection: 'audit_logs'
});

// Indexes
AuditLogSchema.index({ eventType: 1, timestamp: -1 });
AuditLogSchema.index({ identityId: 1, timestamp: -1 });
AuditLogSchema.index({ riskLevel: 1, timestamp: -1 });
AuditLogSchema.index({ correlationId: 1 });

export const AuditLogModel = model('AuditLog', AuditLogSchema);


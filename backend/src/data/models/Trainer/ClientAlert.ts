import mongoose, { Schema, Document, Types } from 'mongoose';

export enum AlertType {
  MISSED_WORKOUT = 'missed_workout',
  PERFORMANCE_DECLINE = 'performance_decline',
  GOAL_ACHIEVED = 'goal_achieved',
  INJURY_REPORTED = 'injury_reported',
  PROGRAM_COMPLETED = 'program_completed',
  INACTIVITY = 'inactivity'
}

export enum AlertSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

export interface IClientAlert extends Document {
  client: Types.ObjectId;
  trainer: Types.ObjectId;
  alertType: AlertType;
  date: Date;
  message: string;
  severity: AlertSeverity;
  isResolved: boolean;
  resolvedBy?: Types.ObjectId;
  resolvedDate?: Date;
  resolutionNotes?: string;
  relatedEntity?: {
    type: string;
    id: Types.ObjectId;
  };
  requiresAction: boolean;
  notificationSent: boolean;
  snoozeUntil?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const ClientAlertSchema: Schema = new Schema<IClientAlert>({
  client: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  trainer: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  alertType: {
    type: String,
    enum: Object.values(AlertType),
    required: true,
    index: true
  },
  date: {
    type: Date,
    default: Date.now,
    required: true,
    index: true
  },
  message: {
    type: String,
    required: true
  },
  severity: {
    type: String,
    enum: Object.values(AlertSeverity),
    required: true,
    index: true
  },
  isResolved: {
    type: Boolean,
    default: false,
    required: true,
    index: true
  },
  resolvedBy: {
    type: Schema.Types.ObjectId,
    ref: 'User'
  },
  resolvedDate: {
    type: Date
  },
  resolutionNotes: {
    type: String
  },
  relatedEntity: {
    type: {
      type: String
    },
    id: {
      type: Schema.Types.ObjectId
    }
  },
  requiresAction: {
    type: Boolean,
    default: true,
    index: true
  },
  notificationSent: {
    type: Boolean,
    default: false
  },
  snoozeUntil: {
    type: Date
  }
}, {
  timestamps: true
});

// Compound indexes for common queries
ClientAlertSchema.index({ trainer: 1, isResolved: 1, severity: 1 });
ClientAlertSchema.index({ client: 1, trainer: 1, isResolved: 1 });
ClientAlertSchema.index({ date: -1, severity: 1 });
ClientAlertSchema.index({ 'relatedEntity.type': 1, 'relatedEntity.id': 1 });

// Instance methods
ClientAlertSchema.methods.resolveAlert = async function(notes: string): Promise<IClientAlert> {
  this.isResolved = true;
  this.resolvedDate = new Date();
  this.resolvedBy = new mongoose.Types.ObjectId(); // This would be the current user's ID in practice
  this.resolutionNotes = notes;
  this.requiresAction = false;
  return this.save();
};

ClientAlertSchema.methods.snooze = async function(days: number): Promise<IClientAlert> {
  const snoozeDate = new Date();
  snoozeDate.setDate(snoozeDate.getDate() + days);
  this.snoozeUntil = snoozeDate;
  return this.save();
};

export const ClientAlertModel = mongoose.model<IClientAlert>('ClientAlert', ClientAlertSchema);
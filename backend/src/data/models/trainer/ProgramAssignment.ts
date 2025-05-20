import mongoose, { Schema, Document, Types } from 'mongoose';

export enum AssignmentStatus {
  ASSIGNED = 'assigned',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
  MODIFIED = 'modified'
}

export interface IProgramAssignment extends Document {
  client: Types.ObjectId;
  program: Types.ObjectId;
  assignedBy: Types.ObjectId;
  assignedDate: Date;
  startDate: Date;
  endDate: Date;
  status: AssignmentStatus;
  modifications: Types.ObjectId[];
  notes: string;
  progressPercentage: number;
  adherenceScore: number;
  lastActivity: Date;
  feedbackRequestDate?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const ProgramAssignmentSchema: Schema = new Schema<IProgramAssignment>({
  client: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  program: {
    type: Schema.Types.ObjectId,
    ref: 'Program',
    required: true,
    index: true
  },
  assignedBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  assignedDate: {
    type: Date,
    default: Date.now,
    required: true
  },
  startDate: {
    type: Date,
    required: true,
    index: true
  },
  endDate: {
    type: Date,
    required: true,
    index: true
  },
  status: {
    type: String,
    enum: Object.values(AssignmentStatus),
    default: AssignmentStatus.ASSIGNED,
    required: true,
    index: true
  },
  modifications: [{
    type: Schema.Types.ObjectId,
    ref: 'ProgramModification'
  }],
  notes: {
    type: String
  },
  progressPercentage: {
    type: Number,
    default: 0,
    min: 0,
    max: 100
  },
  adherenceScore: {
    type: Number,
    default: 100,
    min: 0,
    max: 100
  },
  lastActivity: {
    type: Date,
    default: Date.now
  },
  feedbackRequestDate: {
    type: Date
  }
}, {
  timestamps: true
});

// Compound indexes for common queries
ProgramAssignmentSchema.index({ client: 1, status: 1 });
ProgramAssignmentSchema.index({ assignedBy: 1, status: 1 });
ProgramAssignmentSchema.index({ client: 1, program: 1 }, { unique: true });
ProgramAssignmentSchema.index({ startDate: 1, endDate: 1 });

// Instance methods
ProgramAssignmentSchema.methods.markAsComplete = async function(): Promise<IProgramAssignment> {
  this.status = AssignmentStatus.COMPLETED;
  this.progressPercentage = 100;
  return this.save();
};

ProgramAssignmentSchema.methods.updateStatus = async function(status: AssignmentStatus): Promise<IProgramAssignment> {
  this.status = status;
  if (status === AssignmentStatus.COMPLETED) {
    this.progressPercentage = 100;
  }
  return this.save();
};

export const ProgramAssignmentModel = mongoose.model<IProgramAssignment>(
  'ProgramAssignment',
  ProgramAssignmentSchema
);
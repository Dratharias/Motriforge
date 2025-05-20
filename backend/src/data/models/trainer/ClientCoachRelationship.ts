import mongoose, { Schema, Document, Types } from 'mongoose';

export enum RelationshipStatus {
  PENDING = 'pending',
  ACTIVE = 'active',
  PAUSED = 'paused',
  TERMINATED = 'terminated',
  EXPIRED = 'expired'
}

export interface IClientCoachRelationship extends Document {
  client: Types.ObjectId;
  coach: Types.ObjectId;
  startDate: Date;
  endDate?: Date;
  status: RelationshipStatus;
  permissions: Types.ObjectId;
  notes: string;
  terminationReason?: string;
  terminatedBy?: Types.ObjectId;
  lastInteractionDate?: Date;
  createdAt: Date;
  updatedAt: Date;
  isActive(): boolean;
  terminateRelationship(reason: string): Promise<IClientCoachRelationship>;
  extendRelationship(duration: number): Promise<IClientCoachRelationship>;
}

const ClientCoachRelationshipSchema: Schema = new Schema<IClientCoachRelationship>({
  client: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  coach: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  startDate: {
    type: Date,
    required: true,
    default: Date.now
  },
  endDate: {
    type: Date,
    index: true
  },
  status: {
    type: String,
    enum: Object.values(RelationshipStatus),
    default: RelationshipStatus.PENDING,
    required: true,
    index: true
  },
  permissions: {
    type: Schema.Types.ObjectId,
    ref: 'PermissionSet',
    required: true
  },
  notes: {
    type: String
  },
  terminationReason: {
    type: String
  },
  terminatedBy: {
    type: Schema.Types.ObjectId,
    ref: 'User'
  },
  lastInteractionDate: {
    type: Date
  }
}, {
  timestamps: true
});

// Compound indexes
ClientCoachRelationshipSchema.index({ client: 1, coach: 1 }, { unique: true });
ClientCoachRelationshipSchema.index({ coach: 1, status: 1 });
ClientCoachRelationshipSchema.index({ client: 1, status: 1 });

// Instance methods
ClientCoachRelationshipSchema.methods.isActive = function(): boolean {
  return this.status === RelationshipStatus.ACTIVE && 
         (!this.endDate || new Date() < this.endDate);
};

ClientCoachRelationshipSchema.methods.terminateRelationship = async function(
  reason: string
): Promise<IClientCoachRelationship> {
  this.status = RelationshipStatus.TERMINATED;
  this.terminationReason = reason;
  this.terminatedBy = new mongoose.Types.ObjectId(); // This would be the current user's ID in practice
  return this.save();
};

ClientCoachRelationshipSchema.methods.extendRelationship = async function(
  durationDays: number
): Promise<IClientCoachRelationship> {
  const endDate = this.endDate || new Date();
  const newEndDate = new Date(endDate);
  newEndDate.setDate(newEndDate.getDate() + durationDays);
  this.endDate = newEndDate;
  
  // If relationship was expired or terminated, reactivate it
  if (this.status === RelationshipStatus.EXPIRED || this.status === RelationshipStatus.TERMINATED) {
    this.status = RelationshipStatus.ACTIVE;
  }
  
  return this.save();
};

export const ClientCoachRelationshipModel = mongoose.model<IClientCoachRelationship>(
  'ClientCoachRelationship', 
  ClientCoachRelationshipSchema
);
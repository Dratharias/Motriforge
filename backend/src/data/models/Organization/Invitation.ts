import { IInvitation, InvitationStatus } from '@/types/models';
import mongoose, { Schema } from 'mongoose';

const InvitationSchema: Schema = new Schema<IInvitation>({
  organization: {
    type: Schema.Types.ObjectId,
    ref: 'Organization',
    required: true,
    index: true
  },
  email: {
    type: String,
    required: true,
    trim: true,
    lowercase: true,
    index: true
  },
  invitedBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  role: {
    type: String,
    required: true
  },
  status: {
    type: String,
    enum: Object.values(InvitationStatus),
    default: InvitationStatus.PENDING,
    required: true,
    index: true
  },
  token: {
    type: String,
    required: true,
    unique: true
  },
  message: {
    type: String
  },
  expiresAt: {
    type: Date,
    required: true,
    index: true
  },
  acceptedAt: {
    type: Date
  },
  declinedAt: {
    type: Date
  },
  revokedAt: {
    type: Date
  },
  permissions: [{
    type: String
  }]
}, {
  timestamps: true
});

// Compound indexes for common queries
InvitationSchema.index({ organization: 1, email: 1, status: 1 });
InvitationSchema.index({ email: 1, status: 1 });

// Instance methods
InvitationSchema.methods.isExpired = function(): boolean {
  return this.status === InvitationStatus.EXPIRED || 
         this.expiresAt < new Date() ||
         this.status === InvitationStatus.REVOKED;
};

InvitationSchema.methods.accept = async function(): Promise<IInvitation> {
  if (this.isExpired()) {
    throw new Error('Cannot accept expired invitation');
  }
  
  if (this.status !== InvitationStatus.PENDING) {
    throw new Error(`Cannot accept invitation with status: ${this.status}`);
  }
  
  this.status = InvitationStatus.ACCEPTED;
  this.acceptedAt = new Date();
  return this.save();
};

InvitationSchema.methods.decline = async function(): Promise<IInvitation> {
  if (this.isExpired()) {
    throw new Error('Cannot decline expired invitation');
  }
  
  if (this.status !== InvitationStatus.PENDING) {
    throw new Error(`Cannot decline invitation with status: ${this.status}`);
  }
  
  this.status = InvitationStatus.DECLINED;
  this.declinedAt = new Date();
  return this.save();
};

InvitationSchema.methods.revoke = async function(reason?: string): Promise<IInvitation> {
  if (this.status !== InvitationStatus.PENDING) {
    throw new Error(`Cannot revoke invitation with status: ${this.status}`);
  }
  
  this.status = InvitationStatus.REVOKED;
  this.revokedAt = new Date();
  this.message = reason ?? this.message;
  return this.save();
};

// Pre-save hook to handle expiration
InvitationSchema.pre<IInvitation>('save', function(next) {
  if (this.isNew || this.isModified('expiresAt')) {
    if (this.expiresAt < new Date()) {
      this.status = InvitationStatus.EXPIRED;
    }
  }
  next();
});

export const InvitationModel = mongoose.model<IInvitation>('Invitation', InvitationSchema);
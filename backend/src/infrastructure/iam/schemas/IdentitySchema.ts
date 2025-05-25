import { Schema, model } from 'mongoose';
import { IdentityStatus } from '@/types/iam/enums';

const IdentitySchema = new Schema({
  username: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    minlength: 3,
    maxlength: 50
  },
  usernameDomain: {
    type: String,
    trim: true,
    maxlength: 100
  },
  email: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true
  },
  status: {
    type: String,
    enum: Object.values(IdentityStatus),
    default: IdentityStatus.PENDING_VERIFICATION
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  },
  lastLoginAt: {
    type: Date
  },
  failedLoginAttempts: {
    type: Number,
    default: 0,
    min: 0
  },
  lockedUntil: {
    type: Date
  },
  emailVerified: {
    type: Boolean,
    default: false
  },
  phoneVerified: {
    type: Boolean,
    default: false
  },
  mfaEnabled: {
    type: Boolean,
    default: false
  },
  attributes: {
    type: Schema.Types.Mixed,
    default: {}
  }
}, {
  timestamps: true,
  collection: 'identities'
});

// Indexes
IdentitySchema.index({ username: 1 });
IdentitySchema.index({ email: 1 });
IdentitySchema.index({ status: 1 });
IdentitySchema.index({ createdAt: 1 });
IdentitySchema.index({ lastLoginAt: 1 });

// Compound indexes
IdentitySchema.index({ username: 1, status: 1 });
IdentitySchema.index({ email: 1, status: 1 });

export const IdentityModel = model('Identity', IdentitySchema);


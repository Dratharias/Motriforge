import { Schema, model } from 'mongoose';
import { AccessLevel } from '@/types/iam/enums';

const AccessControlSchema = new Schema({
  identityId: {
    type: Schema.Types.ObjectId,
    ref: 'Identity',
    required: true,
    unique: true,
    index: true
  },
  roles: [{
    type: Schema.Types.ObjectId,
    ref: 'Role'
  }],
  permissions: [{
    type: Schema.Types.ObjectId,
    ref: 'Permission'
  }],
  accessLevel: {
    type: String,
    enum: Object.values(AccessLevel),
    default: AccessLevel.READ
  },
  effectiveFrom: {
    type: Date,
    default: Date.now,
    index: true
  },
  effectiveUntil: {
    type: Date,
    index: true
  },
  isActive: {
    type: Boolean,
    default: true,
    index: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true,
  collection: 'access_controls'
});

// Indexes
AccessControlSchema.index({ identityId: 1 });
AccessControlSchema.index({ roles: 1 });
AccessControlSchema.index({ permissions: 1 });
AccessControlSchema.index({ isActive: 1, effectiveFrom: 1, effectiveUntil: 1 });

export const AccessControlModel = model('AccessControl', AccessControlSchema);


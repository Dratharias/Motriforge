
import { Schema, model } from 'mongoose';
import { RoleDocument } from '../repositories/types/DocumentInterfaces';

const RoleSchema = new Schema<RoleDocument>({
  name: {
    value: {
      type: String,
      required: true,
      unique: true,
      trim: true
    },
    scope: {
      type: String,
      trim: true
    }
  },
  description: {
    type: String,
    required: true,
    trim: true
  },
  permissions: [{
    type: Schema.Types.ObjectId,
    ref: 'Permission'
  }],
  parentRoles: [{
    type: Schema.Types.ObjectId,
    ref: 'Role'
  }],
  childRoles: [{
    type: Schema.Types.ObjectId,
    ref: 'Role'
  }],
  isSystemRole: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true,
  collection: 'roles'
});

// Indexes
RoleSchema.index({ 'name.value': 1 });
RoleSchema.index({ isSystemRole: 1 });
RoleSchema.index({ permissions: 1 });

export const RoleModel = model<RoleDocument>('Role', RoleSchema);
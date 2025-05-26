
import { Schema, model } from 'mongoose';
import { PermissionDocument } from '../repositories/types/DocumentInterfaces';

const PermissionSchema = new Schema<PermissionDocument>({
  name: {
    value: {
      type: String,
      required: true,
      unique: true,
      trim: true
    },
    resource: {
      type: String,
      required: true,
      trim: true
    },
    action: {
      type: String,
      required: true,
      trim: true
    }
  },
  description: {
    type: String,
    required: true,
    trim: true
  },
  resource: {
    type: String,
    required: true,
    trim: true,
    index: true
  },
  action: {
    type: String,
    required: true,
    trim: true,
    index: true
  },
  conditions: {
    type: Schema.Types.Mixed
  },
  isSystemPermission: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true,
  collection: 'permissions'
});

// Indexes
PermissionSchema.index({ 'name.value': 1 });
PermissionSchema.index({ resource: 1, action: 1 });
PermissionSchema.index({ isSystemPermission: 1 });

export const PermissionModel = model<PermissionDocument>('Permission', PermissionSchema);
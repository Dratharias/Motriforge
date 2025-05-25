import { Schema, model } from 'mongoose';

const PermissionSchema = new Schema({
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
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true,
  collection: 'permissions'
});

// Indexes
PermissionSchema.index({ 'name.value': 1 });
PermissionSchema.index({ resource: 1, action: 1 });
PermissionSchema.index({ isSystemPermission: 1 });

export const PermissionModel = model('Permission', PermissionSchema);


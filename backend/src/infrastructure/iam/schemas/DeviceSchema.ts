
import { Schema, model } from 'mongoose';
import { DeviceType } from '@/types/iam/enums';
import { DeviceDocument } from '../repositories/types/DocumentInterfaces';

const DeviceSchema = new Schema<DeviceDocument>({
  fingerprint: {
    value: {
      type: String,
      required: true,
      unique: true,
      index: true
    },
    components: {
      type: Schema.Types.Mixed,
      required: true
    }
  },
  type: {
    type: String,
    enum: Object.values(DeviceType),
    required: true
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  isTrusted: {
    type: Boolean,
    default: false,
    index: true
  },
  firstSeenAt: {
    type: Date,
    default: Date.now
  },
  lastSeenAt: {
    type: Date,
    default: Date.now
  },
  attributes: {
    type: Schema.Types.Mixed,
    default: {}
  }
}, {
  timestamps: true,
  collection: 'devices'
});

// Indexes
DeviceSchema.index({ 'fingerprint.value': 1 });
DeviceSchema.index({ type: 1 });
DeviceSchema.index({ isTrusted: 1 });

export const DeviceModel = model<DeviceDocument>('Device', DeviceSchema);
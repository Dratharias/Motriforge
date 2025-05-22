import { IEquipment } from '@/types/models';
import mongoose, { Schema } from 'mongoose';

const EquipmentSchema: Schema = new Schema<IEquipment>({
  name: {
    type: String,
    required: true,
    trim: true,
    index: true
  },
  description: {
    type: String,
    required: true
  },
  aliases: [{
    type: String,
    index: true
  }],
  category: {
    type: String,
    required: true,
    index: true
  },
  subcategory: {
    type: String,
    index: true
  },
  mediaIds: [{
    type: Schema.Types.ObjectId,
    ref: 'Media'
  }],
  specifications: {
    type: Schema.Types.Mixed,
    default: {}
  },
  usage: {
    type: String
  },
  safetyNotes: [{
    type: String
  }],
  commonUses: [{
    type: String
  }],
  relatedEquipment: [{
    type: Schema.Types.ObjectId,
    ref: 'Equipment'
  }],
  tags: [{
    type: String,
    index: true
  }],
  isPlatformEquipment: {
    type: Boolean,
    default: false,
    index: true
  },
  createdBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  organization: {
    type: Schema.Types.ObjectId,
    ref: 'Organization',
    required: true,
    index: true
  },
  isArchived: {
    type: Boolean,
    default: false,
    index: true
  }
}, {
  timestamps: true
});

// Compound indexes for common queries
EquipmentSchema.index({ organization: 1, isArchived: 1 });
EquipmentSchema.index({ category: 1, subcategory: 1 });
EquipmentSchema.index({ isPlatformEquipment: 1, isArchived: 1 });

// Text search index
EquipmentSchema.index({
  name: 'text',
  description: 'text',
  aliases: 'text',
  tags: 'text',
  commonUses: 'text'
}, {
  weights: {
    name: 10,
    aliases: 8,
    tags: 5,
    commonUses: 3,
    description: 1
  },
  name: 'equipment_text_search'
});

export const EquipmentModel = mongoose.model<IEquipment>('Equipment', EquipmentSchema);
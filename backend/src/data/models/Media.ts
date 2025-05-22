import { IMedia, MediaType, MediaCategory } from '@/types/models';
import mongoose, { Schema, Types } from 'mongoose';

const MediaSchema: Schema = new Schema<IMedia>({
  title: {
    type: String,
    required: true,
    trim: true,
    index: true
  },
  description: {
    type: String
  },
  type: {
    type: String,
    enum: MediaType,
    required: true,
    index: true
  },
  category: {
    type: String,
    enum: MediaCategory,
    required: true,
    index: true
  },
  url: {
    type: String,
    required: true
  },
  mimeType: {
    type: String,
    required: true
  },
  sizeInBytes: {
    type: Number,
    required: true,
    min: 0
  },
  tags: [{
    type: String,
    index: true
  }],
  organizationVisibility: [{
    type: Types.ObjectId,
    ref: 'OrganizationVisibilityInfo',
    index: true
  }],
  metadata: {
    type: Schema.Types.Mixed,
    default: {}
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
MediaSchema.index({ organization: 1, isArchived: 1 });
MediaSchema.index({ createdBy: 1, isArchived: 1 });
MediaSchema.index({ type: 1, category: 1 });

// Text search index
MediaSchema.index({
  title: 'text',
  description: 'text',
  tags: 'text'
}, {
  weights: {
    title: 10,
    tags: 5,
    description: 1
  },
  name: 'media_text_search'
});

export const MediaModel = mongoose.model<IMedia>('Media', MediaSchema);
import mongoose, { Schema, Document, Types } from 'mongoose';

export enum MediaType {
  IMAGE = 'image',
  VIDEO = 'video',
  GIF = 'gif',
  AUDIO = 'audio',
  DOCUMENT = 'document'
}

export enum MediaCategory {
  EXERCISE = 'exercise',
  WORKOUT = 'workout',
  PROGRAM = 'program',
  EQUIPMENT = 'equipment',
  USER = 'user',
  ORGANIZATION = 'organization',
  ACHIEVEMENT = 'achievement',
  GUIDE = 'guide',
  OTHER = 'other'
}

export interface IMedia extends Document {
  title: string;
  description: string;
  type: MediaType;
  category: MediaCategory;
  url: string;
  mimeType: string;
  sizeInBytes: number;
  tags: string[];
  organizationVisibility: Types.ObjectId;
  metadata: Record<string, any>;
  createdBy: Types.ObjectId;
  organization: Types.ObjectId;
  isArchived: boolean;
  createdAt: Date;
  updatedAt: Date;
}

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
    enum: Object.values(MediaType),
    required: true,
    index: true
  },
  category: {
    type: String,
    enum: Object.values(MediaCategory),
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
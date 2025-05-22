import { IMediaVariant } from '@/types/models';
import mongoose, { Schema } from 'mongoose';

const MediaVariantSchema: Schema = new Schema<IMediaVariant>({
  mediaId: {
    type: Schema.Types.ObjectId,
    ref: 'Media',
    required: true,
    index: true
  },
  url: {
    type: String,
    required: true
  },
  width: {
    type: Number,
    required: true,
    min: 0
  },
  height: {
    type: Number,
    required: true,
    min: 0
  },
  quality: {
    type: String,
    required: true,
    index: true
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
  purpose: {
    type: String,
    required: true,
    index: true
  },
  metadata: {
    type: Schema.Types.Mixed,
    default: {}
  }
}, {
  timestamps: true
});

// Compound index for finding variants by media and purpose/quality
MediaVariantSchema.index({ mediaId: 1, purpose: 1 });
MediaVariantSchema.index({ mediaId: 1, quality: 1 });

export const MediaVariantModel = mongoose.model<IMediaVariant>('MediaVariant', MediaVariantSchema);
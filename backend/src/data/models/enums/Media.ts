import { IMediaCategoryInfo, IMediaTypeInfo, MediaCategory, MediaType } from '@/types/models';
import mongoose, { Schema } from 'mongoose';

/** ============================
 *  This file list media
 *  - Type
 *  - Category
 ** ============================ */

/** ========================
 *  Media Type
 ** ======================== */

const MediaTypeInfoSchema: Schema = new Schema<IMediaTypeInfo>({
  type: { 
    type: String, 
    enum: MediaType, 
    required: true, 
    unique: true 
  },
  label: { type: String, required: true },
  description: { type: String, required: true },
  icon: { type: String, required: true },
  color: { type: String, required: true },
  allowedMimeTypes: { type: [String], required: true },
  maxFileSize: { type: Number, required: true },
  supportedResolutions: { type: [String], required: true },
  supportedFeatures: { type: [String], required: true }
}, {
  timestamps: true
});

MediaTypeInfoSchema.index({ type: 1 });

export const MediaTypeInfoModel = mongoose.model<IMediaTypeInfo>('MediaTypeInfo', MediaTypeInfoSchema);


/** ========================
 *  Media Category
 ** ======================== */

const MediaCategoryInfoSchema: Schema = new Schema<IMediaCategoryInfo>({
  category: { 
    type: String, 
    enum: MediaCategory, 
    required: true, 
    unique: true 
  },
  label: { type: String, required: true },
  description: { type: String, required: true },
  icon: { type: String, required: true },
  color: { type: String, required: true },
  recommendedTypes: { type: [String], required: true },
  recommendedDimensions: { type: String, required: true },
  storageLocation: { type: String, required: true },
  visibilityDefault: { type: String, required: true }
}, {
  timestamps: true
});

MediaCategoryInfoSchema.index({ category: 1 });

export const MediaCategoryInfoModel = mongoose.model<IMediaCategoryInfo>('MediaCategoryInfo', MediaCategoryInfoSchema);
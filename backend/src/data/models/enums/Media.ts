import mongoose, { Schema, Document } from 'mongoose';

/** ============================
 *  This file list media
 *  - Type
 *  - Category
 ** ============================ */

/** ========================
 *  Media Type
 ** ======================== */

const mediaTypeEnum = [
  'image',
  'video',
  'gif',
  'audio',
  'document'
] as const;

export type MediaTypeValue = typeof mediaTypeEnum[number];

export interface IMediaTypeInfo extends Document {
  type: MediaTypeValue;
  label: string;
  description: string;
  icon: string;
  color: string;
  allowedMimeTypes: string[];
  maxFileSize: number; // in bytes
  supportedResolutions: string[];
  supportedFeatures: string[];
}

const MediaTypeInfoSchema: Schema = new Schema<IMediaTypeInfo>({
  type: { 
    type: String, 
    enum: mediaTypeEnum, 
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

const mediaCategoryEnum = [
  'exercise',
  'workout',
  'program',
  'equipment',
  'user',
  'organization',
  'achievement',
  'guide',
  'other'
] as const;

export type MediaCategoryValue = typeof mediaCategoryEnum[number];

export interface IMediaCategoryInfo extends Document {
  category: MediaCategoryValue;
  label: string;
  description: string;
  icon: string;
  color: string;
  recommendedTypes: string[];
  recommendedDimensions: string;
  storageLocation: string;
  visibilityDefault: string;
}

const MediaCategoryInfoSchema: Schema = new Schema<IMediaCategoryInfo>({
  category: { 
    type: String, 
    enum: mediaCategoryEnum, 
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
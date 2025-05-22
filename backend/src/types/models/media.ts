// Media and related types

import { Types } from 'mongoose';
import { IBaseModel, IOrganizationContext } from './common';
import { MediaType, MediaCategory } from './enums';

/**
 * Core media interface
 */
export interface IMedia extends IBaseModel, IOrganizationContext {
  readonly title: string;
  readonly description: string;
  readonly type: MediaType;
  readonly category: MediaCategory;
  readonly url: string;
  readonly mimeType: string;
  readonly sizeInBytes: number;
  readonly tags: readonly string[];
  readonly organizationVisibility: Types.ObjectId;
  readonly metadata: Record<string, any>;
}

/**
 * Media variant interface
 */
export interface IMediaVariant extends IBaseModel {
  readonly mediaId: Types.ObjectId;
  readonly url: string;
  readonly width: number;
  readonly height: number;
  readonly quality: string;
  readonly mimeType: string;
  readonly sizeInBytes: number;
  readonly purpose: string;
  readonly metadata: Record<string, any>;
}

/**
 * Media note interface
 */
export interface IMediaNote extends IBaseModel {
  readonly media: Types.ObjectId;
  readonly creator: Types.ObjectId;
  readonly timestamp: number;
  readonly comment: string;
  readonly drawingData?: string;
  readonly visibleToClient: boolean;
  readonly relatedExercise?: Types.ObjectId;
  readonly relatedWorkoutSession?: Types.ObjectId;
  readonly tags: readonly string[];
}

/**
 * Media type info interface
 */
export interface IMediaTypeInfo extends IBaseModel {
  readonly type: MediaType;
  readonly label: string;
  readonly description: string;
  readonly icon: string;
  readonly color: string;
  readonly allowedMimeTypes: readonly string[];
  readonly maxFileSize: number;
  readonly supportedResolutions: readonly string[];
  readonly supportedFeatures: readonly string[];
}

/**
 * Media category info interface
 */
export interface IMediaCategoryInfo extends IBaseModel {
  readonly category: MediaCategory;
  readonly label: string;
  readonly description: string;
  readonly icon: string;
  readonly color: string;
  readonly recommendedTypes: readonly string[];
  readonly recommendedDimensions: string;
  readonly storageLocation: string;
  readonly visibilityDefault: string;
}
import { BaseRepository } from './BaseRepository';
import { Database } from '../database/Database';
import { LoggerFacade } from '../../core/logging/LoggerFacade';
import { EventMediator } from '../../core/events/EventMediator';
import { ObjectId, Filter, Document, OptionalUnlessRequiredId } from 'mongodb';
import { EntityNotFoundError, DatabaseError } from '../../core/error/exceptions/DatabaseError';

/**
 * Media type enumeration
 */
export enum MediaType {
  IMAGE = 'image',
  VIDEO = 'video',
  GIF = 'gif',
  AUDIO = 'audio',
  DOCUMENT = 'document'
}

/**
 * Media category enumeration
 */
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

/**
 * Media entity interface
 */
export interface IMedia extends Document {
  _id?: ObjectId;
  title: string;
  description: string;
  type: MediaType;
  category: MediaCategory;
  url: string;
  mimeType: string;
  sizeInBytes: number;
  tags: string[];
  organizationVisibility: ObjectId;
  metadata: Record<string, any>;
  createdBy: ObjectId;
  organization: ObjectId;
  isArchived: boolean;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Media variant interface for different sizes/formats
 */
export interface IMediaVariant extends Document {
  _id?: ObjectId;
  mediaId: ObjectId;
  url: string;
  width?: number;
  height?: number;
  quality: string;
  mimeType: string;
  sizeInBytes: number;
  purpose: string; // thumbnail, preview, original, etc.
  metadata: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Media creation data
 */
export interface MediaCreationData {
  title: string;
  description?: string;
  type: MediaType;
  category: MediaCategory;
  url: string;
  mimeType: string;
  sizeInBytes: number;
  tags?: string[];
  organizationVisibility: ObjectId;
  metadata?: Record<string, any>;
  createdBy: ObjectId;
  organization: ObjectId;
}

/**
 * Media update data
 */
export interface MediaUpdateData {
  title?: string;
  description?: string;
  tags?: string[];
  metadata?: Record<string, any>;
  isArchived?: boolean;
}

/**
 * Media search criteria
 */
export interface MediaSearchCriteria {
  type?: MediaType;
  category?: MediaCategory;
  organizationId?: ObjectId;
  createdBy?: ObjectId;
  tags?: string[];
  isArchived?: boolean;
  searchTerm?: string;
}

/**
 * Repository for managing media files and their variants
 */
export class MediaRepository extends BaseRepository<IMedia> {
  private readonly mediaVariantCollection: string = 'media_variants';

  constructor(
    db: Database,
    logger: LoggerFacade,
    eventMediator?: EventMediator
  ) {
    super('media', db, logger, eventMediator);
  }

  /**
   * Create new media with optional variants
   * 
   * @param mediaData - Media creation data
   * @param variants - Optional media variants
   * @returns Created media
   */
  public async createMedia(
    mediaData: MediaCreationData, 
    variants?: Partial<IMediaVariant>[]
  ): Promise<IMedia> {
    return await this.withTransaction(async (transaction) => {
      try {
        const now = new Date();
        
        const media: OptionalUnlessRequiredId<IMedia> = {
          title: mediaData.title,
          description: mediaData.description ?? '',
          type: mediaData.type,
          category: mediaData.category,
          url: mediaData.url,
          mimeType: mediaData.mimeType,
          sizeInBytes: mediaData.sizeInBytes,
          tags: mediaData.tags ?? [],
          organizationVisibility: mediaData.organizationVisibility,
          metadata: mediaData.metadata ?? {},
          createdBy: mediaData.createdBy,
          organization: mediaData.organization,
          isArchived: false,
          createdAt: now,
          updatedAt: now
        };

        const createdMedia = await transaction.insertOne<IMedia>(this.collectionName, media);

        // Create variants if provided
        if (variants && variants.length > 0) {
          const variantData = variants.map(variant => ({
            ...variant,
            mediaId: createdMedia._id,
            createdAt: now,
            updatedAt: now
          })) as OptionalUnlessRequiredId<IMediaVariant>[];

          await transaction.insertMany<IMediaVariant>(this.mediaVariantCollection, variantData);
        }

        return createdMedia;
      } catch (err) {
        this.logger.error(`Error creating media: ${mediaData.title}`, err as Error);
        throw new DatabaseError(
          'Error creating media',
          'createMedia',
          'DATABASE_ERROR',
          err as Error,
          'media'
        );
      }
    });
  }

  /**
   * Find media by type and category
   * 
   * @param type - Media type
   * @param category - Media category
   * @param organizationId - Optional organization filter
   * @returns Array of media
   */
  public async findByTypeAndCategory(
    type: MediaType, 
    category: MediaCategory, 
    organizationId?: ObjectId
  ): Promise<IMedia[]> {
    try {
      const filter: Filter<IMedia> = {
        type,
        category,
        isArchived: false
      };

      if (organizationId) {
        filter.organization = organizationId;
      }

      return await this.find(filter);
    } catch (err) {
      this.logger.error(`Error finding media by type and category`, err as Error, {
        type,
        category,
        organizationId: organizationId?.toString()
      });
      throw new DatabaseError(
        'Error finding media by type and category',
        'findByTypeAndCategory',
        'DATABASE_ERROR',
        err as Error,
        'media'
      );
    }
  }

  /**
   * Find media by creator
   * 
   * @param createdBy - Creator user ID
   * @param type - Optional media type filter
   * @returns Array of media
   */
  public async findByCreator(createdBy: ObjectId, type?: MediaType): Promise<IMedia[]> {
    try {
      const filter: Filter<IMedia> = {
        createdBy,
        isArchived: false
      };

      if (type) {
        filter.type = type;
      }

      return await this.find(filter, { sort: { createdAt: -1 } });
    } catch (err) {
      this.logger.error(`Error finding media by creator: ${createdBy}`, err as Error);
      throw new DatabaseError(
        'Error finding media by creator',
        'findByCreator',
        'DATABASE_ERROR',
        err as Error,
        'media'
      );
    }
  }

  /**
   * Find media by organization
   * 
   * @param organizationId - Organization ID
   * @param category - Optional category filter
   * @returns Array of media
   */
  public async findByOrganization(
    organizationId: ObjectId, 
    category?: MediaCategory
  ): Promise<IMedia[]> {
    try {
      const filter: Filter<IMedia> = {
        organization: organizationId,
        isArchived: false
      };

      if (category) {
        filter.category = category;
      }

      return await this.find(filter, { sort: { createdAt: -1 } });
    } catch (err) {
      this.logger.error(`Error finding media by organization: ${organizationId}`, err as Error);
      throw new DatabaseError(
        'Error finding media by organization',
        'findByOrganization',
        'DATABASE_ERROR',
        err as Error,
        'media'
      );
    }
  }

  /**
   * Search media with various criteria
   * 
   * @param criteria - Search criteria
   * @returns Array of media
   */
  public async searchMedia(criteria: MediaSearchCriteria): Promise<IMedia[]> {
    try {
      const filter: Filter<IMedia> = {};

      if (criteria.type) {
        filter.type = criteria.type;
      }

      if (criteria.category) {
        filter.category = criteria.category;
      }

      if (criteria.organizationId) {
        filter.organization = criteria.organizationId;
      }

      if (criteria.createdBy) {
        filter.createdBy = criteria.createdBy;
      }

      if (criteria.isArchived !== undefined) {
        filter.isArchived = criteria.isArchived;
      } else {
        filter.isArchived = false; // Default to non-archived
      }

      if (criteria.tags && criteria.tags.length > 0) {
        filter.tags = { $in: criteria.tags };
      }

      if (criteria.searchTerm) {
        filter.$or = [
          { title: { $regex: criteria.searchTerm, $options: 'i' } },
          { description: { $regex: criteria.searchTerm, $options: 'i' } },
          { tags: { $in: [new RegExp(criteria.searchTerm, 'i')] } }
        ];
      }

      return await this.find(filter, { sort: { createdAt: -1 } });
    } catch (err) {
      this.logger.error('Error searching media', err as Error, { criteria });
      throw new DatabaseError(
        'Error searching media',
        'searchMedia',
        'DATABASE_ERROR',
        err as Error,
        'media'
      );
    }
  }

  /**
   * Find media by tags
   * 
   * @param tags - Array of tags
   * @param matchAll - Whether to match all tags or any tag
   * @returns Array of media
   */
  public async findByTags(tags: string[], matchAll: boolean = false): Promise<IMedia[]> {
    try {
      const filter: Filter<IMedia> = {
        isArchived: false
      };

      if (matchAll) {
        filter.tags = { $all: tags };
      } else {
        filter.tags = { $in: tags };
      }

      return await this.find(filter, { sort: { createdAt: -1 } });
    } catch (err) {
      this.logger.error(`Error finding media by tags: ${tags.join(', ')}`, err as Error);
      throw new DatabaseError(
        'Error finding media by tags',
        'findByTags',
        'DATABASE_ERROR',
        err as Error,
        'media'
      );
    }
  }

  /**
   * Get media variants for a specific media
   * 
   * @param mediaId - Media ID
   * @returns Array of media variants
   */
  public async getMediaVariants(mediaId: ObjectId): Promise<IMediaVariant[]> {
    try {
      const variantCollection = this.db.getCollection<IMediaVariant>(this.mediaVariantCollection);
      
      return await variantCollection.find({
        mediaId
      } as Filter<IMediaVariant>);
    } catch (err) {
      this.logger.error(`Error getting media variants for: ${mediaId}`, err as Error);
      throw new DatabaseError(
        'Error getting media variants',
        'getMediaVariants',
        'DATABASE_ERROR',
        err as Error,
        this.mediaVariantCollection
      );
    }
  }

  /**
   * Add variant to existing media
   * 
   * @param mediaId - Media ID
   * @param variantData - Media variant data
   * @returns Created media variant
   */
  public async addMediaVariant(
    mediaId: ObjectId, 
    variantData: Partial<IMediaVariant>
  ): Promise<IMediaVariant> {
    try {
      // Verify media exists
      await this.findById(mediaId);

      const variantCollection = this.db.getCollection<IMediaVariant>(this.mediaVariantCollection);
      const now = new Date();

      const variant = {
        ...variantData,
        mediaId,
        createdAt: now,
        updatedAt: now
      } as OptionalUnlessRequiredId<IMediaVariant>;

      const result = await variantCollection.insertOne(variant);

      return {
        ...variant,
        _id: result.insertedId
      } as IMediaVariant;
    } catch (err) {
      this.logger.error(`Error adding media variant for: ${mediaId}`, err as Error);
      throw new DatabaseError(
        'Error adding media variant',
        'addMediaVariant',
        'DATABASE_ERROR',
        err as Error,
        this.mediaVariantCollection
      );
    }
  }

  /**
   * Update media information
   * 
   * @param mediaId - Media ID
   * @param updateData - Media update data
   * @returns Updated media
   */
  public async updateMedia(mediaId: ObjectId, updateData: MediaUpdateData): Promise<IMedia> {
    try {
      const updates: Partial<IMedia> = {
        ...updateData,
        updatedAt: new Date()
      };

      return await this.update(mediaId, updates);
    } catch (err) {
      this.logger.error(`Error updating media: ${mediaId}`, err as Error);
      throw new DatabaseError(
        'Error updating media',
        'updateMedia',
        'DATABASE_ERROR',
        err as Error,
        'media'
      );
    }
  }

  /**
   * Archive media (soft delete)
   * 
   * @param mediaId - Media ID
   * @returns Updated media
   */
  public async archiveMedia(mediaId: ObjectId): Promise<IMedia> {
    try {
      return await this.updateMedia(mediaId, { isArchived: true });
    } catch (err) {
      this.logger.error(`Error archiving media: ${mediaId}`, err as Error);
      throw new DatabaseError(
        'Error archiving media',
        'archiveMedia',
        'DATABASE_ERROR',
        err as Error,
        'media'
      );
    }
  }

  /**
   * Restore archived media
   * 
   * @param mediaId - Media ID
   * @returns Updated media
   */
  public async restoreMedia(mediaId: ObjectId): Promise<IMedia> {
    try {
      return await this.updateMedia(mediaId, { isArchived: false });
    } catch (err) {
      this.logger.error(`Error restoring media: ${mediaId}`, err as Error);
      throw new DatabaseError(
        'Error restoring media',
        'restoreMedia',
        'DATABASE_ERROR',
        err as Error,
        'media'
      );
    }
  }

  /**
   * Delete media and all its variants permanently
   * 
   * @param mediaId - Media ID
   * @returns True if deleted successfully
   */
  public async deleteMediaPermanently(mediaId: ObjectId): Promise<boolean> {
    return await this.withTransaction(async (transaction) => {
      try {
        // Delete all variants first
        await transaction.deleteMany<IMediaVariant>(
          this.mediaVariantCollection,
          { mediaId } as Filter<IMediaVariant>
        );

        // Delete the media
        const deleted = await transaction.deleteOne<IMedia>(
          this.collectionName,
          { _id: mediaId } as Filter<IMedia>
        );

        return deleted;
      } catch (err) {
        this.logger.error(`Error permanently deleting media: ${mediaId}`, err as Error);
        throw new DatabaseError(
          'Error permanently deleting media',
          'deleteMediaPermanently',
          'DATABASE_ERROR',
          err as Error,
          'media'
        );
      }
    });
  }

  /**
   * Get media storage statistics
   * 
   * @param organizationId - Optional organization filter
   * @returns Storage statistics
   */
  public async getStorageStats(organizationId?: ObjectId): Promise<{
    totalFiles: number;
    totalSize: number;
    byType: Record<MediaType, { count: number; size: number }>;
    byCategory: Record<MediaCategory, { count: number; size: number }>;
  }> {
    try {
      const filter: Filter<IMedia> = { isArchived: false };
      
      if (organizationId) {
        filter.organization = organizationId;
      }

      const media = await this.find(filter);

      const stats = {
        totalFiles: media.length,
        totalSize: media.reduce((sum, m) => sum + m.sizeInBytes, 0),
        byType: {} as Record<MediaType, { count: number; size: number }>,
        byCategory: {} as Record<MediaCategory, { count: number; size: number }>
      };

      // Initialize type stats
      Object.values(MediaType).forEach(type => {
        stats.byType[type] = { count: 0, size: 0 };
      });

      // Initialize category stats
      Object.values(MediaCategory).forEach(category => {
        stats.byCategory[category] = { count: 0, size: 0 };
      });

      // Calculate stats
      media.forEach(m => {
        stats.byType[m.type].count++;
        stats.byType[m.type].size += m.sizeInBytes;
        
        stats.byCategory[m.category].count++;
        stats.byCategory[m.category].size += m.sizeInBytes;
      });

      return stats;
    } catch (err) {
      this.logger.error('Error getting storage stats', err as Error);
      throw new DatabaseError(
        'Error getting storage stats',
        'getStorageStats',
        'DATABASE_ERROR',
        err as Error,
        'media'
      );
    }
  }

  /**
   * Validate media data
   */
  protected override validateData(data: any, isUpdate: boolean = false): void {
    if (!isUpdate) {
      if (!data.title?.trim()) {
        throw new DatabaseError(
          'Media title is required',
          'validateData',
          'VALIDATION_ERROR'
        );
      }

      if (!data.url?.trim()) {
        throw new DatabaseError(
          'Media URL is required',
          'validateData',
          'VALIDATION_ERROR'
        );
      }

      if (!data.type || !Object.values(MediaType).includes(data.type)) {
        throw new DatabaseError(
          'Valid media type is required',
          'validateData',
          'VALIDATION_ERROR'
        );
      }

      if (!data.category || !Object.values(MediaCategory).includes(data.category)) {
        throw new DatabaseError(
          'Valid media category is required',
          'validateData',
          'VALIDATION_ERROR'
        );
      }
    }

    if (data.title !== undefined && !data.title?.trim()) {
      throw new DatabaseError(
        'Media title cannot be empty',
        'validateData',
        'VALIDATION_ERROR'
      );
    }

    if (data.sizeInBytes !== undefined && (typeof data.sizeInBytes !== 'number' || data.sizeInBytes < 0)) {
      throw new DatabaseError(
        'Media size must be a non-negative number',
        'validateData',
        'VALIDATION_ERROR'
      );
    }

    if (data.tags && !Array.isArray(data.tags)) {
      throw new DatabaseError(
        'Tags must be an array',
        'validateData',
        'VALIDATION_ERROR'
      );
    }
  }
}
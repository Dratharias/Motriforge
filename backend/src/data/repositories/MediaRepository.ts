import { Model, Types } from 'mongoose';
import { LoggerFacade } from '@/core/logging';
import { EventMediator } from '@/core/events/EventMediator';
import { CacheFacade } from '@/core/cache/facade/CacheFacade';
import { IMedia } from '@/types/models';
import { IMediaRepository } from '@/types/repositories';
import { ValidationResult, RepositoryContext } from '@/types/repositories/base';
import { BaseRepository } from './BaseRepository';
import { ValidationHelpers } from './helpers';

/**
 * Repository for media operations with enhanced validation and caching
 */
export class MediaRepository extends BaseRepository<IMedia> implements IMediaRepository {
  private static readonly CACHE_TTL = 600; // 10 minutes
  private static readonly MEDIA_CACHE_TTL = 1800; // 30 minutes for media data

  constructor(
    mediaModel: Model<IMedia>,
    logger: LoggerFacade,
    eventMediator: EventMediator,
    cache?: CacheFacade
  ) {
    super(mediaModel, logger, eventMediator, cache, 'MediaRepository');
  }

  /**
   * Find media by URL
   */
  public async findByUrl(url: string): Promise<IMedia | null> {
    const cacheKey = this.cacheHelpers.generateCustomKey('url', { url });
    
    const cached = await this.cacheHelpers.getCustom<IMedia>(cacheKey);
    if (cached) {
      return this.mapToEntity(cached);
    }

    try {
      this.logger.debug('Finding media by URL', { url });
      
      const media = await this.crudOps.findOne({
        url
      });

      if (media && this.cacheHelpers.isEnabled) {
        await this.cacheHelpers.setCustom(cacheKey, media, MediaRepository.MEDIA_CACHE_TTL);
        const mediaId = this.extractId(media);
        if (mediaId) {
          await this.cacheHelpers.cacheById(mediaId, media, MediaRepository.MEDIA_CACHE_TTL);
        }
      }

      return media ? this.mapToEntity(media) : null;
    } catch (error) {
      this.logger.error('Error finding media by URL', error as Error, { url });
      throw error;
    }
  }

  /**
   * Find media by category
   */
  public async findByCategory(category: string): Promise<IMedia[]> {
    const cacheKey = this.cacheHelpers.generateCustomKey('category', { category });
    
    const cached = await this.cacheHelpers.getCustom<IMedia[]>(cacheKey);
    if (cached) {
      return cached.map(media => this.mapToEntity(media));
    }

    try {
      this.logger.debug('Finding media by category', { category });
      
      const mediaList = await this.crudOps.find({
        category
      }, {
        sort: [{ field: 'createdAt', direction: 'desc' }]
      });

      if (this.cacheHelpers.isEnabled) {
        await this.cacheHelpers.setCustom(cacheKey, mediaList, MediaRepository.CACHE_TTL);
      }

      return mediaList.map(media => this.mapToEntity(media));
    } catch (error) {
      this.logger.error('Error finding media by category', error as Error, { category });
      throw error;
    }
  }

  /**
   * Find media by organization
   */
  public async findByOrganization(organizationId: Types.ObjectId): Promise<IMedia[]> {
    const cacheKey = this.cacheHelpers.generateCustomKey('organization', { 
      organizationId: organizationId.toString() 
    });
    
    const cached = await this.cacheHelpers.getCustom<IMedia[]>(cacheKey);
    if (cached) {
      return cached.map(media => this.mapToEntity(media));
    }

    try {
      this.logger.debug('Finding media by organization', { 
        organizationId: organizationId.toString() 
      });
      
      const mediaList = await this.crudOps.find({
        organization: organizationId
      }, {
        sort: [{ field: 'createdAt', direction: 'desc' }]
      });

      if (this.cacheHelpers.isEnabled) {
        await this.cacheHelpers.setCustom(cacheKey, mediaList, MediaRepository.CACHE_TTL);
      }

      return mediaList.map(media => this.mapToEntity(media));
    } catch (error) {
      this.logger.error('Error finding media by organization', error as Error, { 
        organizationId: organizationId.toString() 
      });
      throw error;
    }
  }

  /**
   * Find media by tags
   */
  public async findByTags(tags: string[]): Promise<IMedia[]> {
    const cacheKey = this.cacheHelpers.generateCustomKey('tags', { 
      tags: tags.toSorted((a, b) => a.localeCompare(b)) 
    });
    
    const cached = await this.cacheHelpers.getCustom<IMedia[]>(cacheKey);
    if (cached) {
      return cached.map(media => this.mapToEntity(media));
    }

    try {
      this.logger.debug('Finding media by tags', { tags });
      
      const mediaList = await this.crudOps.find({
        tags: { $in: tags }
      }, {
        sort: [{ field: 'createdAt', direction: 'desc' }]
      });

      if (this.cacheHelpers.isEnabled) {
        await this.cacheHelpers.setCustom(cacheKey, mediaList, MediaRepository.CACHE_TTL);
      }

      return mediaList.map(media => this.mapToEntity(media));
    } catch (error) {
      this.logger.error('Error finding media by tags', error as Error, { tags });
      throw error;
    }
  }

  /**
   * Find media by type
   */
  public async findByType(type: string): Promise<IMedia[]> {
    const cacheKey = this.cacheHelpers.generateCustomKey('type', { type });
    
    const cached = await this.cacheHelpers.getCustom<IMedia[]>(cacheKey);
    if (cached) {
      return cached.map(media => this.mapToEntity(media));
    }

    try {
      this.logger.debug('Finding media by type', { type });
      
      const mediaList = await this.crudOps.find({
        type
      }, {
        sort: [{ field: 'createdAt', direction: 'desc' }]
      });

      if (this.cacheHelpers.isEnabled) {
        await this.cacheHelpers.setCustom(cacheKey, mediaList, MediaRepository.CACHE_TTL);
      }

      return mediaList.map(media => this.mapToEntity(media));
    } catch (error) {
      this.logger.error('Error finding media by type', error as Error, { type });
      throw error;
    }
  }

  /**
   * Update media metadata
   */
  public async updateMetadata(
    id: Types.ObjectId, 
    metadata: Record<string, any>
  ): Promise<IMedia | null> {
    try {
      this.logger.debug('Updating media metadata', { 
        id: id.toString(),
        metadataKeys: Object.keys(metadata) 
      });

      const result = await this.crudOps.update(id, {
        metadata: { ...metadata },
        updatedAt: new Date()
      });

      if (result && this.cacheHelpers.isEnabled) {
        await this.cacheHelpers.invalidateAfterUpdate(id, result);
        await this.cacheHelpers.invalidateByPattern('*');
      }

      if (result) {
        await this.publishEvent('media.metadata.updated', {
          mediaId: id.toString(),
          metadataKeys: Object.keys(metadata),
          timestamp: new Date()
        });
      }

      return result ? this.mapToEntity(result) : null;
    } catch (error) {
      this.logger.error('Error updating media metadata', error as Error, { 
        id: id.toString() 
      });
      throw error;
    }
  }

  /**
   * Increment view count for media
   */
  public async incrementViewCount(id: Types.ObjectId): Promise<void> {
    try {
      this.logger.debug('Incrementing media view count', { id: id.toString() });

      const result = await this.crudOps.update(id, {
        $inc: { 'metadata.viewCount': 1 },
        $set: { 'metadata.lastViewedAt': new Date() }
      });

      if (result && this.cacheHelpers.isEnabled) {
        await this.cacheHelpers.invalidateAfterUpdate(id, result);
      }

      if (result) {
        await this.publishEvent('media.viewed', {
          mediaId: id.toString(),
          timestamp: new Date()
        });
      }
    } catch (error) {
      this.logger.error('Error incrementing media view count', error as Error, { 
        id: id.toString() 
      });
      throw error;
    }
  }

  /**
   * Find recent media for organization
   */
  public async findRecentMedia(
    organizationId: Types.ObjectId, 
    limit: number = 20
  ): Promise<IMedia[]> {
    const cacheKey = this.cacheHelpers.generateCustomKey('recent', { 
      organizationId: organizationId.toString(),
      limit 
    });
    
    const cached = await this.cacheHelpers.getCustom<IMedia[]>(cacheKey);
    if (cached) {
      return cached.map(media => this.mapToEntity(media));
    }

    try {
      this.logger.debug('Finding recent media', { 
        organizationId: organizationId.toString(),
        limit 
      });
      
      const mediaList = await this.crudOps.find({
        organization: organizationId
      }, {
        sort: [{ field: 'createdAt', direction: 'desc' }],
        pagination: { limit, offset: 0, page: 1, pageSize: limit }
      });

      if (this.cacheHelpers.isEnabled) {
        await this.cacheHelpers.setCustom(cacheKey, mediaList, MediaRepository.CACHE_TTL);
      }

      return mediaList.map(media => this.mapToEntity(media));
    } catch (error) {
      this.logger.error('Error finding recent media', error as Error, { 
        organizationId: organizationId.toString(),
        limit 
      });
      throw error;
    }
  }

  /**
   * Find media by MIME type pattern
   */
  public async findByMimeType(mimeType: string): Promise<IMedia[]> {
    try {
      this.logger.debug('Finding media by MIME type', { mimeType });
      
      const mediaList = await this.crudOps.find({
        mimeType: { $regex: mimeType, $options: 'i' }
      }, {
        sort: [{ field: 'createdAt', direction: 'desc' }]
      });

      return mediaList.map(media => this.mapToEntity(media));
    } catch (error) {
      this.logger.error('Error finding media by MIME type', error as Error, { mimeType });
      throw error;
    }
  }

  /**
   * Find media by size range
   */
  public async findBySizeRange(minSize: number, maxSize: number): Promise<IMedia[]> {
    try {
      this.logger.debug('Finding media by size range', { minSize, maxSize });
      
      const mediaList = await this.crudOps.find({
        sizeInBytes: { 
          $gte: minSize, 
          $lte: maxSize 
        }
      }, {
        sort: [{ field: 'sizeInBytes', direction: 'asc' }]
      });

      return mediaList.map(media => this.mapToEntity(media));
    } catch (error) {
      this.logger.error('Error finding media by size range', error as Error, { 
        minSize, 
        maxSize 
      });
      throw error;
    }
  }

  /**
   * Override create to handle media-specific logic
   */
  public async create(data: Partial<IMedia>, context?: RepositoryContext): Promise<IMedia> {
    // Set default values
    const mediaData: Partial<IMedia> = {
      ...data,
      tags: data.tags ?? [],
      metadata: {
        viewCount: 0,
        ...data.metadata
      }
    };

    const media = await super.create(mediaData, context);

    // Publish media creation event
    await this.publishEvent('media.created', {
      mediaId: media._id.toString(),
      type: media.type,
      category: media.category,
      organizationId: media.organization.toString(),
      sizeInBytes: media.sizeInBytes,
      timestamp: new Date()
    });

    return media;
  }

  /**
   * Override delete to handle cleanup
   */
  public async delete(
    id: Types.ObjectId, 
    context?: RepositoryContext
  ): Promise<boolean> {
    // Get media info before deletion for cleanup
    const media = await this.findById(id);
    
    const result = await super.delete(id, context);

    if (result && media) {
      await this.publishEvent('media.deleted', {
        mediaId: id.toString(),
        url: media.url,
        type: media.type,
        category: media.category,
        organizationId: media.organization.toString(),
        timestamp: new Date()
      });
    }

    return result;
  }

  /**
   * Validate media data
   */
  protected validateData(data: Partial<IMedia>): ValidationResult {
    const validations = [
      this.validateTitle(data.title),
      this.validateDescription(data.description),
      this.validateUrl(data.url),
      this.validateMimeType(data.mimeType),
      this.validateSize(data.sizeInBytes),
      this.validateTags(data.tags)
    ];

    const errors = validations
      .filter(result => !result.valid)
      .flatMap(result => result.errors || []);

    return {
      valid: errors.length === 0,
      errors: errors.length > 0 ? errors : undefined
    };
  }

  private validateTitle(title?: string): ValidationResult {
    if (title === undefined) return { valid: true };
    
    return ValidationHelpers.validateFieldLength(title, 'title', 1, 100);
  }

  private validateDescription(description?: string): ValidationResult {
    if (description === undefined) return { valid: true };
    
    return {
      valid: description.length <= 500,
      errors: description.length > 500 ? ['Description must be less than 500 characters'] : undefined
    };
  }

  private validateUrl(url?: string): ValidationResult {
    if (!url) return { valid: true };
    
    return {
      valid: ValidationHelpers.validateUrl(url),
      errors: ValidationHelpers.validateUrl(url) ? undefined : ['Invalid URL format']
    };
  }

  private validateMimeType(mimeType?: string): ValidationResult {
    if (!mimeType) return { valid: true };
    
    const mimeTypeRegex = /^[a-zA-Z][a-zA-Z0-9][a-zA-Z0-9!#$&\-^_]*\/[a-zA-Z0-9][a-zA-Z0-9!#$&\-^_]*$/;
    const valid = mimeTypeRegex.test(mimeType);
    
    return {
      valid,
      errors: valid ? undefined : ['Invalid MIME type format']
    };
  }

  private validateSize(sizeInBytes?: number): ValidationResult {
    if (sizeInBytes === undefined) return { valid: true };
    
    return ValidationHelpers.validateNumericRange(
      sizeInBytes, 
      'sizeInBytes', 
      0, 
      100 * 1024 * 1024 // 100MB max
    );
  }

  private validateTags(tags?: string[]): ValidationResult {
    if (!tags) return { valid: true };
    
    if (!Array.isArray(tags)) {
      return {
        valid: false,
        errors: ['Tags must be an array']
      };
    }
    
    const invalidTags = tags
      .map((tag, index) => ({ tag, index }))
      .filter(({ tag }) => typeof tag !== 'string' || tag.length === 0)
      .map(({ index }) => `Tag at index ${index} must be a non-empty string`);
    
    return {
      valid: invalidTags.length === 0,
      errors: invalidTags.length > 0 ? invalidTags : undefined
    };
  }
}
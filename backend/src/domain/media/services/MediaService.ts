import { Types } from 'mongoose';
import { Media } from '../entities/Media';
import {
  IMediaRepository,
  IMediaUploadData,
  IMediaSearchCriteria,
  IMediaStatistics,
  IMediaStorageService,
  IMediaProcessingService,
  IMediaAccessService,
  IMediaProcessingOptions
} from '../interfaces/MediaInterfaces';
import { MediaType } from '../../../types/fitness/enums/media';
import { ResourceType, Status } from '../../../types/core/enums';
import { ValidationError } from '../../../infrastructure/errors/types/ValidationError';

export class MediaService {
  constructor(
    private readonly mediaRepository: IMediaRepository,
    private readonly storageService: IMediaStorageService,
    private readonly processingService: IMediaProcessingService,
    private readonly accessService: IMediaAccessService
  ) {}

  async uploadMedia(data: IMediaUploadData): Promise<Media> {
    await this.validateMediaUpload(data);

    // Extract metadata from file
    const validation = await this.processingService.validateMedia(
      Buffer.isBuffer(data.file) ? data.file : Buffer.from(data.file, 'base64'),
      data.mimeType
    );

    if (!validation.isValid) {
      throw new ValidationError(
        'file',
        data.filename,
        'invalid_media',
        validation.errors.join(', ')
      );
    }

    // Upload to storage
    const uploadResult = await this.storageService.upload(data);

    const now = new Date();
    const mediaId = new Types.ObjectId();

    const media = new Media({
      id: mediaId,
      url: uploadResult.url,
      type: data.type,
      title: data.title,
      description: data.description,
      metadata: uploadResult.metadata,
      associatedTo: data.associatedTo ?? [],
      associatedResourceTypes: data.associatedResourceTypes ?? [],
      tags: data.tags ?? [],
      isPublic: data.isPublic ?? false,
      organization: data.organizationId,
      uploadedBy: data.uploadedBy,
      createdAt: now,
      updatedAt: now,
      createdBy: data.uploadedBy,
      isActive: true
    });

    const createdMedia = await this.mediaRepository.create(media);

    // Generate thumbnail for images and videos
    if (data.type === MediaType.IMAGE || data.type === MediaType.VIDEO) {
      try {
        await this.processingService.generateThumbnail(mediaId);
      } catch (error) {
        // Log error but don't fail the upload
        console.warn(`Failed to generate thumbnail for media ${mediaId}:`, error);
      }
    }

    return createdMedia;
  }

  async getMediaById(id: Types.ObjectId): Promise<Media | null> {
    return await this.mediaRepository.findById(id);
  }

  async getMediaByTitle(title: string): Promise<readonly Media[]> {
    return await this.mediaRepository.findByTitle(title);
  }

  async getMediaByType(type: MediaType): Promise<readonly Media[]> {
    return await this.mediaRepository.findByType(type);
  }

  async getOrganizationMedia(organizationId: Types.ObjectId): Promise<readonly Media[]> {
    return await this.mediaRepository.findByOrganization(organizationId);
  }

  async getUserMedia(userId: Types.ObjectId): Promise<readonly Media[]> {
    return await this.mediaRepository.findByUploader(userId);
  }

  async getMediaByTags(tags: readonly string[]): Promise<readonly Media[]> {
    return await this.mediaRepository.findByTags(tags);
  }

  async getAssociatedMedia(resourceId: Types.ObjectId): Promise<readonly Media[]> {
    return await this.mediaRepository.findAssociatedWith(resourceId);
  }

  async getPublicMedia(): Promise<readonly Media[]> {
    return await this.mediaRepository.findPublicMedia();
  }

  async updateMedia(
    id: Types.ObjectId,
    updates: {
      title?: string;
      description?: string;
      tags?: readonly string[];
      isPublic?: boolean;
      status?: Status;
    },
    userId: Types.ObjectId
  ): Promise<Media | null> {
    const media = await this.mediaRepository.findById(id);
    if (!media) return null;

    // Check if user has permission to update
    const canUpdate = await this.accessService.checkAccess(id, userId, 'EDIT');
    if (!canUpdate) {
      throw new ValidationError(
        'permission',
        userId,
        'unauthorized',
        'You do not have permission to update this media'
      );
    }

    if (updates.title) {
      this.validateMediaTitle(updates.title);
    }

    if (updates.description) {
      this.validateMediaDescription(updates.description);
    }

    if (updates.tags) {
      this.validateMediaTags(updates.tags);
    }

    return await this.mediaRepository.update(id, updates);
  }

  async associateMedia(
    mediaId: Types.ObjectId,
    resourceId: Types.ObjectId,
    resourceType: ResourceType,
    userId: Types.ObjectId
  ): Promise<Media | null> {
    const media = await this.mediaRepository.findById(mediaId);
    if (!media) return null;

    // Check if user has permission to associate
    const canEdit = await this.accessService.checkAccess(mediaId, userId, 'EDIT');
    if (!canEdit) {
      throw new ValidationError(
        'permission',
        userId,
        'unauthorized',
        'You do not have permission to associate this media'
      );
    }

    const updatedMedia = media.addAssociation(resourceId, resourceType);
    return await this.mediaRepository.update(mediaId, {
      associatedTo: updatedMedia.associatedTo,
      associatedResourceTypes: updatedMedia.associatedResourceTypes
    });
  }

  async removeAssociation(
    mediaId: Types.ObjectId,
    resourceId: Types.ObjectId,
    userId: Types.ObjectId
  ): Promise<Media | null> {
    const media = await this.mediaRepository.findById(mediaId);
    if (!media) return null;

    // Check if user has permission to modify associations
    const canEdit = await this.accessService.checkAccess(mediaId, userId, 'EDIT');
    if (!canEdit) {
      throw new ValidationError(
        'permission',
        userId,
        'unauthorized',
        'You do not have permission to modify this media'
      );
    }

    const updatedMedia = media.removeAssociation(resourceId);
    return await this.mediaRepository.update(mediaId, {
      associatedTo: updatedMedia.associatedTo,
      associatedResourceTypes: updatedMedia.associatedResourceTypes
    });
  }

  async addMediaTag(
    mediaId: Types.ObjectId,
    tag: string,
    userId: Types.ObjectId
  ): Promise<Media | null> {
    const media = await this.mediaRepository.findById(mediaId);
    if (!media) return null;

    const canEdit = await this.accessService.checkAccess(mediaId, userId, 'EDIT');
    if (!canEdit) {
      throw new ValidationError(
        'permission',
        userId,
        'unauthorized',
        'You do not have permission to modify this media'
      );
    }

    const updatedMedia = media.addTag(tag);
    return await this.mediaRepository.update(mediaId, {
      tags: updatedMedia.tags
    });
  }

  async removeMediaTag(
    mediaId: Types.ObjectId,
    tag: string,
    userId: Types.ObjectId
  ): Promise<Media | null> {
    const media = await this.mediaRepository.findById(mediaId);
    if (!media) return null;

    const canEdit = await this.accessService.checkAccess(mediaId, userId, 'EDIT');
    if (!canEdit) {
      throw new ValidationError(
        'permission',
        userId,
        'unauthorized',
        'You do not have permission to modify this media'
      );
    }

    const updatedMedia = media.removeTag(tag);
    return await this.mediaRepository.update(mediaId, {
      tags: updatedMedia.tags
    });
  }

  async processMedia(
    mediaId: Types.ObjectId,
    options: IMediaProcessingOptions,
    userId: Types.ObjectId
  ): Promise<Media> {
    const media = await this.mediaRepository.findById(mediaId);
    if (!media) {
      throw new ValidationError(
        'mediaId',
        mediaId,
        'not_found',
        'Media not found'
      );
    }

    const canEdit = await this.accessService.checkAccess(mediaId, userId, 'EDIT');
    if (!canEdit) {
      throw new ValidationError(
        'permission',
        userId,
        'unauthorized',
        'You do not have permission to process this media'
      );
    }

    return await this.processingService.processMedia(mediaId, options);
  }

  async generateThumbnail(mediaId: Types.ObjectId, userId: Types.ObjectId): Promise<string> {
    const media = await this.mediaRepository.findById(mediaId);
    if (!media) {
      throw new ValidationError(
        'mediaId',
        mediaId,
        'not_found',
        'Media not found'
      );
    }

    const canView = await this.accessService.checkAccess(mediaId, userId, 'VIEW');
    if (!canView) {
      throw new ValidationError(
        'permission',
        userId,
        'unauthorized',
        'You do not have permission to access this media'
      );
    }

    return await this.processingService.generateThumbnail(mediaId);
  }

  async optimizeForWeb(mediaId: Types.ObjectId, userId: Types.ObjectId): Promise<Media> {
    const media = await this.mediaRepository.findById(mediaId);
    if (!media) {
      throw new ValidationError(
        'mediaId',
        mediaId,
        'not_found',
        'Media not found'
      );
    }

    const canEdit = await this.accessService.checkAccess(mediaId, userId, 'EDIT');
    if (!canEdit) {
      throw new ValidationError(
        'permission',
        userId,
        'unauthorized',
        'You do not have permission to optimize this media'
      );
    }

    return await this.processingService.optimizeForWeb(mediaId);
  }

  async searchMedia(criteria: IMediaSearchCriteria): Promise<readonly Media[]> {
    return await this.mediaRepository.search(criteria);
  }

  async getMediaStatistics(organizationId?: Types.ObjectId): Promise<IMediaStatistics> {
    return await this.mediaRepository.getStatistics(organizationId);
  }

  async getTotalStorageUsed(organizationId: Types.ObjectId): Promise<number> {
    return await this.mediaRepository.getTotalStorageUsed(organizationId);
  }

  async findDuplicateMedia(organizationId: Types.ObjectId): Promise<readonly Media[][]> {
    return await this.mediaRepository.findDuplicates(organizationId);
  }

  async findLargeFiles(organizationId: Types.ObjectId, minSizeMB: number): Promise<readonly Media[]> {
    return await this.mediaRepository.findLargeFiles(organizationId, minSizeMB);
  }

  async findOrphanedMedia(organizationId: Types.ObjectId): Promise<readonly Media[]> {
    return await this.mediaRepository.findOrphanedMedia(organizationId);
  }

  async setMediaPublicAccess(
    mediaId: Types.ObjectId,
    isPublic: boolean,
    userId: Types.ObjectId
  ): Promise<Media | null> {
    const media = await this.mediaRepository.findById(mediaId);
    if (!media) return null;

    const canEdit = await this.accessService.checkAccess(mediaId, userId, 'EDIT');
    if (!canEdit) {
      throw new ValidationError(
        'permission',
        userId,
        'unauthorized',
        'You do not have permission to modify this media'
      );
    }

    return await this.mediaRepository.update(mediaId, { isPublic });
  }

  async downloadMedia(mediaId: Types.ObjectId, userId: Types.ObjectId): Promise<Buffer> {
    const media = await this.mediaRepository.findById(mediaId);
    if (!media) {
      throw new ValidationError(
        'mediaId',
        mediaId,
        'not_found',
        'Media not found'
      );
    }

    const canDownload = await this.accessService.checkAccess(mediaId, userId, 'DOWNLOAD');
    if (!canDownload) {
      throw new ValidationError(
        'permission',
        userId,
        'unauthorized',
        'You do not have permission to download this media'
      );
    }

    // Log access
    await this.accessService.logAccess({
      mediaId,
      userId,
      accessType: 'DOWNLOAD',
      success: true
    });

    return await this.storageService.download(media.url);
  }

  async archiveMedia(id: Types.ObjectId, userId: Types.ObjectId): Promise<boolean> {
    const media = await this.mediaRepository.findById(id);
    if (!media) {
      return false;
    }

    const canEdit = await this.accessService.checkAccess(id, userId, 'EDIT');
    if (!canEdit) {
      throw new ValidationError(
        'permission',
        userId,
        'unauthorized',
        'You do not have permission to archive this media'
      );
    }

    return await this.mediaRepository.archive(id);
  }

  async restoreMedia(id: Types.ObjectId, userId: Types.ObjectId): Promise<boolean> {
    const media = await this.mediaRepository.findById(id);
    if (!media) {
      return false;
    }

    const canEdit = await this.accessService.checkAccess(id, userId, 'EDIT');
    if (!canEdit) {
      throw new ValidationError(
        'permission',
        userId,
        'unauthorized',
        'You do not have permission to restore this media'
      );
    }

    return await this.mediaRepository.restore(id);
  }

  async deleteMedia(id: Types.ObjectId, userId: Types.ObjectId): Promise<boolean> {
    const media = await this.mediaRepository.findById(id);
    if (!media) {
      return false;
    }

    const canEdit = await this.accessService.checkAccess(id, userId, 'EDIT');
    if (!canEdit) {
      throw new ValidationError(
        'permission',
        userId,
        'unauthorized',
        'You do not have permission to delete this media'
      );
    }

    if (!media.canBeDeleted()) {
      throw new ValidationError(
        'media',
        media.id,
        'delete_validation',
        'Cannot delete media that is associated with other resources'
      );
    }

    // Delete from storage
    await this.storageService.delete(media.url);

    // Delete from database
    return await this.mediaRepository.delete(id);
  }

  async bulkUploadMedia(files: readonly IMediaUploadData[]): Promise<readonly Media[]> {
    const results: Media[] = [];
    const errors: string[] = [];

    for (const file of files) {
      try {
        const media = await this.uploadMedia(file);
        results.push(media);
      } catch (error) {
        errors.push(`Failed to upload ${file.filename}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    if (errors.length > 0) {
      console.warn('Bulk upload had errors:', errors);
    }

    return results;
  }

  async getStorageQuota(organizationId: Types.ObjectId): Promise<{ used: number; limit: number; remaining: number }> {
    return await this.storageService.getStorageQuota(organizationId);
  }

  async validateMediaAccess(mediaId: Types.ObjectId, userId: Types.ObjectId): Promise<boolean> {
    const media = await this.mediaRepository.findById(mediaId);
    if (!media) {
      return false;
    }

    return await this.accessService.checkAccess(mediaId, userId, 'VIEW');
  }

  private async validateMediaUpload(data: IMediaUploadData): Promise<void> {
    if (!data.filename || data.filename.trim().length === 0) {
      throw new ValidationError(
        'filename',
        data.filename,
        'required',
        'Filename is required'
      );
    }

    if (data.filename.length > 255) {
      throw new ValidationError(
        'filename',
        data.filename,
        'max_length',
        'Filename must be less than 255 characters'
      );
    }

    if (!Object.values(MediaType).includes(data.type)) {
      throw new ValidationError(
        'type',
        data.type,
        'invalid',
        'Invalid media type'
      );
    }

    if (data.title && data.title.length > 200) {
      throw new ValidationError(
        'title',
        data.title,
        'max_length',
        'Title must be less than 200 characters'
      );
    }

    if (data.description && data.description.length > 1000) {
      throw new ValidationError(
        'description',
        data.description,
        'max_length',
        'Description must be less than 1000 characters'
      );
    }

    if (data.tags) {
      this.validateMediaTags(data.tags);
    }

    // Validate file size based on type
    const fileBuffer = Buffer.isBuffer(data.file) ? data.file : Buffer.from(data.file, 'base64');
    const fileSizeMB = fileBuffer.length / (1024 * 1024);

    const maxSizeLimits = {
      [MediaType.IMAGE]: 10, // 10MB
      [MediaType.VIDEO]: 100, // 100MB
      [MediaType.AUDIO]: 50, // 50MB
      [MediaType.DOCUMENT]: 25, // 25MB
      [MediaType.ANIMATION]: 25 // 25MB
    };

    if (fileSizeMB > maxSizeLimits[data.type]) {
      throw new ValidationError(
        'file',
        fileSizeMB,
        'file_too_large',
        `File size exceeds maximum limit of ${maxSizeLimits[data.type]}MB for ${data.type}`
      );
    }

    // Validate MIME type matches media type
    const validMimeTypes = {
      [MediaType.IMAGE]: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
      [MediaType.VIDEO]: ['video/mp4', 'video/webm', 'video/avi', 'video/mov'],
      [MediaType.AUDIO]: ['audio/mp3', 'audio/wav', 'audio/ogg', 'audio/m4a'],
      [MediaType.DOCUMENT]: ['application/pdf', 'text/plain', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
      [MediaType.ANIMATION]: ['image/gif', 'video/mp4', 'video/webm']
    };

    if (!validMimeTypes[data.type].includes(data.mimeType.toLowerCase())) {
      throw new ValidationError(
        'mimeType',
        data.mimeType,
        'invalid_type',
        `MIME type ${data.mimeType} is not valid for media type ${data.type}`
      );
    }
  }

  private validateMediaTitle(title: string): void {
    if (title.length > 200) {
      throw new ValidationError(
        'title',
        title,
        'max_length',
        'Title must be less than 200 characters'
      );
    }
  }

  private validateMediaDescription(description: string): void {
    if (description.length > 1000) {
      throw new ValidationError(
        'description',
        description,
        'max_length',
        'Description must be less than 1000 characters'
      );
    }
  }

  private validateMediaTags(tags: readonly string[]): void {
    if (tags.length > 20) {
      throw new ValidationError(
        'tags',
        tags,
        'max_count',
        'Cannot have more than 20 tags'
      );
    }

    for (const tag of tags) {
      if (tag.length > 50) {
        throw new ValidationError(
          'tags',
          tag,
          'max_length',
          'Each tag must be less than 50 characters'
        );
      }

      if (!/^[a-zA-Z0-9_-]+$/.test(tag)) {
        throw new ValidationError(
          'tags',
          tag,
          'invalid_format',
          'Tags can only contain letters, numbers, hyphens, and underscores'
        );
      }
    }
  }
}
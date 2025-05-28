import { Types } from 'mongoose';
import { Media } from '../entities/Media';
import {
  IMediaProcessingService,
  IMediaProcessingOptions,
  IMediaMetadata,
  IMediaValidationResult,
  IMediaRepository,
  IMediaStorageService
} from '../interfaces/MediaInterfaces';
import { MediaType, MediaQuality } from '../../../types/fitness/enums/media';
import { ValidationError } from '../../../infrastructure/errors/types/ValidationError';

export class MediaProcessingService implements IMediaProcessingService {
  constructor(
    private readonly mediaRepository: IMediaRepository,
    private readonly storageService: IMediaStorageService
  ) {}

  async processMedia(mediaId: Types.ObjectId, options: IMediaProcessingOptions): Promise<Media> {
    const media = await this.mediaRepository.findById(mediaId);
    if (!media) {
      throw new ValidationError(
        'mediaId',
        mediaId,
        'not_found',
        'Media not found'
      );
    }

    // Download original media
    const originalBuffer = await this.storageService.download(media.url);

    // Process based on media type and options
    let processedBuffer: Buffer;
    let newMetadata: IMediaMetadata;

    switch (media.type) {
      case MediaType.IMAGE:
        ({ buffer: processedBuffer, metadata: newMetadata } = await this.processImage(originalBuffer, options, media.metadata));
        break;
      case MediaType.VIDEO:
        ({ buffer: processedBuffer, metadata: newMetadata } = await this.processVideo(originalBuffer, options, media.metadata));
        break;
      case MediaType.AUDIO:
        ({ buffer: processedBuffer, metadata: newMetadata } = await this.processAudio(originalBuffer, options, media.metadata));
        break;
      default:
        throw new ValidationError(
          'mediaType',
          media.type,
          'unsupported',
          `Processing not supported for media type: ${media.type}`
        );
    }

    // Generate new filename with quality suffix
    const originalUrl = media.url;
    const extension = this.getFileExtension(originalUrl);
    const baseName = originalUrl.replace(extension, '');
    const newUrl = `${baseName}_${options.targetQuality.toLowerCase()}${extension}`;

    // Upload processed media
    const uploadResult = await this.storageService.upload({
      file: processedBuffer,
      filename: this.getFileName(newUrl),
      mimeType: this.getMimeType(media.type, options.format ?? media.metadata.format),
      type: media.type,
      organizationId: media.organization,
      uploadedBy: media.uploadedBy
    });

    // Create new media record for processed version
    const processedMedia = new Media({
      id: new Types.ObjectId(),
      url: uploadResult.url,
      type: media.type,
      title: `${media.title ?? media.getFileName()} (${options.targetQuality})`,
      description: media.description,
      metadata: newMetadata,
      associatedTo: media.associatedTo,
      associatedResourceTypes: media.associatedResourceTypes,
      tags: [...media.tags, 'processed', options.targetQuality.toLowerCase()],
      isPublic: media.isPublic,
      organization: media.organization,
      uploadedBy: media.uploadedBy,
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: media.createdBy,
      isActive: true
    });

    return await this.mediaRepository.create(processedMedia);
  }

  async generateThumbnail(mediaId: Types.ObjectId): Promise<string> {
    const media = await this.mediaRepository.findById(mediaId);
    if (!media) {
      throw new ValidationError(
        'mediaId',
        mediaId,
        'not_found',
        'Media not found'
      );
    }

    if (media.type !== MediaType.IMAGE && media.type !== MediaType.VIDEO) {
      throw new ValidationError(
        'mediaType',
        media.type,
        'unsupported',
        'Thumbnails can only be generated for images and videos'
      );
    }

    // Download original media
    const originalBuffer = await this.storageService.download(media.url);

    // Generate thumbnail
    const thumbnailBuffer = await this.createThumbnail(originalBuffer, media.type);

    // Generate thumbnail URL
    const originalUrl = media.url;
    const extension = this.getFileExtension(originalUrl);
    const baseName = originalUrl.replace(extension, '');
    const thumbnailUrl = `${baseName}_thumbnail.jpg`; // Always use JPG for thumbnails

    // Upload thumbnail
    await this.storageService.upload({
      file: thumbnailBuffer,
      filename: this.getFileName(thumbnailUrl),
      mimeType: 'image/jpeg',
      type: MediaType.IMAGE,
      organizationId: media.organization,
      uploadedBy: media.uploadedBy
    });

    return thumbnailUrl;
  }

  async optimizeForWeb(mediaId: Types.ObjectId): Promise<Media> {
    const options: IMediaProcessingOptions = {
      targetQuality: MediaQuality.MEDIUM,
      maxWidth: 1280,
      maxHeight: 720,
      compressionLevel: 80,
      maintainAspectRatio: true
    };

    return await this.processMedia(mediaId, options);
  }

  async extractMetadata(file: Buffer, mimeType: string): Promise<IMediaMetadata> {
    const mediaType = this.getMediaTypeFromMimeType(mimeType);
    
    // Basic metadata extraction
    const metadata: IMediaMetadata = {
      fileSize: file.length,
      format: this.getFormatFromMimeType(mimeType)
    };

    switch (mediaType) {
      case MediaType.IMAGE:
        return await this.extractImageMetadata(file, metadata);
      case MediaType.VIDEO:
        return await this.extractVideoMetadata(file, metadata);
      case MediaType.AUDIO:
        return await this.extractAudioMetadata(file, metadata);
      default:
        return metadata;
    }
  }

  async validateMedia(file: Buffer, mimeType: string): Promise<IMediaValidationResult> {
    const errors: string[] = [];
    const warnings: string[] = [];
    const suggestions: string[] = [];

    try {
      // Extract metadata to validate file integrity
      const metadata = await this.extractMetadata(file, mimeType);

      // Check file size
      if (file.length === 0) {
        errors.push('File is empty');
      }

      const mediaType = this.getMediaTypeFromMimeType(mimeType);

      // Type-specific validation
      switch (mediaType) {
        case MediaType.IMAGE:
          this.validateImage(metadata, errors, warnings, suggestions);
          break;
        case MediaType.VIDEO:
          this.validateVideo(metadata, errors, warnings, suggestions);
          break;
        case MediaType.AUDIO:
          this.validateAudio(metadata, errors, warnings, suggestions);
          break;
      }

      // Check for corruption indicators
      if (metadata.resolution && (metadata.resolution.width <= 0 || metadata.resolution.height <= 0)) {
        errors.push('Invalid resolution detected');
      }

      return {
        isValid: errors.length === 0,
        errors,
        warnings,
        suggestions,
        metadata
      };
    } catch (error) {
      return {
        isValid: false,
        errors: [`Failed to validate media: ${error instanceof Error ? error.message : 'Unknown error'}`],
        warnings,
        suggestions
      };
    }
  }

  async convertFormat(mediaId: Types.ObjectId, targetFormat: string): Promise<Media> {
    const options: IMediaProcessingOptions = {
      targetQuality: MediaQuality.HIGH,
      format: targetFormat
    };

    return await this.processMedia(mediaId, options);
  }

  async compressMedia(mediaId: Types.ObjectId, compressionLevel: number): Promise<Media> {
    const options: IMediaProcessingOptions = {
      targetQuality: MediaQuality.MEDIUM,
      compressionLevel: Math.max(1, Math.min(100, compressionLevel))
    };

    return await this.processMedia(mediaId, options);
  }

  async addWatermark(
    mediaId: Types.ObjectId,
    watermarkOptions: IMediaProcessingOptions['watermark']
  ): Promise<Media> {
    const options: IMediaProcessingOptions = {
      targetQuality: MediaQuality.HIGH,
      watermark: watermarkOptions
    };

    return await this.processMedia(mediaId, options);
  }

  async createVariants(mediaId: Types.ObjectId, qualities: readonly MediaQuality[]): Promise<readonly Media[]> {
    const variants: Media[] = [];

    for (const quality of qualities) {
      try {
        const options: IMediaProcessingOptions = {
          targetQuality: quality,
          ...this.getQualitySettings(quality)
        };

        const variant = await this.processMedia(mediaId, options);
        variants.push(variant);
      } catch (error) {
        console.warn(`Failed to create ${quality} variant for media ${mediaId}:`, error);
      }
    }

    return variants;
  }

  private async processImage(
    buffer: Buffer,
    options: IMediaProcessingOptions,
    originalMetadata: IMediaMetadata
  ): Promise<{ buffer: Buffer; metadata: IMediaMetadata }> {
    // Placeholder for image processing logic
    // In a real implementation, you would use libraries like Sharp or Canvas
    
    let processedBuffer = buffer;
    const metadata: IMediaMetadata = { ...originalMetadata };

    // Apply quality settings
    if (options.targetQuality !== MediaQuality.ORIGINAL) {
      const qualitySettings = this.getQualitySettings(options.targetQuality);
      
      if (qualitySettings.maxWidth && qualitySettings.maxHeight && originalMetadata.resolution) {
        const newResolution = this.calculateNewResolution(
          originalMetadata.resolution,
          qualitySettings.maxWidth,
          qualitySettings.maxHeight,
          options.maintainAspectRatio ?? true
        );
        
        metadata.resolution = newResolution;
        // In real implementation: resize image to new resolution
      }
    }

    // Apply compression
    if (options.compressionLevel) {
      // In real implementation: apply compression
      const compressionRatio = options.compressionLevel / 100;
      metadata.compressionInfo = {
        originalSize: buffer.length,
        compressionRatio,
        codec: options.format ?? originalMetadata.format
      };
    }

    // Add watermark
    if (options.watermark) {
      // In real implementation: add watermark to image
    }

    return { buffer: processedBuffer, metadata };
  }

  private async processVideo(
    buffer: Buffer,
    options: IMediaProcessingOptions,
    originalMetadata: IMediaMetadata
  ): Promise<{ buffer: Buffer; metadata: IMediaMetadata }> {
    // Placeholder for video processing logic
    // In a real implementation, you would use FFmpeg or similar
    
    let processedBuffer = buffer;
    const metadata: IMediaMetadata = { ...originalMetadata };

    // Apply quality settings for video
    if (options.targetQuality !== MediaQuality.ORIGINAL && originalMetadata.resolution) {
      const qualitySettings = this.getQualitySettings(options.targetQuality);
      
      if (qualitySettings.maxWidth && qualitySettings.maxHeight) {
        const newResolution = this.calculateNewResolution(
          originalMetadata.resolution,
          qualitySettings.maxWidth,
          qualitySettings.maxHeight,
          options.maintainAspectRatio ?? true
        );
        
        metadata.resolution = newResolution;
        // In real implementation: transcode video to new resolution
      }
    }

    return { buffer: processedBuffer, metadata };
  }

  private async processAudio(
    buffer: Buffer,
    options: IMediaProcessingOptions,
    originalMetadata: IMediaMetadata
  ): Promise<{ buffer: Buffer; metadata: IMediaMetadata }> {
    // Placeholder for audio processing logic
    
    let processedBuffer = buffer;
    const metadata: IMediaMetadata = { ...originalMetadata };

    // Apply compression for audio
    if (options.compressionLevel) {
      // In real implementation: apply audio compression
      const compressionRatio = options.compressionLevel / 100;
      metadata.compressionInfo = {
        originalSize: buffer.length,
        compressionRatio,
        codec: options.format ?? originalMetadata.format
      };
    }

    return { buffer: processedBuffer, metadata };
  }

  private async createThumbnail(buffer: Buffer, mediaType: MediaType): Promise<Buffer> {
    // Placeholder for thumbnail generation
    // In real implementation, generate 150x150 thumbnail
    
    if (mediaType === MediaType.IMAGE || MediaType.VIDEO) {
      return buffer;
    }
    
    throw new Error('Unsupported media type for thumbnail generation');
  }

  private async extractImageMetadata(file: Buffer, baseMetadata: IMediaMetadata): Promise<IMediaMetadata> {
    // Placeholder for image metadata extraction
    // In real implementation, use image processing library to extract EXIF data, etc.
    
    return {
      ...baseMetadata,
      resolution: { width: 1920, height: 1080 }, // Placeholder
      format: 'jpeg'
    };
  }

  private async extractVideoMetadata(file: Buffer, baseMetadata: IMediaMetadata): Promise<IMediaMetadata> {
    // Placeholder for video metadata extraction
    
    return {
      ...baseMetadata,
      duration: 120, // seconds
      resolution: { width: 1920, height: 1080 },
      fps: 30,
      format: 'mp4'
    };
  }

  private async extractAudioMetadata(file: Buffer, baseMetadata: IMediaMetadata): Promise<IMediaMetadata> {
    // Placeholder for audio metadata extraction
    
    return {
      ...baseMetadata,
      duration: 180, // seconds
      sampleRate: 44100,
      channels: 2,
      format: 'mp3'
    };
  }

  private validateImage(
    metadata: IMediaMetadata,
    errors: string[],
    warnings: string[],
    suggestions: string[]
  ): void {
    if (metadata.resolution) {
      if (metadata.resolution.width < 100 || metadata.resolution.height < 100) {
        warnings.push('Image resolution is very low');
      }
      
      if (metadata.resolution.width > 4096 || metadata.resolution.height > 4096) {
        suggestions.push('Consider reducing image size for better performance');
      }
    }

    if (metadata.fileSize > 10 * 1024 * 1024) { // 10MB
      warnings.push('Large image file size may impact loading performance');
    }
  }

  private validateVideo(
    metadata: IMediaMetadata,
    errors: string[],
    warnings: string[],
    suggestions: string[]
  ): void {
    if (metadata.duration && metadata.duration > 600) { // 10 minutes
      warnings.push('Long video duration may impact loading performance');
    }

    if (metadata.fps && metadata.fps > 60) {
      suggestions.push('Consider reducing frame rate for smaller file size');
    }

    if (metadata.fileSize > 100 * 1024 * 1024) { // 100MB
      warnings.push('Large video file size may impact loading performance');
    }
  }

  private validateAudio(
    metadata: IMediaMetadata,
    errors: string[],
    warnings: string[],
    suggestions: string[]
  ): void {
    if (metadata.duration && metadata.duration > 1800) { // 30 minutes
      warnings.push('Long audio duration may impact loading performance');
    }

    if (metadata.sampleRate && metadata.sampleRate > 48000) {
      suggestions.push('Consider reducing sample rate for smaller file size');
    }
  }

  private getQualitySettings(quality: MediaQuality): { maxWidth?: number; maxHeight?: number; compressionLevel?: number } {
    switch (quality) {
      case MediaQuality.THUMBNAIL:
        return { maxWidth: 150, maxHeight: 150, compressionLevel: 70 };
      case MediaQuality.LOW:
        return { maxWidth: 640, maxHeight: 480, compressionLevel: 60 };
      case MediaQuality.MEDIUM:
        return { maxWidth: 1280, maxHeight: 720, compressionLevel: 80 };
      case MediaQuality.HIGH:
        return { maxWidth: 1920, maxHeight: 1080, compressionLevel: 90 };
      case MediaQuality.ORIGINAL:
        return {};
      default:
        return { compressionLevel: 80 };
    }
  }

  private calculateNewResolution(
    original: { width: number; height: number },
    maxWidth: number,
    maxHeight: number,
    maintainAspectRatio: boolean
  ): { width: number; height: number } {
    if (!maintainAspectRatio) {
      return { width: maxWidth, height: maxHeight };
    }

    const aspectRatio = original.width / original.height;
    
    let newWidth = Math.min(original.width, maxWidth);
    let newHeight = Math.min(original.height, maxHeight);

    if (newWidth / aspectRatio > newHeight) {
      newWidth = newHeight * aspectRatio;
    } else {
      newHeight = newWidth / aspectRatio;
    }

    return {
      width: Math.round(newWidth),
      height: Math.round(newHeight)
    };
  }

  private getMediaTypeFromMimeType(mimeType: string): MediaType {
    if (mimeType.startsWith('image/')) return MediaType.IMAGE;
    if (mimeType.startsWith('video/')) return MediaType.VIDEO;
    if (mimeType.startsWith('audio/')) return MediaType.AUDIO;
    if (mimeType.startsWith('application/') || mimeType.startsWith('text/')) return MediaType.DOCUMENT;
    return MediaType.DOCUMENT;
  }

  private getFormatFromMimeType(mimeType: string): string {
    const parts = mimeType.split('/');
    return parts.length > 1 ? parts[1] : 'unknown';
  }

  private getMimeType(mediaType: MediaType, format: string): string {
    const mimeTypeMap: Record<MediaType, Record<string, string>> = {
      [MediaType.IMAGE]: {
        'jpeg': 'image/jpeg',
        'jpg': 'image/jpeg',
        'png': 'image/png',
        'gif': 'image/gif',
        'webp': 'image/webp'
      },
      [MediaType.VIDEO]: {
        'mp4': 'video/mp4',
        'webm': 'video/webm',
        'avi': 'video/avi',
        'mov': 'video/quicktime'
      },
      [MediaType.AUDIO]: {
        'mp3': 'audio/mpeg',
        'wav': 'audio/wav',
        'ogg': 'audio/ogg',
        'm4a': 'audio/mp4'
      },
      [MediaType.DOCUMENT]: {
        'pdf': 'application/pdf',
        'txt': 'text/plain',
        'doc': 'application/msword',
        'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
      },
      [MediaType.ANIMATION]: {
        'gif': 'image/gif',
        'mp4': 'video/mp4',
        'webm': 'video/webm'
      }
    };

    return mimeTypeMap[mediaType]?.[format.toLowerCase()] ?? 'application/octet-stream';
  }

  private getFileExtension(url: string): string {
    const parts = url.split('.');
    return parts.length > 1 ? `.${parts[parts.length - 1]}` : '';
  }

  private getFileName(url: string): string {
    const parts = url.split('/');
    return parts[parts.length - 1] ?? 'unknown';
  }
}
import { vi, MockedFunction, beforeEach, describe, expect, it } from 'vitest';
import { MediaService } from '../services/MediaService';
import {
  IMediaRepository,
  IMediaStorageService,
  IMediaProcessingService,
  IMediaAccessService
} from '../interfaces/MediaInterfaces';
import { ValidationError } from '../../../infrastructure/errors/types/ValidationError';
import { Types } from 'mongoose';
import { MediaType } from '../../../types/fitness/enums/media';
import { Media } from '../entities/Media';

describe('MediaService', () => {
  let mediaService: MediaService;
  let mockMediaRepository: {
    [K in keyof IMediaRepository]: MockedFunction<IMediaRepository[K]>
  };
  let mockStorageService: {
    [K in keyof IMediaStorageService]: MockedFunction<IMediaStorageService[K]>
  };
  let mockProcessingService: {
    [K in keyof IMediaProcessingService]: MockedFunction<IMediaProcessingService[K]>
  };
  let mockAccessService: {
    [K in keyof IMediaAccessService]: MockedFunction<IMediaAccessService[K]>
  };

  beforeEach(() => {
    mockMediaRepository = {
      findById: vi.fn(),
      findByTitle: vi.fn(),
      findByType: vi.fn(),
      findByOrganization: vi.fn(),
      findByUploader: vi.fn(),
      findByTags: vi.fn(),
      findAssociatedWith: vi.fn(),
      findPublicMedia: vi.fn(),
      findOrphanedMedia: vi.fn(),
      search: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      archive: vi.fn(),
      restore: vi.fn(),
      delete: vi.fn(),
      getStatistics: vi.fn(),
      getTotalStorageUsed: vi.fn(),
      findDuplicates: vi.fn(),
      findLargeFiles: vi.fn()
    };

    mockStorageService = {
      upload: vi.fn(),
      download: vi.fn(),
      delete: vi.fn(),
      copy: vi.fn(),
      move: vi.fn(),
      exists: vi.fn(),
      getFileInfo: vi.fn(),
      generateSignedUrl: vi.fn(),
      bulkUpload: vi.fn(),
      bulkDelete: vi.fn(),
      getStorageQuota: vi.fn()
    };

    mockProcessingService = {
      processMedia: vi.fn(),
      generateThumbnail: vi.fn(),
      optimizeForWeb: vi.fn(),
      extractMetadata: vi.fn(),
      validateMedia: vi.fn(),
      convertFormat: vi.fn(),
      compressMedia: vi.fn(),
      addWatermark: vi.fn(),
      createVariants: vi.fn()
    };

    mockAccessService = {
      checkAccess: vi.fn(),
      grantAccess: vi.fn(),
      revokeAccess: vi.fn(),
      getAccessPermissions: vi.fn(),
      logAccess: vi.fn(),
      getAccessHistory: vi.fn(),
      getUserAccessHistory: vi.fn(),
      findMostAccessedMedia: vi.fn()
    };

    mediaService = new MediaService(
      mockMediaRepository,
      mockStorageService,
      mockProcessingService,
      mockAccessService
    );
  });

  describe('uploadMedia', () => {
    const validUploadData = {
      file: Buffer.from('test file content'),
      filename: 'test-image.jpg',
      mimeType: 'image/jpeg',
      type: MediaType.IMAGE,
      title: 'Test Image',
      description: 'A test image for unit tests',
      organizationId: new Types.ObjectId(),
      uploadedBy: new Types.ObjectId()
    };

    it('should upload media with valid data', async () => {
      const mockValidation = {
        isValid: true,
        errors: [],
        warnings: [],
        suggestions: [],
        metadata: {
          fileSize: 1024,
          format: 'jpeg',
          resolution: { width: 800, height: 600 }
        }
      };

      const mockUploadResult = {
        url: 'https://example.com/uploads/test-image.jpg',
        metadata: mockValidation.metadata
      };

      mockProcessingService.validateMedia.mockResolvedValue(mockValidation);
      mockStorageService.upload.mockResolvedValue(mockUploadResult);
      mockMediaRepository.create.mockResolvedValue(expect.any(Media));
      mockProcessingService.generateThumbnail.mockResolvedValue('thumbnail-url');

      await mediaService.uploadMedia(validUploadData);

      expect(mockProcessingService.validateMedia).toHaveBeenCalled();
      expect(mockStorageService.upload).toHaveBeenCalled();
      expect(mockMediaRepository.create).toHaveBeenCalled();
      expect(mockProcessingService.generateThumbnail).toHaveBeenCalled();
    });

    it('should throw validation error for invalid file', async () => {
      const mockValidation = {
        isValid: false,
        errors: ['Invalid file format'],
        warnings: [],
        suggestions: []
      };

      mockProcessingService.validateMedia.mockResolvedValue(mockValidation);

      await expect(mediaService.uploadMedia(validUploadData))
        .rejects.toThrow(ValidationError);
    });

    it('should throw validation error for empty filename', async () => {
      const invalidData = { ...validUploadData, filename: '' };
      await expect(mediaService.uploadMedia(invalidData))
        .rejects.toThrow(ValidationError);
    });

    it('should throw validation error for invalid MIME type', async () => {
      const invalidData = { 
        ...validUploadData, 
        mimeType: 'application/pdf',
        type: MediaType.IMAGE 
      };
      await expect(mediaService.uploadMedia(invalidData))
        .rejects.toThrow(ValidationError);
    });

    it('should throw validation error for file too large', async () => {
      const largeFileData = { 
        ...validUploadData,
        file: Buffer.alloc(15 * 1024 * 1024) // 15MB file for 10MB image limit
      };
      await expect(mediaService.uploadMedia(largeFileData))
        .rejects.toThrow(ValidationError);
    });
  });

  describe('updateMedia', () => {
    it('should update media with valid data and permissions', async () => {
      const mediaId = new Types.ObjectId();
      const userId = new Types.ObjectId();
      const mockMedia = { id: mediaId } as any;

      mockMediaRepository.findById.mockResolvedValue(mockMedia);
      mockAccessService.checkAccess.mockResolvedValue(true);
      mockMediaRepository.update.mockResolvedValue(mockMedia);

      const updates = {
        title: 'Updated Title',
        description: 'Updated description'
      };

      const result = await mediaService.updateMedia(mediaId, updates, userId);

      expect(mockAccessService.checkAccess).toHaveBeenCalledWith(mediaId, userId, 'EDIT');
      expect(mockMediaRepository.update).toHaveBeenCalledWith(mediaId, updates);
      expect(result).toBe(mockMedia);
    });

    it('should throw error if user lacks permission', async () => {
      const mediaId = new Types.ObjectId();
      const userId = new Types.ObjectId();
      const mockMedia = { id: mediaId } as any;

      mockMediaRepository.findById.mockResolvedValue(mockMedia);
      mockAccessService.checkAccess.mockResolvedValue(false);

      await expect(mediaService.updateMedia(mediaId, {}, userId))
        .rejects.toThrow(ValidationError);
    });

    it('should validate title length', async () => {
      const mediaId = new Types.ObjectId();
      const userId = new Types.ObjectId();
      const mockMedia = { id: mediaId } as any;

      mockMediaRepository.findById.mockResolvedValue(mockMedia);
      mockAccessService.checkAccess.mockResolvedValue(true);

      const updates = {
        title: 'a'.repeat(250) // Exceeds 200 character limit
      };

      await expect(mediaService.updateMedia(mediaId, updates, userId))
        .rejects.toThrow(ValidationError);
    });
  });

  describe('deleteMedia', () => {
    it('should delete media with permissions and no associations', async () => {
      const mediaId = new Types.ObjectId();
      const userId = new Types.ObjectId();
      const mockMedia = {
        id: mediaId,
        url: 'https://example.com/test.jpg',
        canBeDeleted: vi.fn().mockReturnValue(true)
      } as any;

      mockMediaRepository.findById.mockResolvedValue(mockMedia);
      mockAccessService.checkAccess.mockResolvedValue(true);
      mockStorageService.delete.mockResolvedValue(true);
      mockMediaRepository.delete.mockResolvedValue(true);

      const result = await mediaService.deleteMedia(mediaId, userId);

      expect(mockAccessService.checkAccess).toHaveBeenCalledWith(mediaId, userId, 'EDIT');
      expect(mockStorageService.delete).toHaveBeenCalledWith(mockMedia.url);
      expect(mockMediaRepository.delete).toHaveBeenCalledWith(mediaId);
      expect(result).toBe(true);
    });

    it('should throw error if media has associations', async () => {
      const mediaId = new Types.ObjectId();
      const userId = new Types.ObjectId();
      const mockMedia = {
        id: mediaId,
        canBeDeleted: vi.fn().mockReturnValue(false)
      } as any;

      mockMediaRepository.findById.mockResolvedValue(mockMedia);
      mockAccessService.checkAccess.mockResolvedValue(true);

      await expect(mediaService.deleteMedia(mediaId, userId))
        .rejects.toThrow(ValidationError);
    });

    it('should throw error if user lacks permission', async () => {
      const mediaId = new Types.ObjectId();
      const userId = new Types.ObjectId();
      const mockMedia = { id: mediaId } as any;

      mockMediaRepository.findById.mockResolvedValue(mockMedia);
      mockAccessService.checkAccess.mockResolvedValue(false);

      await expect(mediaService.deleteMedia(mediaId, userId))
        .rejects.toThrow(ValidationError);
    });
  });

  describe('associateMedia', () => {
    it('should associate media with resource when user has permission', async () => {
      const mediaId = new Types.ObjectId();
      const resourceId = new Types.ObjectId();
      const userId = new Types.ObjectId();
      
      const mockMedia = {
        id: mediaId,
        addAssociation: vi.fn().mockReturnValue({
          associatedTo: [resourceId],
          associatedResourceTypes: ['EXERCISE']
        })
      } as any;

      mockMediaRepository.findById.mockResolvedValue(mockMedia);
      mockAccessService.checkAccess.mockResolvedValue(true);
      mockMediaRepository.update.mockResolvedValue(mockMedia);

      const result = await mediaService.associateMedia(mediaId, resourceId, 'EXERCISE' as any, userId);

      expect(mockAccessService.checkAccess).toHaveBeenCalledWith(mediaId, userId, 'EDIT');
      expect(mockMedia.addAssociation).toHaveBeenCalledWith(resourceId, 'EXERCISE');
      expect(mockMediaRepository.update).toHaveBeenCalled();
      expect(result).toBe(mockMedia);
    });

    it('should throw error if user lacks permission', async () => {
      const mediaId = new Types.ObjectId();
      const resourceId = new Types.ObjectId();
      const userId = new Types.ObjectId();
      const mockMedia = { id: mediaId } as any;

      mockMediaRepository.findById.mockResolvedValue(mockMedia);
      mockAccessService.checkAccess.mockResolvedValue(false);

      await expect(mediaService.associateMedia(mediaId, resourceId, 'EXERCISE' as any, userId))
        .rejects.toThrow(ValidationError);
    });
  });

  describe('downloadMedia', () => {
    it('should download media with proper permissions and logging', async () => {
      const mediaId = new Types.ObjectId();
      const userId = new Types.ObjectId();
      const mockMedia = {
        id: mediaId,
        url: 'https://example.com/test.jpg'
      } as any;
      const mockBuffer = Buffer.from('file content');

      mockMediaRepository.findById.mockResolvedValue(mockMedia);
      mockAccessService.checkAccess.mockResolvedValue(true);
      mockStorageService.download.mockResolvedValue(mockBuffer);
      mockAccessService.logAccess.mockResolvedValue({} as any);

      const result = await mediaService.downloadMedia(mediaId, userId);

      expect(mockAccessService.checkAccess).toHaveBeenCalledWith(mediaId, userId, 'DOWNLOAD');
      expect(mockStorageService.download).toHaveBeenCalledWith(mockMedia.url);
      expect(mockAccessService.logAccess).toHaveBeenCalledWith({
        mediaId,
        userId,
        accessType: 'DOWNLOAD',
        success: true
      });
      expect(result).toBe(mockBuffer);
    });

    it('should throw error if user lacks download permission', async () => {
      const mediaId = new Types.ObjectId();
      const userId = new Types.ObjectId();
      const mockMedia = { id: mediaId } as any;

      mockMediaRepository.findById.mockResolvedValue(mockMedia);
      mockAccessService.checkAccess.mockResolvedValue(false);

      await expect(mediaService.downloadMedia(mediaId, userId))
        .rejects.toThrow(ValidationError);
    });
  });

  describe('bulkUploadMedia', () => {
    it('should upload multiple files and handle errors gracefully', async () => {
      const files = [
        {
          file: Buffer.from('file1'),
          filename: 'test1.jpg',
          mimeType: 'image/jpeg',
          type: MediaType.IMAGE,
          organizationId: new Types.ObjectId(),
          uploadedBy: new Types.ObjectId()
        },
        {
          file: Buffer.from('file2'),
          filename: 'test2.jpg',
          mimeType: 'image/jpeg',
          type: MediaType.IMAGE,
          organizationId: new Types.ObjectId(),
          uploadedBy: new Types.ObjectId()
        }
      ];

      const mockValidation = {
        isValid: true,
        errors: [],
        warnings: [],
        suggestions: [],
        metadata: { fileSize: 1024, format: 'jpeg' }
      };

      const mockUploadResult = {
        url: 'https://example.com/uploads/test.jpg',
        metadata: mockValidation.metadata
      };

      mockProcessingService.validateMedia.mockResolvedValue(mockValidation);
      mockStorageService.upload.mockResolvedValue(mockUploadResult);
      mockMediaRepository.create
        .mockResolvedValueOnce(expect.any(Media))
        .mockRejectedValueOnce(new Error('Upload failed'));

      const result = await mediaService.bulkUploadMedia(files);

      expect(result).toHaveLength(1); // Only one successful upload
      expect(mockProcessingService.validateMedia).toHaveBeenCalledTimes(2);
    });
  });
});
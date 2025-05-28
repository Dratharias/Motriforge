import { describe, it, expect, beforeEach } from 'vitest';
import { Types } from 'mongoose';
import { Media } from '../entities/Media';
import { MediaType, MediaQuality } from '../../../types/fitness/enums/media';
import { ResourceType, Status } from '../../../types/core/enums';

describe('Media Entity', () => {
  let mediaData: any;
  let media: Media;

  beforeEach(() => {
    mediaData = {
      id: new Types.ObjectId(),
      url: 'https://example.com/media/exercise-demo.mp4',
      type: MediaType.VIDEO,
      title: 'Exercise Demonstration',
      description: 'Proper form demonstration for squats',
      metadata: {
        fileSize: 5242880, // 5MB
        duration: 120, // 2 minutes
        resolution: { width: 1920, height: 1080 },
        format: 'mp4',
        fps: 30
      },
      associatedTo: [new Types.ObjectId()],
      associatedResourceTypes: [ResourceType.EXERCISE],
      tags: ['exercise', 'demonstration', 'squats'],
      isPublic: false,
      organization: new Types.ObjectId(),
      uploadedBy: new Types.ObjectId(),
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: new Types.ObjectId(),
      isActive: true
    };
    media = new Media(mediaData);
  });

  it('should create media with all properties', () => {
    expect(media.id).toBe(mediaData.id);
    expect(media.url).toBe(mediaData.url);
    expect(media.type).toBe(mediaData.type);
    expect(media.title).toBe(mediaData.title);
    expect(media.description).toBe(mediaData.description);
    expect(media.isPublic).toBe(false);
    expect(media.isActive).toBe(true);
    expect(media.isDraft).toBe(false);
  });

  it('should check media type correctly', () => {
    expect(media.isVideo()).toBe(true);
    expect(media.isImage()).toBe(false);
    expect(media.isAudio()).toBe(false);
    expect(media.isDocument()).toBe(false);

    const imageMedia = new Media({
      ...mediaData,
      type: MediaType.IMAGE
    });
    expect(imageMedia.isImage()).toBe(true);
    expect(imageMedia.isVideo()).toBe(false);
  });

  it('should check access permissions correctly', () => {
    const sameOrgUser = {
      id: new Types.ObjectId(),
      organization: media.organization
    } as any;

    const differentOrgUser = {
      id: new Types.ObjectId(),
      organization: new Types.ObjectId()
    } as any;

    const uploader = {
      id: media.uploadedBy,
      organization: new Types.ObjectId()
    } as any;

    expect(media.isAccessibleBy(sameOrgUser)).toBe(true);
    expect(media.isAccessibleBy(differentOrgUser)).toBe(false);
    expect(media.isAccessibleBy(uploader)).toBe(true);

    // Public media should be accessible to anyone
    const publicMedia = media.setPublicAccess(true);
    expect(publicMedia.isAccessibleBy(differentOrgUser)).toBe(true);
  });

  it('should generate processed URLs correctly', () => {
    expect(media.getProcessedUrl()).toBe(media.url);
    expect(media.getProcessedUrl(MediaQuality.ORIGINAL)).toBe(media.url);
    expect(media.getProcessedUrl(MediaQuality.HIGH)).toBe('https://example.com/media/exercise-demo_high.mp4');
    expect(media.getProcessedUrl(MediaQuality.MEDIUM)).toBe('https://example.com/media/exercise-demo_medium.mp4');
    expect(media.getProcessedUrl(MediaQuality.LOW)).toBe('https://example.com/media/exercise-demo_low.mp4');
    expect(media.getProcessedUrl(MediaQuality.THUMBNAIL)).toBe('https://example.com/media/exercise-demo_thumbnail.mp4');
  });

  it('should get file information correctly', () => {
    expect(media.getFileName()).toBe('exercise-demo.mp4');
    expect(media.getFileExtension()).toBe('.mp4');
    expect(media.getFileSizeFormatted()).toBe('5.0 MB');
    expect(media.getDurationFormatted()).toBe('2:00');

    const shortMedia = new Media({
      ...mediaData,
      metadata: { ...mediaData.metadata, duration: 45 }
    });
    expect(shortMedia.getDurationFormatted()).toBe('45s');

    const noAudioMedia = new Media({
      ...mediaData,
      type: MediaType.IMAGE,
      metadata: { ...mediaData.metadata, duration: undefined }
    });
    expect(noAudioMedia.getDurationFormatted()).toBe(null);
  });

  it('should manage tags correctly', () => {
    expect(media.hasTag('exercise')).toBe(true);
    expect(media.hasTag('EXERCISE')).toBe(true); // Case insensitive
    expect(media.hasTag('nonexistent')).toBe(false);

    const withNewTag = media.addTag('fitness');
    expect(withNewTag.tags).toContain('fitness');
    expect(withNewTag.tags).toHaveLength(4);

    // Adding duplicate tag should not create duplicate
    const withDuplicate = withNewTag.addTag('fitness');
    expect(withDuplicate.tags).toHaveLength(4);

    const withoutTag = withNewTag.removeTag('fitness');
    expect(withoutTag.tags).not.toContain('fitness');
    expect(withoutTag.tags).toHaveLength(3);
  });

  it('should manage associations correctly', () => {
    const resourceId = mediaData.associatedTo[0];
    expect(media.isAssociatedWith(resourceId)).toBe(true);
    expect(media.isAssociatedWithResourceType(ResourceType.EXERCISE)).toBe(true);
    expect(media.isAssociatedWithResourceType(ResourceType.WORKOUT)).toBe(false);

    const newResourceId = new Types.ObjectId();
    const withNewAssociation = media.addAssociation(newResourceId, ResourceType.WORKOUT);
    expect(withNewAssociation.associatedTo).toContain(newResourceId);
    expect(withNewAssociation.associatedResourceTypes).toContain(ResourceType.WORKOUT);
    expect(withNewAssociation.associatedTo).toHaveLength(2);

    // Adding duplicate association should not create duplicate
    const withDuplicate = withNewAssociation.addAssociation(newResourceId, ResourceType.WORKOUT);
    expect(withDuplicate.associatedTo).toHaveLength(2);

    const withoutAssociation = withNewAssociation.removeAssociation(newResourceId);
    expect(withoutAssociation.associatedTo).not.toContain(newResourceId);
    expect(withoutAssociation.associatedTo).toHaveLength(1);
  });

  it('should update media properties correctly', () => {
    const updates = {
      title: 'Updated Title',
      description: 'Updated description',
      tags: ['new', 'tags'],
      isPublic: true,
      status: Status.INACTIVE
    };

    const updatedMedia = media.update(updates);
    expect(updatedMedia.title).toBe('Updated Title');
    expect(updatedMedia.description).toBe('Updated description');
    expect(updatedMedia.tags).toEqual(['new', 'tags']);
    expect(updatedMedia.isPublic).toBe(true);
    expect(updatedMedia.status).toBe(Status.INACTIVE);
    expect(updatedMedia.type).toBe(media.type); // Unchanged
    expect(updatedMedia.updatedAt).not.toBe(media.updatedAt);
  });

  it('should check quality requirements correctly', () => {
    expect(media.hasRequiredQuality(MediaQuality.HIGH)).toBe(true); // 1920x1080 meets high quality
    expect(media.hasRequiredQuality(MediaQuality.MEDIUM)).toBe(true);
    expect(media.hasRequiredQuality(MediaQuality.LOW)).toBe(true);
    expect(media.hasRequiredQuality(MediaQuality.THUMBNAIL)).toBe(true);

    const lowResMedia = new Media({
      ...mediaData,
      metadata: {
        ...mediaData.metadata,
        resolution: { width: 320, height: 240 }
      }
    });
    expect(lowResMedia.hasRequiredQuality(MediaQuality.HIGH)).toBe(false);
    expect(lowResMedia.hasRequiredQuality(MediaQuality.LOW)).toBe(false);
    expect(lowResMedia.hasRequiredQuality(MediaQuality.THUMBNAIL)).toBe(true);
  });

  it('should check web optimization correctly', () => {
    expect(media.isOptimizedForWeb()).toBe(true); // MP4 is web-optimized

    const webpImage = new Media({
      ...mediaData,
      type: MediaType.IMAGE,
      metadata: { ...mediaData.metadata, format: 'webp' }
    });
    expect(webpImage.isOptimizedForWeb()).toBe(true);

    const tiffImage = new Media({
      ...mediaData,
      type: MediaType.IMAGE,
      metadata: { ...mediaData.metadata, format: 'tiff' }
    });
    expect(tiffImage.isOptimizedForWeb()).toBe(false);
  });

  it('should check file size limits correctly', () => {
    expect(media.exceedsFileSizeLimit(10)).toBe(false); // 5MB file, 10MB limit
    expect(media.exceedsFileSizeLimit(3)).toBe(true); // 5MB file, 3MB limit
  });

  it('should determine deletion eligibility correctly', () => {
    expect(media.canBeDeleted()).toBe(false); // Has associations

    const unassociatedMedia = new Media({
      ...mediaData,
      associatedTo: [],
      associatedResourceTypes: []
    });
    expect(unassociatedMedia.canBeDeleted()).toBe(true);
  });

  it('should get association count correctly', () => {
    expect(media.getAssociationCount()).toBe(1);

    const multiAssociatedMedia = new Media({
      ...mediaData,
      associatedTo: [new Types.ObjectId(), new Types.ObjectId(), new Types.ObjectId()]
    });
    expect(multiAssociatedMedia.getAssociationCount()).toBe(3);
  });
});
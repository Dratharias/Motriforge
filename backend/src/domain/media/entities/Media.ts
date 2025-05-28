import { Types } from 'mongoose';
import { IEntity, IUser } from '../../../types/core/interfaces';
import { IArchivable, IShareable } from '../../../types/core/behaviors';
import { MediaType, MediaQuality } from '../../../types/fitness/enums/media';
import { Status, ResourceType } from '../../../types/core/enums';
import { IMediaMetadata } from '../interfaces/MediaInterfaces';

export class Media implements IEntity, IArchivable, IShareable {
  public readonly id: Types.ObjectId;
  public readonly url: string;
  public readonly type: MediaType;
  public readonly title?: string;
  public readonly description?: string;
  public readonly metadata: IMediaMetadata;
  public readonly associatedTo: readonly Types.ObjectId[];
  public readonly associatedResourceTypes: readonly ResourceType[];
  public readonly tags: readonly string[];
  public readonly status: Status;
  public readonly isPublic: boolean;
  public readonly organization: Types.ObjectId;
  public readonly uploadedBy: Types.ObjectId;
  public readonly createdAt: Date;
  public readonly updatedAt: Date;
  public readonly createdBy: Types.ObjectId;
  public readonly isActive: boolean;
  public readonly isDraft: boolean = false;

  constructor(data: {
    id: Types.ObjectId;
    url: string;
    type: MediaType;
    title?: string;
    description?: string;
    metadata: IMediaMetadata;
    associatedTo?: readonly Types.ObjectId[];
    associatedResourceTypes?: readonly ResourceType[];
    tags?: readonly string[];
    status?: Status;
    isPublic?: boolean;
    organization: Types.ObjectId;
    uploadedBy: Types.ObjectId;
    createdAt: Date;
    updatedAt: Date;
    createdBy: Types.ObjectId;
    isActive: boolean;
  }) {
    this.id = data.id;
    this.url = data.url;
    this.type = data.type;
    this.title = data.title;
    this.description = data.description;
    this.metadata = data.metadata;
    this.associatedTo = data.associatedTo ?? [];
    this.associatedResourceTypes = data.associatedResourceTypes ?? [];
    this.tags = data.tags ?? [];
    this.status = data.status ?? Status.ACTIVE;
    this.isPublic = data.isPublic ?? false;
    this.organization = data.organization;
    this.uploadedBy = data.uploadedBy;
    this.createdAt = data.createdAt;
    this.updatedAt = data.updatedAt;
    this.createdBy = data.createdBy;
    this.isActive = data.isActive;
  }

  isAccessibleBy(user: IUser): boolean {
    // Public media is accessible to anyone
    if (this.isPublic) {
      return true;
    }

    // Media within same organization
    if (user.organization.equals(this.organization)) {
      return true;
    }

    // Media uploaded by the user
    if (user.id.equals(this.uploadedBy)) {
      return true;
    }

    return false;
  }

  getProcessedUrl(quality?: MediaQuality): string {
    if (!quality || quality === MediaQuality.ORIGINAL) {
      return this.url;
    }

    // Generate processed URL based on quality
    const extension = this.getFileExtension();
    const basePath = this.url.replace(extension, '');
    return `${basePath}_${quality.toLowerCase()}${extension}`;
  }

  getFileExtension(): string {
    const urlParts = this.url.split('.');
    return urlParts.length > 1 ? `.${urlParts[urlParts.length - 1]}` : '';
  }

  getFileName(): string {
    const urlParts = this.url.split('/');
    return urlParts[urlParts.length - 1] || 'unknown';
  }

  getFileSizeFormatted(): string {
    const bytes = this.metadata.fileSize;
    const units = ['B', 'KB', 'MB', 'GB', 'TB'];
    let size = bytes;
    let unitIndex = 0;

    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }

    return `${size.toFixed(1)} ${units[unitIndex]}`;
  }

  getDurationFormatted(): string | null {
    if (!this.metadata.duration) {
      return null;
    }

    const seconds = Math.floor(this.metadata.duration);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;

    if (minutes === 0) {
      return `${remainingSeconds}s`;
    }

    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  }

  isVideo(): boolean {
    return this.type === MediaType.VIDEO;
  }

  isImage(): boolean {
    return this.type === MediaType.IMAGE;
  }

  isAudio(): boolean {
    return this.type === MediaType.AUDIO;
  }

  isDocument(): boolean {
    return this.type === MediaType.DOCUMENT;
  }

  hasTag(tag: string): boolean {
    return this.tags.includes(tag.toLowerCase());
  }

  isAssociatedWith(resourceId: Types.ObjectId): boolean {
    return this.associatedTo.some(id => id.equals(resourceId));
  }

  isAssociatedWithResourceType(resourceType: ResourceType): boolean {
    return this.associatedResourceTypes.includes(resourceType);
  }

  addAssociation(resourceId: Types.ObjectId, resourceType: ResourceType): Media {
    if (this.isAssociatedWith(resourceId)) {
      return this;
    }

    return new Media({
      ...this,
      associatedTo: [...this.associatedTo, resourceId],
      associatedResourceTypes: [...this.associatedResourceTypes, resourceType],
      updatedAt: new Date()
    });
  }

  removeAssociation(resourceId: Types.ObjectId): Media {
    const index = this.associatedTo.findIndex(id => id.equals(resourceId));
    if (index === -1) {
      return this;
    }

    const newAssociatedTo = this.associatedTo.filter(id => !id.equals(resourceId));
    const newResourceTypes = [...this.associatedResourceTypes];
    newResourceTypes.splice(index, 1);

    return new Media({
      ...this,
      associatedTo: newAssociatedTo,
      associatedResourceTypes: newResourceTypes,
      updatedAt: new Date()
    });
  }

  addTag(tag: string): Media {
    const normalizedTag = tag.toLowerCase().trim();
    if (this.hasTag(normalizedTag)) {
      return this;
    }

    return new Media({
      ...this,
      tags: [...this.tags, normalizedTag],
      updatedAt: new Date()
    });
  }

  removeTag(tag: string): Media {
    const normalizedTag = tag.toLowerCase().trim();
    return new Media({
      ...this,
      tags: this.tags.filter(t => t !== normalizedTag),
      updatedAt: new Date()
    });
  }

  setPublicAccess(isPublic: boolean): Media {
    return new Media({
      ...this,
      isPublic,
      updatedAt: new Date()
    });
  }

  update(updates: {
    title?: string;
    description?: string;
    tags?: readonly string[];
    isPublic?: boolean;
    status?: Status;
  }): Media {
    return new Media({
      ...this,
      title: updates.title ?? this.title,
      description: updates.description ?? this.description,
      tags: updates.tags ?? this.tags,
      isPublic: updates.isPublic ?? this.isPublic,
      status: updates.status ?? this.status,
      updatedAt: new Date()
    });
  }

  // IArchivable implementation
  archive(): void {
    // Implementation would be handled by repository
  }

  restore(): void {
    // Implementation would be handled by repository
  }

  canBeDeleted(): boolean {
    // Can only delete if not associated with any resources
    return this.associatedTo.length === 0;
  }

  getAssociationCount(): number {
    return this.associatedTo.length;
  }

  // IShareable implementation
  canBeSharedWith(user: IUser): boolean {
    // Media can be shared if user has access to the organization
    return user.organization.equals(this.organization) || this.isPublic;
  }

  async share(targetUser: IUser, permissions: readonly any[]): Promise<void> {
    // Implementation would handle sharing logic
  }

  // Quality and format validation
  hasRequiredQuality(requiredQuality: MediaQuality): boolean {
    if (this.type !== MediaType.IMAGE && this.type !== MediaType.VIDEO) {
      return true; // Quality only applies to images and videos
    }

    const resolution = this.metadata.resolution;
    if (!resolution) {
      return false;
    }

    switch (requiredQuality) {
      case MediaQuality.THUMBNAIL:
        return resolution.width >= 150 && resolution.height >= 150;
      case MediaQuality.LOW:
        return resolution.width >= 480 && resolution.height >= 360;
      case MediaQuality.MEDIUM:
        return resolution.width >= 720 && resolution.height >= 480;
      case MediaQuality.HIGH:
        return resolution.width >= 1280 && resolution.height >= 720;
      case MediaQuality.ORIGINAL:
        return true;
      default:
        return false;
    }
  }

  isOptimizedForWeb(): boolean {
    if (this.type === MediaType.IMAGE) {
      return ['jpg', 'jpeg', 'png', 'webp'].includes(
        this.metadata.format.toLowerCase()
      );
    }

    if (this.type === MediaType.VIDEO) {
      return ['mp4', 'webm'].includes(
        this.metadata.format.toLowerCase()
      );
    }

    return true;
  }

  exceedsFileSizeLimit(limitInMB: number): boolean {
    const limitInBytes = limitInMB * 1024 * 1024;
    return this.metadata.fileSize > limitInBytes;
  }
}
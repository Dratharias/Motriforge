import { Types } from 'mongoose';
import { MediaType, MediaQuality } from '../../../types/fitness/enums/media';
import { ResourceType, Status } from '../../../types/core/enums';
import { Media } from '../entities/Media';
import { NewEntity } from '../../../types/core/interfaces';

export interface IMediaStatistics {
  readonly totalMedia: number;
  readonly mediaByType: Record<MediaType, number>;
  readonly mediaByStatus: Record<Status, number>;
  readonly totalFileSize: number;
  readonly averageFileSize: number;
  readonly publicMediaCount: number;
  readonly privateMediaCount: number;
  readonly orphanedMediaCount: number;
  readonly mediaByFormat: Record<string, number>;
  readonly storageUsageByOrganization: Record<string, number>;
  readonly uploadTrends: {
    readonly daily: Record<string, number>;
    readonly monthly: Record<string, number>;
  };
}

export interface IMediaValidationResult {
  readonly isValid: boolean;
  readonly errors: readonly string[];
  readonly warnings: readonly string[];
  readonly suggestions: readonly string[];
  readonly metadata?: IMediaMetadata;
}

export interface IMediaAccessLog {
  readonly id: Types.ObjectId;
  readonly mediaId: Types.ObjectId;
  readonly userId: Types.ObjectId;
  readonly accessType: 'VIEW' | 'DOWNLOAD' | 'SHARE' | 'EDIT';
  readonly ipAddress?: string;
  readonly userAgent?: string;
  readonly timestamp: Date;
  readonly success: boolean;
  readonly errorReason?: string;
}

export interface IMediaRepository {
  findById(id: Types.ObjectId): Promise<Media | null>;
  findByTitle(title: string): Promise<readonly Media[]>;
  findByType(type: MediaType): Promise<readonly Media[]>;
  findByOrganization(organizationId: Types.ObjectId): Promise<readonly Media[]>;
  findByUploader(uploaderId: Types.ObjectId): Promise<readonly Media[]>;
  findByTags(tags: readonly string[]): Promise<readonly Media[]>;
  findAssociatedWith(resourceId: Types.ObjectId): Promise<readonly Media[]>;
  findPublicMedia(): Promise<readonly Media[]>;
  findOrphanedMedia(organizationId: Types.ObjectId): Promise<readonly Media[]>;
  search(criteria: IMediaSearchCriteria): Promise<readonly Media[]>;
  create(media: Omit<Media, NewEntity>): Promise<Media>;
  update(id: Types.ObjectId, updates: Partial<Media>): Promise<Media | null>;
  archive(id: Types.ObjectId): Promise<boolean>;
  restore(id: Types.ObjectId): Promise<boolean>;
  delete(id: Types.ObjectId): Promise<boolean>;
  getStatistics(organizationId?: Types.ObjectId): Promise<IMediaStatistics>;
  getTotalStorageUsed(organizationId: Types.ObjectId): Promise<number>;
  findDuplicates(organizationId: Types.ObjectId): Promise<readonly Media[][]>;
  findLargeFiles(organizationId: Types.ObjectId, minSizeMB: number): Promise<readonly Media[]>;
}

export interface IMediaProcessingService {
  processMedia(mediaId: Types.ObjectId, options: IMediaProcessingOptions): Promise<Media>;
  generateThumbnail(mediaId: Types.ObjectId): Promise<string>; // Returns URL
  optimizeForWeb(mediaId: Types.ObjectId): Promise<Media>;
  extractMetadata(file: Buffer, mimeType: string): Promise<IMediaMetadata>;
  validateMedia(file: Buffer, mimeType: string): Promise<IMediaValidationResult>;
  convertFormat(mediaId: Types.ObjectId, targetFormat: string): Promise<Media>;
  compressMedia(mediaId: Types.ObjectId, compressionLevel: number): Promise<Media>;
  addWatermark(mediaId: Types.ObjectId, watermarkOptions: IMediaProcessingOptions['watermark']): Promise<Media>;
  createVariants(mediaId: Types.ObjectId, qualities: readonly MediaQuality[]): Promise<readonly Media[]>;
}

export interface IMediaStorageService {
  upload(data: IMediaUploadData): Promise<{ url: string; metadata: IMediaMetadata }>;
  download(url: string): Promise<Buffer>;
  delete(url: string): Promise<boolean>;
  copy(sourceUrl: string, destinationUrl: string): Promise<string>;
  move(sourceUrl: string, destinationUrl: string): Promise<string>;
  exists(url: string): Promise<boolean>;
  getFileInfo(url: string): Promise<{ size: number; lastModified: Date; contentType: string }>;
  generateSignedUrl(url: string, expirationMinutes: number): Promise<string>;
  bulkUpload(files: readonly IMediaUploadData[]): Promise<readonly { url: string; metadata: IMediaMetadata }[]>;
  bulkDelete(urls: readonly string[]): Promise<readonly boolean[]>;
  getStorageQuota(organizationId: Types.ObjectId): Promise<{ used: number; limit: number; remaining: number }>;
}

export interface IMediaAccessService {
  checkAccess(mediaId: Types.ObjectId, userId: Types.ObjectId, accessType: string): Promise<boolean>;
  grantAccess(mediaId: Types.ObjectId, userId: Types.ObjectId, permissions: readonly string[]): Promise<boolean>;
  revokeAccess(mediaId: Types.ObjectId, userId: Types.ObjectId): Promise<boolean>;
  getAccessPermissions(mediaId: Types.ObjectId, userId: Types.ObjectId): Promise<readonly string[]>;
  logAccess(log: Omit<IMediaAccessLog, 'id' | 'timestamp'>): Promise<IMediaAccessLog>;
  getAccessHistory(mediaId: Types.ObjectId): Promise<readonly IMediaAccessLog[]>;
  getUserAccessHistory(userId: Types.ObjectId): Promise<readonly IMediaAccessLog[]>;
  findMostAccessedMedia(organizationId: Types.ObjectId, limit: number): Promise<readonly {
    media: Media;
    accessCount: number;
  }[]>;
}

export interface IMediaCleanupService {
  findOrphanedMedia(organizationId: Types.ObjectId): Promise<readonly Media[]>;
  findUnusedMedia(organizationId: Types.ObjectId, daysSinceLastAccess: number): Promise<readonly Media[]>;
  findDuplicateMedia(organizationId: Types.ObjectId): Promise<readonly Media[][]>;
  findCorruptedMedia(organizationId: Types.ObjectId): Promise<readonly Media[]>;
  cleanupOrphanedMedia(organizationId: Types.ObjectId, dryRun?: boolean): Promise<{ deleted: number; errors: string[] }>;
  cleanupUnusedMedia(organizationId: Types.ObjectId, daysSinceLastAccess: number, dryRun?: boolean): Promise<{ deleted: number; errors: string[] }>;
  validateMediaIntegrity(organizationId: Types.ObjectId): Promise<{ valid: number; corrupted: Media[]; missing: Media[] }>;
}

export interface IMediaMigrationService {
  migrateToNewStorage(organizationId: Types.ObjectId, targetStorage: string): Promise<{ migrated: number; errors: string[] }>;
  backupMedia(organizationId: Types.ObjectId, backupLocation: string): Promise<{ backed: number; errors: string[] }>;
  restoreFromBackup(organizationId: Types.ObjectId, backupLocation: string): Promise<{ restored: number; errors: string[] }>;
  updateUrls(organizationId: Types.ObjectId, urlMapping: Record<string, string>): Promise<{ updated: number; errors: string[] }>;
}

export interface IMediaAnalyticsService {
  getUsageAnalytics(organizationId: Types.ObjectId, startDate: Date, endDate: Date): Promise<{
    totalViews: number;
    totalDownloads: number;
    popularMedia: readonly { media: Media; views: number; downloads: number }[];
    usageByType: Record<MediaType, number>;
    usageByUser: Record<string, number>;
    peakUsageTimes: readonly { hour: number; count: number }[];
  }>;
  getStorageAnalytics(organizationId: Types.ObjectId): Promise<{
    totalStorage: number;
    storageByType: Record<MediaType, number>;
    storageGrowth: readonly { date: string; totalSize: number }[];
    largestFiles: readonly { media: Media; size: number }[];
    storageEfficiency: {
      duplicates: number;
      orphaned: number;
      unused: number;
    };
  }>;
  generateReport(organizationId: Types.ObjectId, reportType: 'usage' | 'storage' | 'compliance'): Promise<{
    reportId: string;
    generatedAt: Date;
    data: Record<string, unknown>;
  }>;
}

export interface IMediaComplianceService {
  checkCompliance(mediaId: Types.ObjectId, complianceRules: readonly string[]): Promise<{
    isCompliant: boolean;
    violations: readonly string[];
    recommendations: readonly string[];
  }>;
  auditMediaAccess(organizationId: Types.ObjectId, startDate: Date, endDate: Date): Promise<{
    totalAccesses: number;
    unauthorizedAttempts: number;
    suspiciousActivity: readonly IMediaAccessLog[];
    complianceScore: number;
  }>;
  applyDataRetentionPolicy(organizationId: Types.ObjectId, retentionDays: number): Promise<{
    reviewed: number;
    archived: number;
    deleted: number;
  }>;
  generateComplianceReport(organizationId: Types.ObjectId): Promise<{
    reportId: string;
    complianceStatus: 'COMPLIANT' | 'NON_COMPLIANT' | 'NEEDS_REVIEW';
    issues: readonly string[];
    recommendations: readonly string[];
  }>;
} interface IResolution {
  readonly width: number;
  readonly height: number;
}

export interface ICompressionInfo {
  readonly originalSize: number;
  readonly compressionRatio: number;
  readonly codec: string;
  readonly bitrate?: number;
  readonly quality?: number;
}

export interface IMediaMetadata {
  readonly fileSize: number;
  readonly duration?: number; // in seconds
  resolution?: IResolution;
  readonly format: string;
  compressionInfo?: ICompressionInfo;
  readonly fps?: number; // frames per second for video
  readonly sampleRate?: number; // for audio
  readonly channels?: number; // for audio
  readonly colorProfile?: string; // for images
  readonly orientation?: number; // EXIF orientation for images
  readonly capturedAt?: Date; // when media was originally captured
  readonly gpsLocation?: {
    readonly latitude: number;
    readonly longitude: number;
  };
  readonly cameraInfo?: {
    readonly make?: string;
    readonly model?: string;
    readonly lens?: string;
    readonly settings?: Record<string, unknown>;
  };
}

export interface IMediaProcessingOptions {
  readonly targetQuality: MediaQuality;
  readonly maxWidth?: number;
  readonly maxHeight?: number;
  readonly compressionLevel?: number;
  readonly format?: string;
  readonly maintainAspectRatio?: boolean;
  readonly watermark?: {
    readonly text: string;
    readonly position: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'center';
    readonly opacity: number;
  };
}

export interface IMediaUploadData {
  readonly file: Buffer | string; // File buffer or base64 string
  readonly filename: string;
  readonly mimeType: string;
  readonly type: MediaType;
  readonly title?: string;
  readonly description?: string;
  readonly tags?: readonly string[];
  readonly isPublic?: boolean;
  readonly organizationId: Types.ObjectId;
  readonly uploadedBy: Types.ObjectId;
  readonly associatedTo?: readonly Types.ObjectId[];
  readonly associatedResourceTypes?: readonly ResourceType[];
}

export interface IMediaSearchCriteria {
  readonly title?: string;
  readonly description?: string;
  readonly type?: MediaType;
  readonly tags?: readonly string[];
  readonly organizationId?: Types.ObjectId;
  readonly uploadedBy?: Types.ObjectId;
  readonly isPublic?: boolean;
  readonly status?: Status;
  readonly associatedResourceType?: ResourceType;
  readonly minFileSize?: number;
  readonly maxFileSize?: number;
  readonly minDuration?: number;
  readonly maxDuration?: number;
  readonly format?: string;
  readonly hasResolution?: boolean;
  readonly minWidth?: number;
  readonly maxWidth?: number;
  readonly minHeight?: number;
  readonly maxHeight?: number;
  readonly uploadedAfter?: Date;
  readonly uploadedBefore?: Date;
  readonly hasGpsLocation?: boolean;
}
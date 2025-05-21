import { Readable } from 'stream';
import { LoggerFacade } from '../../core/logging/LoggerFacade';

/**
 * Types of supported storage providers
 */
export enum StorageProviderType {
  LOCAL_FILESYSTEM = 'local-filesystem',
  CLOUDFLARE_R2 = 'cloudflare-r2'
}

/**
 * Factory for creating storage providers
 */
export class StorageProviderFactory {
  /**
   * Create and initialize a storage provider
   * @param type Type of storage provider
   * @param config Provider configuration
   * @param logger Logger facade
   */
  /**
   * Create and initialize a storage provider
   * @param type Type of storage provider
   * @param config Provider configuration
   * @param logger Logger facade
   */
  public static async create(
    type: StorageProviderType,
    config: any,
    logger: LoggerFacade
  ): Promise<StorageProvider> {
    let provider: StorageProvider;
    
    // Import only the needed provider class
    if (type === StorageProviderType.LOCAL_FILESYSTEM) {
      const { LocalFileSystemProvider } = await import('./providers/LocalFileSystemProvider');
      provider = new LocalFileSystemProvider(config, logger);
    } else if (type === StorageProviderType.CLOUDFLARE_R2) {
      const { CloudflareR2Provider } = await import('./providers/CloudflareR2Provider');
      provider = new CloudflareR2Provider(config, logger);
    } else {
      throw new Error(`Unsupported storage provider type: ${type}`);
    }
    
    await provider.initialize();
    return provider;
  }
}
/**
 * Options for file storage operations
 */
export interface StorageOptions {
  contentType?: string;
  metadata?: Record<string, string>;
  isPublic?: boolean;
  cacheControl?: string;
  encoding?: string;
}

/**
 * Result of a file upload operation
 */
export interface UploadResult {
  key: string;
  url: string;
  etag?: string;
  size: number;
  metadata: Record<string, string>;
  contentType: string;
}

/**
 * Result of a file stat operation
 */
export interface FileStats {
  key: string;
  size: number;
  lastModified: Date;
  contentType?: string;
  metadata?: Record<string, string>;
  etag?: string;
}

/**
 * Information about a signed URL
 */
export interface SignedUrlInfo {
  url: string;
  expiresAt: Date;
  contentType?: string;
}

/**
 * Interface for storage providers that handle file operations
 */
export interface StorageProvider {
  /**
   * Unique identifier for the provider type
   */
  readonly providerType: string;

  /**
   * Initialize the storage provider
   * This must be called after creating an instance and before using any methods
   */
  initialize(): Promise<void>;

  /**
   * Upload a file to storage
   * @param key Unique identifier/path for the file
   * @param content File content as Buffer, ReadableStream, or string
   * @param options Upload options
   */
  uploadFile(
    key: string, 
    content: Buffer | Readable | string, 
    options?: StorageOptions
  ): Promise<UploadResult>;

  /**
   * Download a file from storage
   * @param key Unique identifier/path for the file
   */
  downloadFile(key: string): Promise<Buffer>;

  /**
   * Delete a file from storage
   * @param key Unique identifier/path for the file
   */
  deleteFile(key: string): Promise<boolean>;

  /**
   * Check if a file exists in storage
   * @param key Unique identifier/path for the file
   */
  fileExists(key: string): Promise<boolean>;

  /**
   * Get file metadata/stats
   * @param key Unique identifier/path for the file
   */
  getFileStats(key: string): Promise<FileStats>;

  /**
   * Generate a signed URL for temporary access to a file
   * @param key Unique identifier/path for the file
   * @param expirySeconds Number of seconds until the URL expires
   * @param options Additional options for the signed URL
   */
  getSignedUrl(
    key: string, 
    expirySeconds: number, 
    options?: {
      contentType?: string;
      contentDisposition?: string;
      download?: boolean;
    }
  ): Promise<SignedUrlInfo>;

  /**
   * Generate a signed URL for uploading a file directly
   * @param key Unique identifier/path for the file
   * @param expirySeconds Number of seconds until the URL expires
   * @param options Additional options for the signed URL
   */
  getSignedUploadUrl(
    key: string, 
    expirySeconds: number, 
    options?: {
      contentType?: string;
      maxSize?: number;
      metadata?: Record<string, string>;
    }
  ): Promise<SignedUrlInfo>;

  /**
   * Copy a file within the same storage
   * @param sourceKey Source file key
   * @param destinationKey Destination file key
   */
  copyFile(sourceKey: string, destinationKey: string): Promise<UploadResult>;

  /**
   * List files in a directory/prefix
   * @param prefix Directory prefix
   * @param limit Maximum number of files to list
   * @param continuationToken Token for paginated results
   */
  listFiles(
    prefix: string,
    limit?: number,
    continuationToken?: string
  ): Promise<{
    files: FileStats[];
    continuationToken?: string;
    isTruncated: boolean;
  }>;

  /**
   * Create a readable stream for a file
   * @param key Unique identifier/path for the file
   */
  createReadStream(key: string): Promise<Readable>;

  /**
   * Get a public URL for a file (if supported)
   * @param key Unique identifier/path for the file
   */
  getPublicUrl(key: string): string | null;

  /**
   * Update file metadata
   * @param key Unique identifier/path for the file
   * @param metadata Metadata key-value pairs
   */
  updateMetadata(key: string, metadata: Record<string, string>): Promise<void>;
}
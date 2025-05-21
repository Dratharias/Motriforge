import {
  StorageProvider,
  StorageOptions,
  UploadResult,
  FileStats,
  SignedUrlInfo
} from '../StorageProvider';
import { Readable } from 'stream';
import {
  S3Client, S3ClientConfig,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  HeadObjectCommand,
  CopyObjectCommand,
  ListObjectsV2Command,
  HeadBucketCommand,
  PutObjectCommandInput,
  GetObjectCommandInput,
  HeadObjectCommandInput,
  CopyObjectCommandInput,
  ListObjectsV2CommandInput
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { NodeHttpHandler } from '@smithy/node-http-handler';
import * as mime from 'mime-types';
import { LoggerFacade } from '../../../core/logging/LoggerFacade';

/**
 * Configuration for CloudflareR2Provider
 */
interface R2Config {
  accountId: string;
  accessKeyId: string;
  secretAccessKey: string;
  bucketName: string;
  publicUrlPattern?: string;
  region?: string;
  endpoint?: string;
}

/**
 * Storage provider implementation using Cloudflare R2
 */
export class CloudflareR2Provider implements StorageProvider {
  readonly providerType = 'cloudflare-r2';
  
  private readonly client: S3Client;
  private readonly config: R2Config;
  private readonly logger: LoggerFacade;

  constructor(config: R2Config, logger: LoggerFacade) {
    this.config = config;
    this.logger = logger;

    // Configure S3 client for R2
    const clientConfig: S3ClientConfig = {
      region: config.region ?? 'auto',
      credentials: {
        accessKeyId: config.accessKeyId,
        secretAccessKey: config.secretAccessKey
      },
      endpoint: config.endpoint ?? `https://${config.accountId}.r2.cloudflarestorage.com`,
      requestHandler: new NodeHttpHandler({
        connectionTimeout: 5000, // 5 seconds
        socketTimeout: 60000 // 60 seconds
      })
    };

    this.client = new S3Client(clientConfig);
  }

  /**
   * Initialize the storage provider
   * This must be called after creating an instance and before using any methods
   */
  public async initialize(): Promise<void> {
    this.logger.debug('CloudflareR2Provider initialized', {
      bucketName: this.config.bucketName,
      endpoint: this.client.config.endpoint
    });
    
    // Verify connection by checking bucket existence
    try {
      await this.client.send(new HeadBucketCommand({
        Bucket: this.config.bucketName
      }));
    } catch (error) {
      this.logger.error('Failed to connect to R2 bucket', { 
        error, 
        bucketName: this.config.bucketName 
      });
      throw new Error(`Failed to initialize R2 provider: ${(error as Error).message}`);
    }
  }

  /**
   * Upload a file to storage
   * @param key Unique identifier/path for the file
   * @param content File content as Buffer, ReadableStream, or string
   * @param options Upload options
   */
  public async uploadFile(
    key: string,
    content: Buffer | Readable | string,
    options: StorageOptions = {}
  ): Promise<UploadResult> {
    try {
      let body: Buffer | Readable | string = content;
      
      // Convert string to Buffer if needed
      if (typeof content === 'string') {
        body = Buffer.from(content, options.encoding as BufferEncoding ?? 'utf8');
      }

      // Determine content type
      const contentType = options.contentType ?? mime.lookup(key) ?? 'application/octet-stream';

      // Prepare upload parameters
      const params: PutObjectCommandInput = {
        Bucket: this.config.bucketName,
        Key: key,
        Body: body,
        ContentType: contentType,
        Metadata: this.formatMetadata(options.metadata),
        CacheControl: options.cacheControl
      };

      // Set ACL if public
      if (options.isPublic) {
        params.ACL = 'public-read';
      }

      // Execute upload
      const result = await this.client.send(new PutObjectCommand(params));
      
      // Get file size
      const headParams: HeadObjectCommandInput = {
        Bucket: this.config.bucketName,
        Key: key
      };
      
      const headResult = await this.client.send(new HeadObjectCommand(headParams));
      const size = headResult.ContentLength ?? 0;

      this.logger.debug('File uploaded successfully to R2', {
        key,
        size,
        etag: result.ETag
      });

      return {
        key,
        url: this.getPublicUrl(key) ?? '',
        etag: result.ETag?.replace(/"/g, ''), // Remove quotes from ETag
        size,
        metadata: options.metadata || {},
        contentType
      };
    } catch (error) {
      this.logger.error('Failed to upload file to R2', { error, key });
      throw error;
    }
  }

  /**
   * Download a file from storage
   * @param key Unique identifier/path for the file
   */
  public async downloadFile(key: string): Promise<Buffer> {
    try {
      const params: GetObjectCommandInput = {
        Bucket: this.config.bucketName,
        Key: key
      };

      const result = await this.client.send(new GetObjectCommand(params));
      
      if (!result.Body) {
        throw new Error(`Empty response body for key: ${key}`);
      }

      // Convert stream to buffer
      const chunks: Buffer[] = [];
      for await (const chunk of result.Body as any) {
        chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
      }

      return Buffer.concat(chunks);
    } catch (error) {
      this.logger.error('Failed to download file from R2', { error, key });
      throw error;
    }
  }

  /**
   * Delete a file from storage
   * @param key Unique identifier/path for the file
   */
  public async deleteFile(key: string): Promise<boolean> {
    try {
      const params = {
        Bucket: this.config.bucketName,
        Key: key
      };

      await this.client.send(new DeleteObjectCommand(params));
      this.logger.debug('File deleted successfully from R2', { key });
      
      return true;
    } catch (error) {
      this.logger.error('Failed to delete file from R2', { error, key });
      throw error;
    }
  }

  /**
   * Check if a file exists in storage
   * @param key Unique identifier/path for the file
   */
  public async fileExists(key: string): Promise<boolean> {
    try {
      const params: HeadObjectCommandInput = {
        Bucket: this.config.bucketName,
        Key: key
      };

      await this.client.send(new HeadObjectCommand(params));
      return true;
    } catch (error) {
      if ((error as any).name === 'NotFound') {
        return false;
      }
      this.logger.error('Error checking if file exists in R2', { error, key });
      throw error;
    }
  }

  /**
   * Get file metadata/stats
   * @param key Unique identifier/path for the file
   */
  public async getFileStats(key: string): Promise<FileStats> {
    try {
      const params: HeadObjectCommandInput = {
        Bucket: this.config.bucketName,
        Key: key
      };

      const result = await this.client.send(new HeadObjectCommand(params));
      
      return {
        key,
        size: result.ContentLength ?? 0,
        lastModified: result.LastModified ?? new Date(),
        contentType: result.ContentType,
        metadata: this.parseMetadata(result.Metadata),
        etag: result.ETag?.replace(/"/g, '') // Remove quotes from ETag
      };
    } catch (error) {
      this.logger.error('Failed to get file stats from R2', { error, key });
      throw error;
    }
  }

  /**
   * Generate a signed URL for temporary access to a file
   * @param key Unique identifier/path for the file
   * @param expirySeconds Number of seconds until the URL expires
   * @param options Additional options for the signed URL
   */
  public async getSignedUrl(
    key: string,
    expirySeconds: number,
    options: { contentType?: string; contentDisposition?: string; download?: boolean } = {}
  ): Promise<SignedUrlInfo> {
    try {
      const params: GetObjectCommandInput = {
        Bucket: this.config.bucketName,
        Key: key
      };

      // Set content disposition if needed
      if (options.contentDisposition || options.download) {
        params.ResponseContentDisposition = options.contentDisposition ?? 
          (options.download ? `attachment; filename="${key.split('/').pop()}"` : undefined);
      }

      // Set content type if provided
      if (options.contentType) {
        params.ResponseContentType = options.contentType;
      }

      const command = new GetObjectCommand(params);
      const url = await getSignedUrl(this.client, command, { expiresIn: expirySeconds });
      
      return {
        url,
        expiresAt: new Date(Date.now() + expirySeconds * 1000),
        contentType: options.contentType
      };
    } catch (error) {
      this.logger.error('Failed to generate signed URL for R2', { error, key });
      throw error;
    }
  }

  /**
   * Generate a signed URL for uploading a file directly
   * @param key Unique identifier/path for the file
   * @param expirySeconds Number of seconds until the URL expires
   * @param options Additional options for the signed URL
   */
  public async getSignedUploadUrl(
    key: string,
    expirySeconds: number,
    options: { contentType?: string; maxSize?: number; metadata?: Record<string, string> } = {}
  ): Promise<SignedUrlInfo> {
    try {
      const params: PutObjectCommandInput = {
        Bucket: this.config.bucketName,
        Key: key,
        ContentType: options.contentType
      };

      // Add metadata if provided
      if (options.metadata) {
        params.Metadata = this.formatMetadata(options.metadata);
      }

      // Set ACL to public-read if needed
      if (options.metadata?.isPublic === 'true') {
        params.ACL = 'public-read';
      }

      const command = new PutObjectCommand(params);
      const url = await getSignedUrl(this.client, command, { expiresIn: expirySeconds });
      
      return {
        url,
        expiresAt: new Date(Date.now() + expirySeconds * 1000),
        contentType: options.contentType
      };
    } catch (error) {
      this.logger.error('Failed to generate signed upload URL for R2', { error, key });
      throw error;
    }
  }

  /**
   * Copy a file within the same storage
   * @param sourceKey Source file key
   * @param destinationKey Destination file key
   */
  public async copyFile(sourceKey: string, destinationKey: string): Promise<UploadResult> {
    try {
      const params: CopyObjectCommandInput = {
        Bucket: this.config.bucketName,
        CopySource: `${this.config.bucketName}/${encodeURIComponent(sourceKey)}`,
        Key: destinationKey
      };

      const result = await this.client.send(new CopyObjectCommand(params));
      
      // Get destination file stats
      const stats = await this.getFileStats(destinationKey);
      
      this.logger.debug('File copied successfully in R2', {
        sourceKey,
        destinationKey,
        etag: result.CopyObjectResult?.ETag
      });

      return {
        key: destinationKey,
        url: this.getPublicUrl(destinationKey) ?? '',
        etag: result.CopyObjectResult?.ETag?.replace(/"/g, ''),
        size: stats.size,
        metadata: stats.metadata ?? {},
        contentType: stats.contentType ?? 'application/octet-stream'
      };
    } catch (error) {
      this.logger.error('Failed to copy file in R2', { error, sourceKey, destinationKey });
      throw error;
    }
  }

  /**
   * List files in a directory/prefix
   * @param prefix Directory prefix
   * @param limit Maximum number of files to list
   * @param continuationToken Token for paginated results
   */
  public async listFiles(
    prefix: string,
    limit: number = 100,
    continuationToken?: string
  ): Promise<{
    files: FileStats[];
    continuationToken?: string;
    isTruncated: boolean;
  }> {
    try {
      const params: ListObjectsV2CommandInput = {
        Bucket: this.config.bucketName,
        Prefix: prefix,
        MaxKeys: limit
      };

      if (continuationToken) {
        params.ContinuationToken = continuationToken;
      }

      const result = await this.client.send(new ListObjectsV2Command(params));
      
      const files: FileStats[] = await Promise.all(
        (result.Contents ?? []).map(async (item: { Key: string; Size: any; LastModified: any; ETag: string; }) => {
          if (!item.Key) {
            console.warn('Missing Key in R2 object. Skipping entry.');
            return {
              key: '',
              size: item.Size ?? 0,
              lastModified: item.LastModified ?? new Date(),
              etag: item.ETag?.replace(/"/g, '')
            };
          }
      
          try {
            return await this.getFileStats(item.Key);
          } catch (error) {
            // Handle known failure gracefully but still log it
            console.warn(`Failed to get detailed stats for key "${item.Key}":`, error);
      
            return {
              key: item.Key,
              size: item.Size ?? 0,
              lastModified: item.LastModified ?? new Date(),
              etag: item.ETag?.replace(/"/g, '')
            };
          }
        })
      );
      

      return {
        files,
        continuationToken: result.NextContinuationToken,
        isTruncated: result.IsTruncated ?? false
      };
    } catch (error) {
      this.logger.error('Failed to list files in R2', { error, prefix });
      throw error;
    }
  }

  /**
   * Create a readable stream for a file
   * @param key Unique identifier/path for the file
   */
  public async createReadStream(key: string): Promise<Readable> {
    try {
      const params: GetObjectCommandInput = {
        Bucket: this.config.bucketName,
        Key: key
      };

      const result = await this.client.send(new GetObjectCommand(params));
      
      if (!result.Body) {
        throw new Error(`Empty response body for key: ${key}`);
      }

      return result.Body as unknown as Readable;
    } catch (error) {
      this.logger.error('Failed to create read stream from R2', { error, key });
      throw error;
    }
  }

  /**
   * Get a public URL for a file (if supported)
   * @param key Unique identifier/path for the file
   */
  public getPublicUrl(key: string): string | null {
    if (!this.config.publicUrlPattern) {
      return null;
    }
    
    return this.config.publicUrlPattern.replace('{key}', encodeURIComponent(key));
  }

  /**
   * Update file metadata
   * @param key Unique identifier/path for the file
   * @param metadata Metadata key-value pairs
   */
  public async updateMetadata(key: string, metadata: Record<string, string>): Promise<void> {
    try {
      // R2 doesn't have a direct "update metadata" operation
      // We need to copy the object to itself with new metadata
      
      // First, get existing object to preserve its properties
      const stats = await this.getFileStats(key);
      
      const params: CopyObjectCommandInput = {
        Bucket: this.config.bucketName,
        CopySource: `${this.config.bucketName}/${encodeURIComponent(key)}`,
        Key: key,
        ContentType: stats.contentType,
        Metadata: this.formatMetadata({
          ...stats.metadata,
          ...metadata
        }),
        MetadataDirective: 'REPLACE'
      };

      await this.client.send(new CopyObjectCommand(params));
      
      this.logger.debug('Metadata updated successfully in R2', { key });
    } catch (error) {
      this.logger.error('Failed to update metadata in R2', { error, key });
      throw error;
    }
  }

  /**
   * Format metadata for S3 API
   * @param metadata Metadata object
   */
  private formatMetadata(metadata?: Record<string, string>): Record<string, string> | undefined {
    if (!metadata) return undefined;
    
    // S3 metadata keys must be lowercase
    const formattedMetadata: Record<string, string> = {};
    
    for (const [key, value] of Object.entries(metadata)) {
      formattedMetadata[key.toLowerCase()] = value;
    }
    
    return formattedMetadata;
  }

  /**
   * Parse metadata from S3 response
   * @param metadata S3 metadata
   */
  private parseMetadata(metadata?: Record<string, string>): Record<string, string> {
    return metadata || {};
  }
}
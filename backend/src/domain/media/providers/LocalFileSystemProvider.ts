import { 
  StorageProvider, 
  StorageOptions, 
  UploadResult, 
  FileStats, 
  SignedUrlInfo 
} from '../StorageProvider';
import { Readable } from 'stream';
import * as fs from 'fs';
import * as fsPromises from 'fs/promises';
import * as path from 'path';
import * as crypto from 'crypto';
import * as mime from 'mime-types';
import { LoggerFacade } from '../../../core/logging/LoggerFacade';

/**
 * Configuration for the LocalFileSystemProvider
 */
interface LocalFileSystemConfig {
  storageRoot: string;
  baseUrl: string;
  signedUrlSecret: string;
  metadataDir?: string;
}

/**
 * Storage provider implementation using local file system
 */
export class LocalFileSystemProvider implements StorageProvider {
  readonly providerType = 'local-filesystem';
  
  private config: LocalFileSystemConfig;
  private logger: LoggerFacade;
  private metadataDir: string;

  constructor(config: LocalFileSystemConfig, logger: LoggerFacade) {
    this.config = config;
    this.logger = logger;
    this.metadataDir = config.metadataDir || path.join(config.storageRoot, '.metadata');
  }
  
  /**
   * Initialize the storage provider
   * This must be called after creating an instance and before using any methods
   */
  public async initialize(): Promise<void> {
    await this.ensureDirectoriesExist();
  }

  /**
   * Ensure necessary directories exist
   */
  private async ensureDirectoriesExist(): Promise<void> {
    try {
      await fsPromises.mkdir(this.config.storageRoot, { recursive: true });
      await fsPromises.mkdir(this.metadataDir, { recursive: true });
      this.logger.debug('Storage directories created', { 
        storageRoot: this.config.storageRoot,
        metadataDir: this.metadataDir
      });
    } catch (error) {
      this.logger.error('Failed to create storage directories', { error });
      throw error;
    }
  }

  /**
   * Get the full file path for a key
   * @param key File key
   */
  private getFilePath(key: string): string {
    // Normalize the key to prevent directory traversal attacks
    const normalizedKey = path.normalize(key).replace(/^(\.\.[\/\\])+/, '');
    return path.join(this.config.storageRoot, normalizedKey);
  }

  /**
   * Get the metadata file path for a key
   * @param key File key
   */
  private getMetadataPath(key: string): string {
    const hash = crypto.createHash('md5').update(key).digest('hex');
    return path.join(this.metadataDir, `${hash}.json`);
  }

  /**
   * Save metadata for a file
   * @param key File key
   * @param metadata Metadata to save
   */
  private async saveMetadata(key: string, metadata: any): Promise<void> {
    try {
      const metadataPath = this.getMetadataPath(key);
      await fsPromises.writeFile(metadataPath, JSON.stringify(metadata, null, 2));
    } catch (error) {
      this.logger.error('Failed to save metadata', { error, key });
      throw error;
    }
  }

  /**
   * Load metadata for a file
   * @param key File key
   */
  private async loadMetadata(key: string): Promise<any> {
    try {
      const metadataPath = this.getMetadataPath(key);
      
      if (!await this.fileExistsInternal(metadataPath)) {
        return {};
      }
      
      const data = await fsPromises.readFile(metadataPath, 'utf8');
      return JSON.parse(data);
    } catch (error) {
      this.logger.error('Failed to load metadata', { error, key });
      return {};
    }
  }

  /**
   * Check if a file exists (internal implementation)
   * @param filePath Full file path
   */
  private async fileExistsInternal(filePath: string): Promise<boolean> {
    try {
      await fsPromises.access(filePath, fs.constants.F_OK);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Ensure the directory for a file exists
   * @param filePath Full file path
   */
  private async ensureDirectoryExists(filePath: string): Promise<void> {
    const dir = path.dirname(filePath);
    await fsPromises.mkdir(dir, { recursive: true });
  }

  /**
   * Generate a signed token for URLs
   * @param key File key
   * @param expiresAt Expiration timestamp
   */
  private generateSignedToken(key: string, expiresAt: number): string {
    const data = `${key}:${expiresAt}`;
    return crypto
      .createHmac('sha256', this.config.signedUrlSecret)
      .update(data)
      .digest('hex');
  }

  /**
   * Verify a signed token
   * @param key File key
   * @param expiresAt Expiration timestamp
   * @param token Token to verify
   */
  private verifySignedToken(key: string, expiresAt: number, token: string): boolean {
    const expectedToken = this.generateSignedToken(key, expiresAt);
    return crypto.timingSafeEqual(
      Buffer.from(token),
      Buffer.from(expectedToken)
    );
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
      const filePath = this.getFilePath(key);
      await this.ensureDirectoryExists(filePath);
      
      if (typeof content === 'string') {
        await fsPromises.writeFile(filePath, content, { encoding: options.encoding || 'utf8' });
      } else if (Buffer.isBuffer(content)) {
        await fsPromises.writeFile(filePath, content);
      } else {
        // Handle ReadableStream
        const writeStream = fs.createWriteStream(filePath);
        await new Promise<void>((resolve, reject) => {
          content.pipe(writeStream);
          content.on('error', reject);
          writeStream.on('finish', resolve);
          writeStream.on('error', reject);
        });
      }
      
      const stats = await fsPromises.stat(filePath);
      
      const contentType = options.contentType || mime.lookup(key) || 'application/octet-stream';
      
      // Save metadata
      const metadata = {
        contentType,
        uploadedAt: new Date().toISOString(),
        size: stats.size,
        isPublic: options.isPublic || false,
        cacheControl: options.cacheControl,
        ...options.metadata
      };
      
      await this.saveMetadata(key, metadata);
      
      this.logger.debug('File uploaded successfully', { key, size: stats.size });
      
      return {
        key,
        url: this.getPublicUrl(key) || '',
        size: stats.size,
        metadata: options.metadata || {},
        contentType
      };
    } catch (error) {
      this.logger.error('Failed to upload file', { error, key });
      throw error;
    }
  }

  /**
   * Download a file from storage
   * @param key Unique identifier/path for the file
   */
  public async downloadFile(key: string): Promise<Buffer> {
    try {
      const filePath = this.getFilePath(key);
      
      if (!await this.fileExistsInternal(filePath)) {
        throw new Error(`File not found: ${key}`);
      }
      
      return await fsPromises.readFile(filePath);
    } catch (error) {
      this.logger.error('Failed to download file', { error, key });
      throw error;
    }
  }

  /**
   * Delete a file from storage
   * @param key Unique identifier/path for the file
   */
  public async deleteFile(key: string): Promise<boolean> {
    try {
      const filePath = this.getFilePath(key);
      const metadataPath = this.getMetadataPath(key);
      
      if (!await this.fileExistsInternal(filePath)) {
        return false;
      }
      
      await fsPromises.unlink(filePath);
      
      // Try to delete metadata if it exists
      try {
        if (await this.fileExistsInternal(metadataPath)) {
          await fsPromises.unlink(metadataPath);
        }
      } catch (metadataError) {
        this.logger.warn('Failed to delete metadata file', { error: metadataError, key });
      }
      
      this.logger.debug('File deleted successfully', { key });
      return true;
    } catch (error) {
      this.logger.error('Failed to delete file', { error, key });
      throw error;
    }
  }

  /**
   * Check if a file exists in storage
   * @param key Unique identifier/path for the file
   */
  public async fileExists(key: string): Promise<boolean> {
    const filePath = this.getFilePath(key);
    return this.fileExistsInternal(filePath);
  }

  /**
   * Get file metadata/stats
   * @param key Unique identifier/path for the file
   */
  public async getFileStats(key: string): Promise<FileStats> {
    try {
      const filePath = this.getFilePath(key);
      
      if (!await this.fileExistsInternal(filePath)) {
        throw new Error(`File not found: ${key}`);
      }
      
      const stats = await fsPromises.stat(filePath);
      const metadata = await this.loadMetadata(key);
      
      return {
        key,
        size: stats.size,
        lastModified: stats.mtime,
        contentType: metadata.contentType,
        metadata: metadata.metadata
      };
    } catch (error) {
      this.logger.error('Failed to get file stats', { error, key });
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
      if (!await this.fileExists(key)) {
        throw new Error(`File not found: ${key}`);
      }
      
      const expiresAt = Math.floor(Date.now() / 1000) + expirySeconds;
      const token = this.generateSignedToken(key, expiresAt);
      
      const metadata = await this.loadMetadata(key);
      const contentType = options.contentType || metadata.contentType;
      
      let url = new URL(path.join('/files', key), this.config.baseUrl);
      url.searchParams.append('expires', expiresAt.toString());
      url.searchParams.append('token', token);
      
      if (options.download) {
        url.searchParams.append('download', '1');
      }
      
      if (options.contentDisposition) {
        url.searchParams.append('content-disposition', options.contentDisposition);
      }
      
      return {
        url: url.toString(),
        expiresAt: new Date(expiresAt * 1000),
        contentType
      };
    } catch (error) {
      this.logger.error('Failed to generate signed URL', { error, key });
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
      const expiresAt = Math.floor(Date.now() / 1000) + expirySeconds;
      const token = this.generateSignedToken(key, expiresAt);
      
      let url = new URL(path.join('/upload', key), this.config.baseUrl);
      url.searchParams.append('expires', expiresAt.toString());
      url.searchParams.append('token', token);
      
      if (options.contentType) {
        url.searchParams.append('content-type', options.contentType);
      }
      
      if (options.maxSize) {
        url.searchParams.append('max-size', options.maxSize.toString());
      }
      
      if (options.metadata) {
        url.searchParams.append('metadata', JSON.stringify(options.metadata));
      }
      
      return {
        url: url.toString(),
        expiresAt: new Date(expiresAt * 1000),
        contentType: options.contentType
      };
    } catch (error) {
      this.logger.error('Failed to generate signed upload URL', { error, key });
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
      const sourceFilePath = this.getFilePath(sourceKey);
      const destinationFilePath = this.getFilePath(destinationKey);
      
      if (!await this.fileExistsInternal(sourceFilePath)) {
        throw new Error(`Source file not found: ${sourceKey}`);
      }
      
      await this.ensureDirectoryExists(destinationFilePath);
      await fsPromises.copyFile(sourceFilePath, destinationFilePath);
      
      const sourceMetadata = await this.loadMetadata(sourceKey);
      await this.saveMetadata(destinationKey, {
        ...sourceMetadata,
        copiedFrom: sourceKey,
        copiedAt: new Date().toISOString()
      });
      
      const stats = await fsPromises.stat(destinationFilePath);
      
      this.logger.debug('File copied successfully', { 
        sourceKey, 
        destinationKey, 
        size: stats.size 
      });
      
      return {
        key: destinationKey,
        url: this.getPublicUrl(destinationKey) || '',
        size: stats.size,
        metadata: sourceMetadata.metadata || {},
        contentType: sourceMetadata.contentType || 'application/octet-stream'
      };
    } catch (error) {
      this.logger.error('Failed to copy file', { error, sourceKey, destinationKey });
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
      const prefixPath = this.getFilePath(prefix);
      const dirPath = path.dirname(prefixPath);
      
      // Check if directory exists
      try {
        await fsPromises.access(dirPath, fs.constants.F_OK);
      } catch {
        return { files: [], isTruncated: false };
      }
      
      // Read all files in the directory recursively
      const allFiles: string[] = [];
      
      const readDirRecursive = async (dir: string, currentPrefix: string = '') => {
        const entries = await fsPromises.readdir(dir, { withFileTypes: true });
        
        for (const entry of entries) {
          const fullPath = path.join(dir, entry.name);
          const relativePath = path.join(currentPrefix, entry.name);
          
          if (entry.isDirectory()) {
            await readDirRecursive(fullPath, relativePath);
          } else if (entry.isFile() && !path.basename(fullPath).startsWith('.')) {
            const relativeKey = path.relative(this.config.storageRoot, fullPath);
            if (relativeKey.startsWith(prefix)) {
              allFiles.push(relativeKey);
            }
          }
        }
      };
      
      await readDirRecursive(dirPath, path.relative(this.config.storageRoot, dirPath));
      
      // Handle pagination
      let startIndex = 0;
      if (continuationToken) {
        const decodedToken = Buffer.from(continuationToken, 'base64').toString('utf8');
        startIndex = parseInt(decodedToken, 10) || 0;
      }
      
      const endIndex = Math.min(startIndex + limit, allFiles.length);
      const files = allFiles.slice(startIndex, endIndex);
      
      // Create next continuation token
      const isTruncated = endIndex < allFiles.length;
      let nextContinuationToken: string | undefined;
      
      if (isTruncated) {
        nextContinuationToken = Buffer.from(endIndex.toString()).toString('base64');
      }
      
      // Get stats for all files
      const fileStats: FileStats[] = await Promise.all(
        files.map(async (fileKey) => {
          try {
            return await this.getFileStats(fileKey);
          } catch (error) {
            this.logger.warn('Failed to get stats for file during listing', { 
              error, 
              fileKey 
            });
            
            // Return minimal information if metadata can't be read
            const filePath = this.getFilePath(fileKey);
            const stats = await fsPromises.stat(filePath);
            
            return {
              key: fileKey,
              size: stats.size,
              lastModified: stats.mtime
            };
          }
        })
      );
      
      return {
        files: fileStats,
        continuationToken: nextContinuationToken,
        isTruncated
      };
    } catch (error) {
      this.logger.error('Failed to list files', { error, prefix });
      throw error;
    }
  }

  /**
   * Create a readable stream for a file
   * @param key Unique identifier/path for the file
   */
  public async createReadStream(key: string): Promise<Readable> {
    try {
      const filePath = this.getFilePath(key);
      
      if (!await this.fileExistsInternal(filePath)) {
        throw new Error(`File not found: ${key}`);
      }
      
      return fs.createReadStream(filePath);
    } catch (error) {
      this.logger.error('Failed to create read stream', { error, key });
      throw error;
    }
  }

  /**
   * Get a public URL for a file (if supported)
   * @param key Unique identifier/path for the file
   */
  public getPublicUrl(key: string): string | null {
    return `${this.config.baseUrl}/public/${key}`;
  }

  /**
   * Update file metadata
   * @param key Unique identifier/path for the file
   * @param metadata Metadata key-value pairs
   */
  public async updateMetadata(key: string, metadata: Record<string, string>): Promise<void> {
    try {
      if (!await this.fileExists(key)) {
        throw new Error(`File not found: ${key}`);
      }
      
      const existingMetadata = await this.loadMetadata(key);
      const updatedMetadata = {
        ...existingMetadata,
        metadata: {
          ...existingMetadata.metadata,
          ...metadata
        },
        updatedAt: new Date().toISOString()
      };
      
      await this.saveMetadata(key, updatedMetadata);
      
      this.logger.debug('Metadata updated successfully', { key });
    } catch (error) {
      this.logger.error('Failed to update metadata', { error, key });
      throw error;
    }
  }
}
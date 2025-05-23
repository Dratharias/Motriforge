
import { Collection, Db, ClientSession, BulkWriteOptions, CountDocumentsOptions, FindOptions, InsertOneOptions, UpdateOptions, DeleteOptions, MongoClient } from 'mongodb';
import { BaseRepository, RepositoryOptions, PipelineStage } from './BaseRepository';
import { IEntity } from '@/types/shared/base-types';
import { ContextualLogger } from '../logging/ContextualLogger';

/**
 * MongoDB-specific repository implementation
 */
export abstract class MongoRepository<TEntity extends IEntity> extends BaseRepository<TEntity> {
  protected readonly database: Db;
  private readonly mongoClient: MongoClient
  protected readonly collection: Collection;

  constructor(
    mongoClient: MongoClient,
    database: Db,
    collectionName: string,
    logger: ContextualLogger
  ) {
    super(collectionName, logger);
    this.mongoClient = mongoClient;
    this.database = database;
    this.collection = database.collection(collectionName);
  }

  /**
   * Gets the MongoDB collection
   */
  protected getCollection(): Collection {
    return this.collection;
  }

  /**
   * Finds a single document
   */
  protected async findOneDocument(filter: any, options?: RepositoryOptions): Promise<any> {
    const findOptions: FindOptions = {};
    
    if (options?.session) {
      findOptions.session = options.session;
    }

    return await this.collection.findOne(filter, findOptions);
  }

  /**
   * Finds multiple documents
   */
  protected async findManyDocuments(
    filter: any, 
    options?: RepositoryOptions, 
    sort?: any, 
    skip?: number, 
    limit?: number
  ): Promise<any[]> {
    const findOptions: FindOptions = {};
    
    if (options?.session) {
      findOptions.session = options.session;
    }
    
    if (sort) {
      findOptions.sort = sort;
    }
    
    if (skip !== undefined) {
      findOptions.skip = skip;
    }
    
    if (limit !== undefined) {
      findOptions.limit = limit;
    }

    return await this.collection.find(filter, findOptions).toArray();
  }

  /**
   * Inserts a document
   */
  protected async insertDocument(document: any, options?: RepositoryOptions): Promise<void> {
    const insertOptions: InsertOneOptions = {};
    
    if (options?.session) {
      insertOptions.session = options.session;
    }

    // Add timestamps
    const now = new Date();
    document.createdAt = now;
    document.updatedAt = now;
    document.isDeleted = false;

    await this.collection.insertOne(document, insertOptions);
  }

  /**
   * Updates a document
   */
  protected async updateDocument(filter: any, update: any, options?: RepositoryOptions): Promise<void> {
    const updateOptions: UpdateOptions = {};
    
    if (options?.session) {
      updateOptions.session = options.session;
    }

    // Add updated timestamp
    update.$set ??= {};
    update.$set.updatedAt = new Date();

    const result = await this.collection.updateOne(filter, { $set: update }, updateOptions);
    
    if (result.matchedCount === 0) {
      throw new Error('Document not found for update');
    }
  }

  /**
   * Updates multiple documents
   */
  protected async updateManyDocuments(filter: any, update: any, options?: RepositoryOptions): Promise<number> {
    const updateOptions: UpdateOptions = {};
    
    if (options?.session) {
      updateOptions.session = options.session;
    }

    // Add updated timestamp
    update.$set ??= {};
    update.$set.updatedAt = new Date();

    const result = await this.collection.updateMany(filter, { $set: update }, updateOptions);
    return result.modifiedCount;
  }

  /**
   * Deletes a document
   */
  protected async deleteDocument(filter: any, options?: RepositoryOptions): Promise<void> {
    const deleteOptions: DeleteOptions = {};
    
    if (options?.session) {
      deleteOptions.session = options.session;
    }

    const result = await this.collection.deleteOne(filter, deleteOptions);
    
    if (result.deletedCount === 0) {
      throw new Error('Document not found for deletion');
    }
  }

  /**
   * Counts documents
   */
  protected async countDocuments(filter: any, options?: RepositoryOptions): Promise<number> {
    const countOptions: CountDocumentsOptions = {};
    
    if (options?.session) {
      countOptions.session = options.session;
    }

    return await this.collection.countDocuments(filter, countOptions);
  }

  /**
   * Executes aggregation pipeline
   */
  protected async aggregateDocuments(pipeline: PipelineStage[], options?: RepositoryOptions): Promise<any[]> {
    const aggregateOptions: any = {};
    
    if (options?.session) {
      aggregateOptions.session = options.session;
    }

    return await this.collection.aggregate(pipeline, aggregateOptions).toArray();
  }

  /**
   * Bulk insert documents
   */
  protected async bulkInsertDocuments(documents: any[], options?: RepositoryOptions): Promise<void> {
    if (documents.length === 0) {
      return;
    }

    const bulkOptions: BulkWriteOptions = {
      ordered: false // Allow parallel inserts
    };
    
    if (options?.session) {
      bulkOptions.session = options.session;
    }

    // Add timestamps to all documents
    const now = new Date();
    const documentsWithTimestamps = documents.map(doc => ({
      ...doc,
      createdAt: now,
      updatedAt: now,
      isDeleted: false
    }));

    await this.collection.insertMany(documentsWithTimestamps, bulkOptions);
  }

  /**
   * Bulk write operations (insert, update, delete)
   */
  async bulkWrite(operations: any[], options?: RepositoryOptions): Promise<any> {
    const bulkOptions: BulkWriteOptions = {
      ordered: false
    };
    
    if (options?.session) {
      bulkOptions.session = options.session;
    }

    return await this.collection.bulkWrite(operations, bulkOptions);
  }

  /**
   * Creates indexes for the collection
   */
  async createIndexes(indexes: { [key: string]: 1 | -1 | 'text' }[]): Promise<void> {
    try {
      this.logger.info('Creating indexes for collection', { 
        collection: this.collectionName,
        indexCount: indexes.length 
      });

      for (const index of indexes) {
        await this.collection.createIndex(index, { background: true });
      }

      this.logger.info('Indexes created successfully', { collection: this.collectionName });
    } catch (error) {
      this.logger.error('Failed to create indexes', error as Error, { 
        collection: this.collectionName 
      });
      throw error;
    }
  }

  /**
   * Drops an index
   */
  async dropIndex(indexName: string): Promise<void> {
    try {
      await this.collection.dropIndex(indexName);
      this.logger.info('Index dropped successfully', { 
        collection: this.collectionName,
        indexName 
      });
    } catch (error) {
      this.logger.error('Failed to drop index', error as Error, { 
        collection: this.collectionName,
        indexName 
      });
      throw error;
    }
  }

  /**
   * Gets collection statistics
   */
  async getCollectionStats(): Promise<any> {
    try {
      return await this.database.stats();
    } catch (error) {
      this.logger.error('Failed to get collection stats', error as Error, { 
        collection: this.collectionName 
      });
      throw error;
    }
  }

  /**
   * Validates documents in the collection
   */
  async validateCollection(): Promise<{ valid: boolean; errors: string[] }> {
    try {
      this.logger.info('Validating collection', { collection: this.collectionName });

      const result = await this.database.admin().validateCollection(this.collectionName);
      
      return {
        valid: result.valid,
        errors: result.errors ?? []
      };
    } catch (error) {
      this.logger.error('Collection validation failed', error as Error, { 
        collection: this.collectionName 
      });
      
      return {
        valid: false,
        errors: [(error as Error).message]
      };
    }
  }

  /**
   * Gets distinct values for a field
   */
  async distinct<T = any>(field: string, filter?: any, options?: RepositoryOptions): Promise<T[]> {
    try {
      const distinctOptions: any = {};
      
      if (options?.session) {
        distinctOptions.session = options.session;
      }

      const finalFilter = this.buildMongoFilter(filter, options);
      return await this.collection.distinct(field, finalFilter, distinctOptions);
    } catch (error) {
      this.logger.error('Failed to get distinct values', error as Error, { 
        collection: this.collectionName,
        field 
      });
      throw error;
    }
  }

  /**
   * Performs text search
   */
  async textSearch(searchText: string, options?: RepositoryOptions): Promise<any[]> {
    try {
      const filter = {
        $text: { $search: searchText }
      };

      const finalFilter = this.buildMongoFilter(filter, options);
      return await this.findManyDocuments(finalFilter, options, { score: { $meta: 'textScore' } });
    } catch (error) {
      this.logger.error('Text search failed', error as Error, { 
        collection: this.collectionName,
        searchText 
      });
      throw error;
    }
  }

  /**
   * Finds documents within a geographic area
   */
  async findNear(coordinates: [number, number], maxDistance: number, options?: RepositoryOptions): Promise<any[]> {
    try {
      const filter = {
        location: {
          $near: {
            $geometry: {
              type: 'Point',
              coordinates
            },
            $maxDistance: maxDistance
          }
        }
      };

      const finalFilter = this.buildMongoFilter(filter, options);
      return await this.findManyDocuments(finalFilter, options);
    } catch (error) {
      this.logger.error('Geospatial query failed', error as Error, { 
        collection: this.collectionName,
        coordinates,
        maxDistance 
      });
      throw error;
    }
  }

  /**
   * Executes a map-reduce operation
   */
  async mapReduce(map: string, reduce: string, options: any = {}): Promise<any[]> {
    this.logger.startOperation('mapReduce', { collection: this.collectionName });
    const cmd = {
      mapReduce: this.collectionName,
      map,
      reduce,
      out: { inline: 1 },
      ...options
    };
    const result = await this.database.command(cmd);
    this.logger.completeOperation('mapReduce', 0);
    // result.results holds the inline output
    return (result as any).results;
  }

  /**
   * Creates a compound index for better query performance
   */
  async createCompoundIndex(fields: { [key: string]: 1 | -1 }, options?: any): Promise<void> {
    try {
      const indexOptions = {
        background: true,
        ...options
      };

      await this.collection.createIndex(fields, indexOptions);
      
      this.logger.info('Compound index created', { 
        collection: this.collectionName,
        fields,
        options: indexOptions 
      });
    } catch (error) {
      this.logger.error('Failed to create compound index', error as Error, { 
        collection: this.collectionName,
        fields 
      });
      throw error;
    }
  }

  /**
   * Executes a transaction with automatic retry logic.
   */
  async withTransaction<T>(
    operation: (session: ClientSession) => Promise<T>,
    maxRetries: number = 3
  ): Promise<T> {
    let attempt = 0;

    while (attempt < maxRetries) {
      const session = this.mongoClient.startSession();

      try {
        return await session.withTransaction(operation);
      } catch (error) {
        attempt++;
        this.logger.warn('Transaction attempt failed', {
          attempt,
          maxRetries,
          error: (error as Error).message,
        });

        if (attempt >= maxRetries) {
          throw error;
        }

        // Exponential backoff before retrying
        await new Promise((resolve) =>
          setTimeout(resolve, Math.pow(2, attempt) * 100)
        );
      } finally {
        await session.endSession();
      }
    }

    throw new Error('Transaction failed after maximum retries');
  }
}
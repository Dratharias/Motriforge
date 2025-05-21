import { 
  Collection as MongoCollection, 
  Document, 
  Filter, 
  FindOptions, 
  UpdateFilter, 
  UpdateOptions, 
  InsertOneOptions,
  DeleteOptions,
  InsertManyResult,
  ObjectId,
  IndexSpecification,
  CreateIndexesOptions,
  CountDocumentsOptions,
  AggregateOptions,
  BulkWriteOptions,
  BulkWriteResult,
  WithId,
  OptionalUnlessRequiredId
} from 'mongodb';
import { QueryBuilder } from './QueryBuilder';
import { LoggerFacade } from '../../core/logging/LoggerFacade';

/**
 * Typed wrapper around MongoDB collection with enhanced functionality
 */
export class Collection<T extends Document> {
  private readonly collection: MongoCollection<T>;
  private readonly logger: LoggerFacade;

  constructor(collection: MongoCollection<T>, logger: LoggerFacade) {
    this.collection = collection;
    this.logger = logger;
  }

  /**
   * Create a query builder for complex queries
   */
  public createQueryBuilder(): QueryBuilder<T> {
    return new QueryBuilder<T>(this);
  }

  /**
   * Find document by ID
   * @param id Document ID
   */
  public async findById(id: string | ObjectId): Promise<WithId<T> | null> {
    try {
      const objectId = typeof id === 'string' ? new ObjectId(id) : id;
      return await this.collection.findOne({ _id: objectId } as Filter<T>);
    } catch (error) {
      this.logger.error('Failed to find document by ID', { 
        error, 
        collectionName: this.collection.collectionName, 
        id 
      });
      throw error;
    }
  }

  /**
   * Find a single document matching the filter
   * @param filter Query filter
   * @param options Find options
   */
  public async findOne(filter: Filter<T>, options?: FindOptions): Promise<T | null> {
    try {
      return await this.collection.findOne(filter, options);
    } catch (error) {
      this.logger.error('Failed to find document', { 
        error, 
        collectionName: this.collection.collectionName, 
        filter 
      });
      throw error;
    }
  }

  /**
   * Find all documents matching the filter
   * @param filter Query filter
   * @param options Find options
   */
  public async find(filter: Filter<T> = {}, options?: FindOptions): Promise<WithId<T>[]> {
    try {
      return await this.collection.find(filter, options).toArray();
    } catch (error) {
      this.logger.error('Failed to find documents', { 
        error, 
        collectionName: this.collection.collectionName, 
        filter 
      });
      throw error;
    }
  }

  /**
   * Insert a single document
   * @param document Document to insert
   * @param options Insert options
   */
  public async insertOne(document: OptionalUnlessRequiredId<T>, options?: InsertOneOptions): Promise<T> {
    try {
      const result = await this.collection.insertOne(document, options);
      // Return the document with its new _id
      return { ...document, _id: result.insertedId } as T;
    } catch (error) {
      this.logger.error('Failed to insert document', { 
        error, 
        collectionName: this.collection.collectionName 
      });
      throw error;
    }
  }

  /**
   * Insert multiple documents
   * @param documents Documents to insert
   * @param options Insert options
   */
  public async insertMany(documents: Array<OptionalUnlessRequiredId<T>>, options?: BulkWriteOptions): Promise<InsertManyResult<T>> {
    try {
      return await this.collection.insertMany(documents, options);
    } catch (error) {
      this.logger.error('Failed to insert multiple documents', { 
        error, 
        collectionName: this.collection.collectionName, 
        count: documents.length 
      });
      throw error;
    }
  }

  /**
   * Update a single document
   * @param filter Query filter
   * @param update Update operations
   * @param options Update options
   */
  public async updateOne(filter: Filter<T>, update: UpdateFilter<T>, options?: UpdateOptions): Promise<boolean> {
    try {
      const result = await this.collection.updateOne(filter, update, options);
      return result.modifiedCount > 0;
    } catch (error) {
      this.logger.error('Failed to update document', { 
        error, 
        collectionName: this.collection.collectionName, 
        filter 
      });
      throw error;
    }
  }

  /**
   * Update multiple documents
   * @param filter Query filter
   * @param update Update operations
   * @param options Update options
   */
  public async updateMany(filter: Filter<T>, update: UpdateFilter<T>, options?: UpdateOptions): Promise<number> {
    try {
      const result = await this.collection.updateMany(filter, update, options);
      return result.modifiedCount;
    } catch (error) {
      this.logger.error('Failed to update multiple documents', { 
        error, 
        collectionName: this.collection.collectionName, 
        filter 
      });
      throw error;
    }
  }

  /**
   * Delete a single document
   * @param filter Query filter
   * @param options Delete options
   */
  public async deleteOne(filter: Filter<T>, options?: DeleteOptions): Promise<boolean> {
    try {
      const result = await this.collection.deleteOne(filter, options);
      return result.deletedCount === 1;
    } catch (error) {
      this.logger.error('Failed to delete document', { 
        error, 
        collectionName: this.collection.collectionName, 
        filter 
      });
      throw error;
    }
  }

  /**
   * Delete multiple documents
   * @param filter Query filter
   * @param options Delete options
   */
  public async deleteMany(filter: Filter<T>, options?: DeleteOptions): Promise<number> {
    try {
      const result = await this.collection.deleteMany(filter, options);
      return result.deletedCount || 0;
    } catch (error) {
      this.logger.error('Failed to delete multiple documents', { 
        error, 
        collectionName: this.collection.collectionName, 
        filter 
      });
      throw error;
    }
  }

  /**
   * Count documents matching the filter
   * @param filter Query filter
   * @param options Count options
   */
  public async countDocuments(filter: Filter<T> = {}, options?: CountDocumentsOptions): Promise<number> {
    try {
      return await this.collection.countDocuments(filter, options);
    } catch (error) {
      this.logger.error('Failed to count documents', { 
        error, 
        collectionName: this.collection.collectionName, 
        filter 
      });
      throw error;
    }
  }

  /**
   * Create an index on the collection
   * @param indexSpec Index specification
   * @param options Create index options
   */
  public async createIndex(indexSpec: IndexSpecification, options?: CreateIndexesOptions): Promise<string> {
    try {
      return await this.collection.createIndex(indexSpec, options);
    } catch (error) {
      this.logger.error('Failed to create index', { 
        error, 
        collectionName: this.collection.collectionName, 
        indexSpec 
      });
      throw error;
    }
  }

  /**
   * Execute an aggregation pipeline
   * @param pipeline Aggregation pipeline
   * @param options Aggregate options
   */
  public async aggregate<U extends Document = T>(pipeline: object[], options?: AggregateOptions): Promise<U[]> {
    try {
      return await this.collection.aggregate<U>(pipeline, options).toArray();
    } catch (error) {
      this.logger.error('Failed to execute aggregate pipeline', { 
        error, 
        collectionName: this.collection.collectionName, 
        pipeline 
      });
      throw error;
    }
  }

  /**
   * Execute bulk write operations
   * @param operations Bulk write operations
   * @param options Bulk write options
   */
  public async bulkWrite(operations: any[], options?: BulkWriteOptions): Promise<BulkWriteResult> {
    try {
      return await this.collection.bulkWrite(operations, options);
    } catch (error) {
      this.logger.error('Failed to execute bulk write operations', { 
        error, 
        collectionName: this.collection.collectionName, 
        operationsCount: operations.length 
      });
      throw error;
    }
  }

  /**
   * Get the raw MongoDB collection
   */
  public getRawCollection(): MongoCollection<T> {
    return this.collection;
  }

  /**
   * Get the collection name
   */
  public getName(): string {
    return this.collection.collectionName;
  }
}
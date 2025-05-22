import { Collection as MongoCollection, Filter, FindOptions, UpdateFilter, UpdateOptions, Document, WithId, OptionalUnlessRequiredId } from 'mongodb';
import { LoggerFacade } from '../../core/logging/LoggerFacade';

/**
 * Wrapper around MongoDB collection providing logging and error handling
 */
export class Collection<T extends Document> {
  /**
   * Create a new Collection wrapper
   * 
   * @param collection MongoDB collection
   * @param logger Logger facade
   */
  constructor(
    private readonly collection: MongoCollection<T>,
    private readonly logger: LoggerFacade
  ) {}

  /**
   * Find documents matching a filter
   * 
   * @param filter Query filter
   * @param options Find options
   * @returns Array of matching documents
   */
  public async find(filter: Filter<T> = {}, options?: FindOptions): Promise<WithId<T>[]> {
    try {
      const cursor = this.collection.find(filter, options);
      return await cursor.toArray();
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      this.logger.error('Error in collection.find', error, {
        collection: this.collection.collectionName,
        filter,
        options
      });
      throw error;
    }
  }

  /**
   * Find a single document matching a filter
   * 
   * @param filter Query filter
   * @param options Find options
   * @returns Matching document or null if not found
   */
  public async findOne(filter: Filter<T>, options?: FindOptions): Promise<WithId<T> | null> {
    try {
      return await this.collection.findOne(filter, options);
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      this.logger.error('Error in collection.findOne', error, {
        collection: this.collection.collectionName,
        filter,
        options
      });
      throw error;
    }
  }

  /**
   * Insert a single document
   * 
   * @param document Document to insert
   * @returns Result of insert operation
   */
  public async insertOne(document: OptionalUnlessRequiredId<T>): Promise<any> {
    try {
      return await this.collection.insertOne(document);
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      this.logger.error('Error in collection.insertOne', error, {
        collection: this.collection.collectionName,
        document
      });
      throw error;
    }
  }

  /**
   * Insert multiple documents
   * 
   * @param documents Documents to insert
   * @returns Result of insert operation
   */
  public async insertMany(documents: OptionalUnlessRequiredId<T>[]): Promise<any> {
    try {
      return await this.collection.insertMany(documents);
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      this.logger.error('Error in collection.insertMany', error, {
        collection: this.collection.collectionName,
        documentCount: documents.length
      });
      throw error;
    }
  }

  /**
   * Update a single document
   * 
   * @param filter Filter to match document
   * @param update Update operations
   * @param options Update options
   * @returns Result of update operation
   */
  public async updateOne(filter: Filter<T>, update: UpdateFilter<T>, options?: UpdateOptions): Promise<any> {
    try {
      return await this.collection.updateOne(filter, update, options);
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      this.logger.error('Error in collection.updateOne', error, {
        collection: this.collection.collectionName,
        filter,
        update,
        options
      });
      throw error;
    }
  }

  /**
   * Update multiple documents
   * 
   * @param filter Filter to match documents
   * @param update Update operations
   * @param options Update options
   * @returns Result of update operation
   */
  public async updateMany(filter: Filter<T>, update: UpdateFilter<T>, options?: UpdateOptions): Promise<any> {
    try {
      return await this.collection.updateMany(filter, update, options);
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      this.logger.error('Error in collection.updateMany', error, {
        collection: this.collection.collectionName,
        filter,
        update,
        options
      });
      throw error;
    }
  }

  /**
   * Delete a single document
   * 
   * @param filter Filter to match document
   * @returns Result of delete operation
   */
  public async deleteOne(filter: Filter<T>): Promise<any> {
    try {
      return await this.collection.deleteOne(filter);
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      this.logger.error('Error in collection.deleteOne', error, {
        collection: this.collection.collectionName,
        filter
      });
      throw error;
    }
  }

  /**
   * Delete multiple documents
   * 
   * @param filter Filter to match documents
   * @returns Result of delete operation
   */
  public async deleteMany(filter: Filter<T>): Promise<any> {
    try {
      return await this.collection.deleteMany(filter);
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      this.logger.error('Error in collection.deleteMany', error, {
        collection: this.collection.collectionName,
        filter
      });
      throw error;
    }
  }

  /**
   * Find a document and update it in one operation
   * 
   * @param filter Filter to match document
   * @param update Update operations
   * @param options Options for findOneAndUpdate
   * @returns Result of findOneAndUpdate operation
   */
  public async findOneAndUpdate(filter: Filter<T>, update: UpdateFilter<T>, options?: any): Promise<any> {
    try {
      return await this.collection.findOneAndUpdate(filter, update, options);
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      this.logger.error('Error in collection.findOneAndUpdate', error, {
        collection: this.collection.collectionName,
        filter,
        update,
        options
      });
      throw error;
    }
  }

  /**
   * Count documents matching a filter
   * 
   * @param filter Filter to match documents
   * @returns Count of matching documents
   */
  public async countDocuments(filter: Filter<T> = {}): Promise<number> {
    try {
      return await this.collection.countDocuments(filter);
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      this.logger.error('Error in collection.countDocuments', error, {
        collection: this.collection.collectionName,
        filter
      });
      throw error;
    }
  }

  /**
   * Get the raw MongoDB collection
   * 
   * @returns MongoDB collection
   */
  public getRawCollection(): MongoCollection<T> {
    return this.collection;
  }

  /**
   * Get the collection name
   * 
   * @returns Collection name
   */
  public get name(): string {
    return this.collection.collectionName;
  }
}
import { Collection } from '../database/Collection';
import { Database } from '../database/Database';
import { QueryBuilder } from '../database/QueryBuilder';
import { Transaction } from '../database/Transaction';
import { TransactionManager } from '../database/TransactionManager';
import { EventMediator } from '../../core/events/EventMediator';
import { LoggerFacade } from '../../core/logging/LoggerFacade';
import { 
  Filter,
  FindOptions,
  UpdateFilter,
  ObjectId,
  Document,
  WithId,
  OptionalUnlessRequiredId
} from 'mongodb';
import { EntityNotFoundError, DatabaseError } from '../../core/error/exceptions/DatabaseError';
import { EventType } from '../../core/events/types/EventType';

/**
 * Repository interface defining common operations for data access
 */
export interface Repository<T extends Document> {
  findById(id: string | ObjectId): Promise<T>;
  findOne(query: Filter<T>): Promise<T | null>;
  find(query: Filter<T>, options?: FindOptions): Promise<T[]>;
  count(query: Filter<T>): Promise<number>;
  create(data: OptionalUnlessRequiredId<T>): Promise<T>;
  update(id: string | ObjectId, data: Partial<T>): Promise<T>;
  delete(id: string | ObjectId): Promise<boolean>;
  exists(query: Filter<T>): Promise<boolean>;
}

/**
 * Base repository implementation providing common data access operations
 */
export abstract class BaseRepository<T extends Document> implements Repository<T> {
  protected readonly db: Database;
  protected readonly collection: Collection<T>;
  protected readonly logger: LoggerFacade;
  protected readonly eventMediator?: EventMediator;
  protected readonly transactionManager: TransactionManager;
  
  /**
   * Create a new repository instance
   * 
   * @param collectionName - Name of the MongoDB collection
   * @param db - Database instance
   * @param logger - Logger instance
   * @param eventMediator - Optional event mediator for publishing domain events
   */
  constructor(
    protected readonly collectionName: string,
    db: Database,
    logger: LoggerFacade,
    eventMediator?: EventMediator
  ) {
    this.db = db;
    this.collection = db.getCollection<T>(collectionName);
    this.logger = logger.withComponent(`${collectionName}Repository`);
    this.eventMediator = eventMediator;
    this.transactionManager = db.getTransactionManager();
  }

  /**
   * Find a document by its ID
   * 
   * @param id - Document ID
   * @returns Matching document or throws if not found
   */
  public async findById(id: string | ObjectId): Promise<T> {
    try {
      const objectId = typeof id === 'string' ? new ObjectId(id) : id;
      const document = await this.collection.findOne({ _id: objectId } as Filter<T>);
      
      if (!document) {
        throw new EntityNotFoundError(
          this.collectionName,
          objectId.toString()
        );
      }
      
      return this.mapFromEntity(document);
    } catch (err) {
      if (err instanceof EntityNotFoundError) {
        throw err;
      }
      
      this.logger.error(`Error finding document by ID: ${id}`, err as Error);
      throw new DatabaseError(
        `Error finding ${this.collectionName} by ID`,
        'findById',
        'DATABASE_ERROR',
        err as Error,
        this.collectionName
      );
    }
  }

  /**
   * Find a single document matching a query
   * 
   * @param query - Query filter
   * @returns Matching document or null if none found
   */
  public async findOne(query: Filter<T>): Promise<T | null> {
    try {
      const document = await this.collection.findOne(query);
      
      if (!document) {
        return null;
      }
      
      return this.mapFromEntity(document);
    } catch (err) {
      this.logger.error(`Error finding document with query: ${JSON.stringify(query)}`, err as Error);
      throw new DatabaseError(
        `Error finding ${this.collectionName}`,
        'findOne',
        'DATABASE_ERROR',
        err as Error,
        this.collectionName,
        query
      );
    }
  }

  /**
   * Find all documents matching a query
   * 
   * @param query - Query filter
   * @param options - Find options (sorting, projection, etc.)
   * @returns Array of matching documents
   */
  public async find(query: Filter<T> = {}, options?: FindOptions): Promise<T[]> {
    try {
      const documents = await this.collection.find(query, options);
      return documents.map(doc => this.mapFromEntity(doc));
    } catch (err) {
      this.logger.error(`Error finding documents with query: ${JSON.stringify(query)}`, err as Error);
      throw new DatabaseError(
        `Error finding ${this.collectionName} documents`,
        'find',
        'DATABASE_ERROR',
        err as Error,
        this.collectionName,
        query
      );
    }
  }

  /**
   * Count documents matching a query
   * 
   * @param query - Query filter
   * @returns Number of matching documents
   */
  public async count(query: Filter<T> = {}): Promise<number> {
    try {
      return await this.collection.countDocuments(query);
    } catch (err) {
      this.logger.error(`Error counting documents with query: ${JSON.stringify(query)}`, err as Error);
      throw new DatabaseError(
        `Error counting ${this.collectionName} documents`,
        'count',
        'DATABASE_ERROR',
        err as Error,
        this.collectionName,
        query
      );
    }
  }

  /**
   * Create a new document
   * 
   * @param data - Document data
   * @returns Created document
   */
  public async create(data: OptionalUnlessRequiredId<T>): Promise<T> {
    try {
      // Validate data before insertion
      this.validateData(data);
      
      // Map the input data to entity format
      const entityData = this.mapToEntity(data);
      
      // Insert the document
      const result = await this.collection.insertOne(entityData);
      
      // Get the inserted document
      const createdDocument = { 
        ...entityData,
        _id: result.insertedId
      } as WithId<T>;
      
      // Map to domain model
      const mappedEntity = this.mapFromEntity(createdDocument);
      
      // Publish domain event
      this.publishEvent('created', mappedEntity);
      
      return mappedEntity;
    } catch (err) {
      this.logger.error(`Error creating document: ${JSON.stringify(data)}`, err as Error);
      throw new DatabaseError(
        `Error creating ${this.collectionName} document`,
        'create',
        'DATABASE_ERROR',
        err as Error,
        this.collectionName
      );
    }
  }

  /**
   * Update an existing document
   * 
   * @param id - Document ID
   * @param data - Updated document data
   * @returns Updated document
   */
  public async update(id: string | ObjectId, data: Partial<T>): Promise<T> {
    try {
      const objectId = typeof id === 'string' ? new ObjectId(id) : id;
      
      // Validate update data
      this.validateData(data, true);
      
      // Map the input data to entity format
      const entityData = this.mapToEntity(data as OptionalUnlessRequiredId<T>);
      
      // Only update fields that are actually provided
      const updateData: UpdateFilter<T> = {
        $set: entityData as any
      };
      
      // Add updated timestamp if the entity has one
      if ('updatedAt' in entityData) {
        (updateData.$set as any).updatedAt = new Date();
      }
      
      // Perform the update
      const result = await this.collection.updateOne(
        { _id: objectId } as Filter<T>,
        updateData
      );
      
      if (result.matchedCount === 0) {
        throw new EntityNotFoundError(
          this.collectionName,
          objectId.toString()
        );
      }
      
      // Get the updated document
      const updatedDocument = await this.findById(objectId);
      
      // Publish domain event
      this.publishEvent('updated', updatedDocument);
      
      return updatedDocument;
    } catch (err) {
      if (err instanceof EntityNotFoundError) {
        throw err;
      }
      
      this.logger.error(`Error updating document with ID: ${id}`, err as Error);
      throw new DatabaseError(
        `Error updating ${this.collectionName} document`,
        'update',
        'DATABASE_ERROR',
        err as Error,
        this.collectionName
      );
    }
  }

  /**
   * Delete a document
   * 
   * @param id - Document ID
   * @returns True if document was deleted, false otherwise
   */
  public async delete(id: string | ObjectId): Promise<boolean> {
    try {
      const objectId = typeof id === 'string' ? new ObjectId(id) : id;
      
      // Get the document before deleting it (for event publishing)
      const document = await this.findOne({ _id: objectId } as Filter<T>);
      
      if (!document) {
        throw new EntityNotFoundError(
          this.collectionName,
          objectId.toString()
        );
      }
      
      // Perform the deletion
      const result = await this.collection.deleteOne({ _id: objectId } as Filter<T>);
      
      if (result.deletedCount === 0) {
        return false;
      }
      
      // Publish domain event
      this.publishEvent('deleted', document);
      
      return true;
    } catch (err) {
      if (err instanceof EntityNotFoundError) {
        throw err;
      }
      
      this.logger.error(`Error deleting document with ID: ${id}`, err as Error);
      throw new DatabaseError(
        `Error deleting ${this.collectionName} document`,
        'delete',
        'DATABASE_ERROR',
        err as Error,
        this.collectionName
      );
    }
  }

  /**
   * Check if a document exists
   * 
   * @param query - Query filter
   * @returns True if a matching document exists, false otherwise
   */
  public async exists(query: Filter<T>): Promise<boolean> {
    try {
      const count = await this.count(query);
      return count > 0;
    } catch (err) {
      this.logger.error(`Error checking existence with query: ${JSON.stringify(query)}`, err as Error);
      throw new DatabaseError(
        `Error checking existence of ${this.collectionName} document`,
        'exists',
        'DATABASE_ERROR',
        err as Error,
        this.collectionName,
        query
      );
    }
  }

  /**
   * Create a query builder for this repository
   * 
   * @returns Query builder instance
   */
  public createQueryBuilder(): QueryBuilder<T> {
    return new QueryBuilder<T>(this.collection);
  }

  /**
   * Execute a function within a transaction
   * 
   * @param fn - Function to execute within transaction
   * @returns Result of the function
   */
  public async withTransaction<R>(
    fn: (transaction: Transaction) => Promise<R>
  ): Promise<R> {
    return this.transactionManager.withTransaction(fn);
  }

  /**
   * Validate document data before insertion/update
   * 
   * @param data - Document data to validate
   * @param isUpdate - Whether this is an update operation
   */
  protected validateData(data: any, isUpdate: boolean = false): void {
    // Base implementation performs no validation
    // Subclasses should override this method to implement validation
  }

  /**
   * Map entity from database format to domain model
   * 
   * @param entity - Entity from database
   * @returns Mapped domain model
   */
  protected mapFromEntity(entity: WithId<T>): T {
    // Default implementation returns entity as is
    // Subclasses should override this method if mapping is needed
    return entity as unknown as T;
  }

  /**
   * Map domain model to database entity format
   * 
   * @param model - Domain model
   * @returns Entity for database
   */
  protected mapToEntity(model: OptionalUnlessRequiredId<T>): OptionalUnlessRequiredId<T> {
    // Default implementation returns model as is
    // Subclasses should override this method if mapping is needed
    return model;
  }

  /**
   * Publish a domain event
   * 
   * @param action - Event action ('created', 'updated', 'deleted', etc.)
   * @param entity - Entity involved in the event
   */
  protected publishEvent(action: string, entity: T): void {
    if (!this.eventMediator) {
      return;
    }
    
    const entityType = this.collectionName.toLowerCase();
    const eventType = `${entityType}.${action}` as EventType;
    
    // Create a minimal event object and cast to satisfy the interface
    // The EventMediator should handle filling in defaults for missing properties
    const event = {
      type: eventType,
      payload: entity,
      timestamp: new Date(),
      id: (entity as any)._id?.toString() ?? crypto.randomUUID(),
      metadata: {
        priority: 'normal' as any,
        origin: 'repository',
        version: '1.0',
        retry: 0,
        maxRetries: 3
      },
      source: this.collectionName,
      version: '1.0',
      isAcknowledged: false,
      _isAcknowledged: false,
      context: undefined,
      correlationId: (entity as any)._id?.toString()
    } as any;
    
    this.eventMediator.publish(event);
    
    this.logger.debug(`Published event: ${eventType}`, {
      entityId: (entity as any)._id?.toString()
    });
  }
}
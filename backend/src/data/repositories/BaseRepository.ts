import { Types, Model } from 'mongoose';
import { LoggerFacade } from '@/core/logging';
import { 
  Repository,
  RepositoryContext, 
  ValidationResult, 
  FilterQuery,
  QueryOptions,
  UpdateResult,
  DeleteResult,
  Transaction,
  AggregationPipeline
} from '@/types/repositories/base';

// Import composed operations
import { CrudOperations } from './operations/CrudOperations';
import { CacheOperations } from './operations/CacheOperations';
import { EventOperations } from './operations/EventOperations';
import { ValidationOperations } from './operations/ValidationOperations';
import { TransactionOperations } from './operations/TransactionOperations';
import { CacheFacade } from '@/core/cache/facade/CacheFacade';
import { EventMediator } from '@/core/events/EventMediator';

/**
 * Base repository class that implements common operations using composition
 * Each operation type is handled by a specialized component
 */
export abstract class BaseRepository<T> implements Repository<T> {
  protected readonly model: Model<T>;
  protected readonly logger: LoggerFacade;
  protected readonly eventMediator: EventMediator;
  protected readonly cache?: CacheFacade;
  protected readonly collectionName: string;
  protected readonly componentName: string;

  // Composed operation handlers
  protected readonly crudOps: CrudOperations<T>;
  protected readonly cacheOps: CacheOperations<T>;
  protected readonly eventOps: EventOperations;
  protected readonly validationOps: ValidationOperations<T>;
  protected readonly transactionOps: TransactionOperations;

  constructor(
    model: Model<T>,
    logger: LoggerFacade,
    eventMediator: EventMediator,
    cache: CacheFacade | undefined,
    componentName: string
  ) {
    this.model = model;
    this.logger = logger.withComponent(componentName);
    this.eventMediator = eventMediator;
    this.cache = cache;
    this.collectionName = model.collection.name;
    this.componentName = componentName;

    // Initialize composed operations
    this.crudOps = new CrudOperations(model, this.logger, this.collectionName);
    this.cacheOps = new CacheOperations(cache, this.logger, this.collectionName);
    this.eventOps = new EventOperations(eventMediator, this.logger, componentName);
    this.validationOps = new ValidationOperations(this.logger, componentName);
    this.transactionOps = new TransactionOperations(this.logger, componentName);
  }

  // Repository interface implementation using composed operations

  /**
   * Find document by ID
   */
  public async findById(
    id: string | Types.ObjectId, 
    context?: RepositoryContext
  ): Promise<T | null> {
    // Check cache first
    if (this.cacheOps.isEnabled) {
      const cached = await this.cacheOps.getCachedById(id);
      if (cached) {
        return this.mapToEntity(cached);
      }
    }

    const doc = await this.crudOps.findById(id, context);
    
    if (doc && this.cacheOps.isEnabled) {
      await this.cacheOps.cacheById(id, doc);
    }

    return doc ? this.mapToEntity(doc) : null;
  }

  /**
   * Find single document matching query
   */
  public async findOne(
    query: FilterQuery, 
    options?: QueryOptions, 
    context?: RepositoryContext
  ): Promise<T | null> {
    // Check cache for simple queries
    if (this.cacheOps.isEnabled && this.cacheOps.isSimpleQuery(query)) {
      const cached = await this.cacheOps.getCachedQueryResult<T>(query, options);
      if (cached) {
        return this.mapToEntity(cached);
      }
    }

    const doc = await this.crudOps.findOne(query, options, context);

    if (doc && this.cacheOps.isEnabled && this.cacheOps.isSimpleQuery(query)) {
      await this.cacheOps.cacheQueryResult(query, doc, 300, options);
    }

    return doc ? this.mapToEntity(doc) : null;
  }

  /**
   * Find multiple documents matching query
   */
  public async find(
    query: FilterQuery, 
    options?: QueryOptions, 
    context?: RepositoryContext
  ): Promise<T[]> {
    // Check cache for simple queries
    if (this.cacheOps.isEnabled && this.cacheOps.isSimpleQuery(query)) {
      const cached = await this.cacheOps.getCachedQueryResult<T[]>(query, options);
      if (cached) {
        return cached.map(doc => this.mapToEntity(doc));
      }
    }

    const docs = await this.crudOps.find(query, options, context);

    if (this.cacheOps.isEnabled && this.cacheOps.isSimpleQuery(query)) {
      await this.cacheOps.cacheQueryResult(query, docs, 300, options);
    }

    return docs.map(doc => this.mapToEntity(doc));
  }

  /**
   * Count documents matching query
   */
  public async count(query: FilterQuery, context?: RepositoryContext): Promise<number> {
    return this.crudOps.count(query, context);
  }

  /**
   * Create new document
   */
  public async create(data: Partial<T>, context?: RepositoryContext): Promise<T> {
    // Validate data
    if (!this.validationOps.shouldSkipValidation(context?.skipValidation)) {
      this.validationOps.validateAndThrow(data, this.validateData.bind(this));
    }

    const mappedData = this.mapFromEntity(data as T);
    const doc = await this.crudOps.create(mappedData, context);

    // Cache the new document
    if (this.cacheOps.isEnabled) {
      const docId = this.extractId(doc);
      if (docId) {
        await this.cacheOps.cacheById(docId, doc);
      }
      await this.cacheOps.invalidateAfterCreate(doc);
    }

    // Publish event
    await this.eventOps.publishCreateEvent(this.collectionName, doc, context);

    return this.mapToEntity(doc);
  }

  /**
   * Create multiple documents
   */
  public async createMany(data: Partial<T>[], context?: RepositoryContext): Promise<T[]> {
    // Validate all data
    if (!this.validationOps.shouldSkipValidation(context?.skipValidation)) {
      this.validationOps.validateManyAndThrow(data, this.validateData.bind(this));
    }

    const mappedData = data.map(item => this.mapFromEntity(item as T));
    const docs = await this.crudOps.createMany(mappedData, context);

    // Cache and invalidate
    if (this.cacheOps.isEnabled) {
      for (const doc of docs) {
        const docId = this.extractId(doc);
        if (docId) {
          await this.cacheOps.cacheById(docId, doc);
        }
      }
      await this.cacheOps.invalidateAfterCreate({});
    }

    // Publish event
    await this.eventOps.publishCreateManyEvent(this.collectionName, docs, context);

    return docs.map(doc => this.mapToEntity(doc));
  }

  /**
   * Update document by ID
   */
  public async update(
    id: string | Types.ObjectId, 
    data: Partial<T>, 
    context?: RepositoryContext
  ): Promise<T | null> {
    // Validate data
    if (!this.validationOps.shouldSkipValidation(context?.skipValidation)) {
      this.validationOps.validateAndThrow(data, this.validateData.bind(this));
    }

    const mappedData = this.mapFromEntity(data as T);
    const doc = await this.crudOps.update(id, mappedData, context);

    if (doc) {
      // Update cache
      if (this.cacheOps.isEnabled) {
        await this.cacheOps.invalidateAfterUpdate(id, doc);
      }

      // Publish event
      await this.eventOps.publishUpdateEvent(this.collectionName, doc, context);
    }

    return doc ? this.mapToEntity(doc) : null;
  }

  /**
   * Update multiple documents
   */
  public async updateMany(
    query: FilterQuery, 
    data: Partial<T>, 
    context?: RepositoryContext
  ): Promise<UpdateResult> {
    const mappedData = this.mapFromEntity(data as T);
    const result = await this.crudOps.updateMany(query, mappedData, context);

    if (result.modifiedCount > 0) {
      // Invalidate cache patterns
      if (this.cacheOps.isEnabled) {
        await this.cacheOps.invalidateByPattern('*');
      }

      // Publish event
      await this.eventOps.publishUpdateManyEvent(
        this.collectionName, 
        query, 
        result.modifiedCount, 
        context
      );
    }

    return result;
  }

  /**
   * Delete document by ID
   */
  public async delete(
    id: string | Types.ObjectId, 
    context?: RepositoryContext
  ): Promise<boolean> {
    const result = await this.crudOps.delete(id, context);

    if (result) {
      // Invalidate cache
      if (this.cacheOps.isEnabled) {
        await this.cacheOps.invalidateAfterDelete(id);
      }

      // Publish event
      await this.eventOps.publishDeleteEvent(this.collectionName, id.toString(), context);
    }

    return result;
  }

  /**
   * Delete multiple documents
   */
  public async deleteMany(
    query: FilterQuery, 
    context?: RepositoryContext
  ): Promise<DeleteResult> {
    const result = await this.crudOps.deleteMany(query, context);

    if (result.deletedCount > 0) {
      // Invalidate cache patterns
      if (this.cacheOps.isEnabled) {
        await this.cacheOps.invalidateByPattern('*');
      }

      // Publish event
      await this.eventOps.publishDeleteManyEvent(
        this.collectionName, 
        query, 
        result.deletedCount, 
        context
      );
    }

    return result;
  }

  /**
   * Check if document exists
   */
  public async exists(query: FilterQuery, context?: RepositoryContext): Promise<boolean> {
    return this.crudOps.exists(query, context);
  }

  /**
   * Find with pagination
   */
  public async findWithPagination(
    query: FilterQuery,
    page: number,
    limit: number,
    options?: QueryOptions,
    context?: RepositoryContext
  ): Promise<{
    data: T[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const result = await this.crudOps.findWithPagination(query, page, limit, options, context);
    
    return {
      ...result,
      data: result.data.map(doc => this.mapToEntity(doc))
    };
  }

  /**
   * Aggregate pipeline
   */
  public async aggregate<R = any>(
    pipeline: AggregationPipeline, 
    context?: RepositoryContext
  ): Promise<R[]> {
    return this.crudOps.aggregate<R>(pipeline, context);
  }

  /**
   * Find one and update
   */
  public async findOneAndUpdate(
    query: FilterQuery,
    update: Partial<T>,
    options?: { upsert?: boolean; returnNew?: boolean },
    context?: RepositoryContext
  ): Promise<T | null> {
    const mappedUpdate = this.mapFromEntity(update as T);
    const doc = await this.crudOps.findOneAndUpdate(query, mappedUpdate, options, context);

    if (doc && this.cacheOps.isEnabled) {
      const docId = this.extractId(doc);
      if (docId) {
        await this.cacheOps.invalidateAfterUpdate(docId, doc);
      }
    }

    return doc ? this.mapToEntity(doc) : null;
  }

  /**
   * Find one and delete
   */
  public async findOneAndDelete(
    query: FilterQuery, 
    context?: RepositoryContext
  ): Promise<T | null> {
    const doc = await this.crudOps.findOneAndDelete(query, context);

    if (doc && this.cacheOps.isEnabled) {
      const docId = this.extractId(doc);
      if (docId) {
        await this.cacheOps.invalidateAfterDelete(docId);
      }
    }

    return doc ? this.mapToEntity(doc) : null;
  }

  /**
   * Get distinct values
   */
  public async distinct(
    field: string, 
    query?: FilterQuery, 
    context?: RepositoryContext
  ): Promise<any[]> {
    return this.crudOps.distinct(field, query, context);
  }

  /**
   * Start transaction
   */
  public async startTransaction(): Promise<Transaction> {
    return this.transactionOps.startTransaction();
  }

  /**
   * Execute function within transaction
   */
  public async withTransaction<R>(
    fn: (transaction: Transaction) => Promise<R>
  ): Promise<R> {
    return this.transactionOps.withTransaction(fn);
  }

  // Protected methods for child classes to override

  /**
   * Validate data before create/update operations
   */
  protected validateData(data: Partial<T>): ValidationResult {
    // Default implementation - child classes should override
    return { valid: true };
  }

  /**
   * Map database document to domain entity
   */
  protected mapToEntity(data: any): T {
    // Default implementation - child classes should override if needed
    return data as T;
  }

  /**
   * Map domain entity to database document
   */
  protected mapFromEntity(entity: T): any {
    // Default implementation - child classes should override if needed
    return entity;
  }

  /**
   * Extract ID from document
   */
  protected extractId(doc: any): string | Types.ObjectId | null {
    if (doc && typeof doc === 'object') {
      if (doc._id) {
        return doc._id;
      }
      if (doc.id) {
        return doc.id;
      }
    }
    return null;
  }

  // Expose composed operations for child classes
  protected get cacheHelpers() { return this.cacheOps; }
  protected get eventHelpers() { return this.eventOps; }
  protected get validationHelpers() { return this.validationOps; }
  protected get transactionHelpers() { return this.transactionOps; }

  /**
   * Publish custom event (convenience method for child classes)
   */
  protected async publishEvent(
    eventType: string, 
    payload: any, 
    context?: RepositoryContext
  ): Promise<void> {
    await this.eventOps.publishEvent(eventType, payload, context);
  }
}
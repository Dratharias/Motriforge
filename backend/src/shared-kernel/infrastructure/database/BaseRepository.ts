import { ObjectId, ClientSession } from 'mongodb';
import { IRepository, IEntity } from '@/types/shared/base-types';
import { PaginatedResult, QueryParams, ValidationResult, SortParams } from '@/types/shared/common';
import { ContextualLogger } from '../logging/ContextualLogger';

/**
 * MongoDB query operators for flexible filtering
 */
export type MongoQueryOperator = {
  $eq?: any;
  $ne?: any;
  $gt?: any;
  $gte?: any;
  $lt?: any;
  $lte?: any;
  $in?: any[];
  $nin?: any[];
  $exists?: boolean;
  $regex?: string | RegExp;
  $options?: string;
  [key: string]: any;
};

/**
 * Repository filter interface with MongoDB query operator support
 */
export interface RepositoryFilter {
  readonly [key: string]: any;
  isDeleted?: boolean | MongoQueryOperator;
}

/**
 * Internal MongoDB filter type
 */
interface MongoFilter {
  [key: string]: any;
}

/**
 * Repository options for operations
 */
export interface RepositoryOptions {
  readonly session?: ClientSession;
  readonly skipValidation?: boolean;
  readonly skipAudit?: boolean;
  readonly includeDeleted?: boolean;
}

/**
 * Sort options for MongoDB queries (using numeric direction)
 */
export interface SortOptions {
  readonly field: string;
  readonly direction: 1 | -1;
}

/**
 * Aggregation pipeline stage
 */
export interface PipelineStage {
  readonly [operator: string]: any;
}

/**
 * Base repository implementation with common functionality
 */
export abstract class BaseRepository<TEntity extends IEntity> implements IRepository<TEntity> {
  protected readonly logger: ContextualLogger;
  protected readonly collectionName: string;

  constructor(collectionName: string, logger: ContextualLogger) {
    this.collectionName = collectionName;
    this.logger = logger.forAggregate(new ObjectId(), collectionName);
  }

  /**
   * Abstract method to get entity mapper
   */
  protected abstract mapToEntity(document: any): TEntity;
  protected abstract mapToDocument(entity: TEntity): any;
  protected abstract validateEntity(entity: TEntity): ValidationResult;

  /**
   * Finds an entity by ID
   */
  async findById(id: ObjectId, options?: RepositoryOptions): Promise<TEntity | null> {
    const startTime = Date.now();
    try {
      this.logger.startOperation('findById', { id: id.toHexString() });

      const filter: MongoFilter = { _id: id };
      if (!options?.includeDeleted) {
        filter.isDeleted = { $ne: true };
      }

      const document = await this.findOneDocument(filter, options);
      
      if (!document) {
        this.logger.completeOperation('findById', Date.now() - startTime, { found: false });
        return null;
      }

      const entity = this.mapToEntity(document);
      this.logger.completeOperation('findById', Date.now() - startTime, { found: true });
      
      return entity;
    } catch (error) {
      this.logger.failOperation('findById', error as Error, Date.now() - startTime);
      throw error;
    }
  }

  /**
   * Finds entities by multiple IDs
   */
  async findByIds(ids: readonly ObjectId[], options?: RepositoryOptions): Promise<readonly TEntity[]> {
    try {
      const startTime = Date.now();
      this.logger.startOperation('findByIds', { count: ids.length });

      const filter: MongoFilter = { _id: { $in: ids } };
      if (!options?.includeDeleted) {
        filter.isDeleted = { $ne: true };
      }

      const documents = await this.findManyDocuments(filter, options);
      const entities = documents.map(doc => this.mapToEntity(doc));

      this.logger.completeOperation('findByIds', Date.now() - startTime, { 
        requested: ids.length, 
        found: entities.length 
      });
      
      return entities;
    } catch (error) {
      this.logger.failOperation('findByIds', error as Error);
      throw error;
    }
  }

  /**
   * Saves an entity (create or update)
   */
  async save(entity: TEntity, options?: RepositoryOptions): Promise<TEntity> {
    try {
      const startTime = Date.now();
      const isNew = !await this.exists(entity.id, options);
      const operation = isNew ? 'create' : 'update';
      
      this.logger.startOperation(`save-${operation}`, { id: entity.id.toHexString() });

      // Validate entity if not skipped
      if (!options?.skipValidation) {
        const validation = this.validateEntity(entity);
        if (!validation.isValid) {
          throw new Error(`Entity validation failed: ${validation.errors.map(e => e.message).join(', ')}`);
        }
      }

      const document = this.mapToDocument(entity);
      
      if (isNew) {
        await this.insertDocument(document, options);
      } else {
        await this.updateDocument({ _id: entity.id }, document, options);
      }

      this.logger.completeOperation(`save-${operation}`, Date.now() - startTime);
      return entity;
    } catch (error) {
      this.logger.failOperation('save', error as Error);
      throw error;
    }
  }

  /**
   * Deletes an entity (soft delete by default)
   */
  async delete(id: ObjectId, options?: RepositoryOptions): Promise<void> {
    try {
      const startTime = Date.now();
      this.logger.startOperation('delete', { id: id.toHexString() });

      // Soft delete by default
      await this.updateDocument(
        { _id: id },
        { 
          isDeleted: true, 
          deletedAt: new Date(),
          updatedAt: new Date()
        },
        options
      );

      this.logger.completeOperation('delete', Date.now() - startTime);
    } catch (error) {
      this.logger.failOperation('delete', error as Error);
      throw error;
    }
  }

  /**
   * Hard deletes an entity (permanently removes from database)
   */
  async hardDelete(id: ObjectId, options?: RepositoryOptions): Promise<void> {
    try {
      const startTime = Date.now();
      this.logger.startOperation('hardDelete', { id: id.toHexString() });

      await this.deleteDocument({ _id: id }, options);

      this.logger.completeOperation('hardDelete', Date.now() - startTime);
    } catch (error) {
      this.logger.failOperation('hardDelete', error as Error);
      throw error;
    }
  }

  /**
   * Checks if an entity exists
   */
  async exists(id: ObjectId, options?: RepositoryOptions): Promise<boolean> {
    try {
      const filter: MongoFilter = { _id: id };
      if (!options?.includeDeleted) {
        filter.isDeleted = { $ne: true };
      }

      const count = await this.countDocuments(filter, options);
      return count > 0;
    } catch (error) {
      this.logger.error('Error checking entity existence', error as Error, { id: id.toHexString() });
      throw error;
    }
  }

  /**
   * Finds entities with pagination and filtering
   */
  async findAll(params?: QueryParams, options?: RepositoryOptions): Promise<PaginatedResult<TEntity>> {
    try {
      const startTime = Date.now();
      this.logger.startOperation('findAll', { params });

      const filter = this.buildMongoFilter(params?.filters, options);
      const sort = this.buildMongoSort(params?.sort);
      const pagination = params?.pagination || { page: 1, limit: 10 };

      const skip = (pagination.page - 1) * pagination.limit;
      
      // Get total count and documents in parallel
      const [totalCount, documents] = await Promise.all([
        this.countDocuments(filter, options),
        this.findManyDocuments(filter, options, sort, skip, pagination.limit)
      ]);

      const entities = documents.map(doc => this.mapToEntity(doc));
      const totalPages = Math.ceil(totalCount / pagination.limit);

      const result: PaginatedResult<TEntity> = {
        items: entities,
        totalCount,
        page: pagination.page,
        limit: pagination.limit,
        totalPages,
        hasNext: pagination.page < totalPages,
        hasPrevious: pagination.page > 1
      };

      this.logger.completeOperation('findAll', Date.now() - startTime, {
        totalCount,
        returnedCount: entities.length,
        page: pagination.page
      });

      return result;
    } catch (error) {
      this.logger.failOperation('findAll', error as Error);
      throw error;
    }
  }

  /**
   * Finds entities by custom filter
   */
  async findBy(filter: RepositoryFilter, options?: RepositoryOptions): Promise<readonly TEntity[]> {
    try {
      const startTime = Date.now();
      this.logger.startOperation('findBy', { filter });

      const finalFilter = this.buildMongoFilter(filter, options);
      const documents = await this.findManyDocuments(finalFilter, options);
      const entities = documents.map(doc => this.mapToEntity(doc));

      this.logger.completeOperation('findBy', Date.now() - startTime, { count: entities.length });
      return entities;
    } catch (error) {
      this.logger.failOperation('findBy', error as Error);
      throw error;
    }
  }

  /**
   * Finds a single entity by filter
   */
  async findOneBy(filter: RepositoryFilter, options?: RepositoryOptions): Promise<TEntity | null> {
    try {
      const finalFilter = this.buildMongoFilter(filter, options);
      const document = await this.findOneDocument(finalFilter, options);
      
      return document ? this.mapToEntity(document) : null;
    } catch (error) {
      this.logger.error('Error finding entity', error as Error, { filter });
      throw error;
    }
  }

  /**
   * Counts entities matching filter
   */
  async count(filter?: RepositoryFilter, options?: RepositoryOptions): Promise<number> {
    try {
      const finalFilter = this.buildMongoFilter(filter, options);
      return await this.countDocuments(finalFilter, options);
    } catch (error) {
      this.logger.error('Error counting entities', error as Error, { filter });
      throw error;
    }
  }

  /**
   * Executes aggregation pipeline
   */
  async aggregate<T = any>(pipeline: PipelineStage[], options?: RepositoryOptions): Promise<T[]> {
    try {
      const startTime = Date.now();
      this.logger.startOperation('aggregate', { stageCount: pipeline.length });

      const results = await this.aggregateDocuments(pipeline, options);

      this.logger.completeOperation('aggregate', Date.now() - startTime, { resultCount: results.length });
      return results;
    } catch (error) {
      this.logger.failOperation('aggregate', error as Error);
      throw error;
    }
  }

  /**
   * Bulk operations for better performance
   */
  async bulkInsert(entities: readonly TEntity[], options?: RepositoryOptions): Promise<void> {
    try {
      const startTime = Date.now();
      this.logger.startOperation('bulkInsert', { count: entities.length });

      const documents = entities.map(entity => {
        if (!options?.skipValidation) {
          const validation = this.validateEntity(entity);
          if (!validation.isValid) {
            throw new Error(`Entity validation failed: ${validation.errors.map(e => e.message).join(', ')}`);
          }
        }
        return this.mapToDocument(entity);
      });

      await this.bulkInsertDocuments(documents, options);

      this.logger.completeOperation('bulkInsert', Date.now() - startTime);
    } catch (error) {
      this.logger.failOperation('bulkInsert', error as Error);
      throw error;
    }
  }

  // Abstract methods to be implemented by concrete repositories
  protected abstract findOneDocument(filter: any, options?: RepositoryOptions): Promise<any>;
  protected abstract findManyDocuments(filter: any, options?: RepositoryOptions, sort?: any, skip?: number, limit?: number): Promise<any[]>;
  protected abstract insertDocument(document: any, options?: RepositoryOptions): Promise<void>;
  protected abstract updateDocument(filter: any, update: any, options?: RepositoryOptions): Promise<void>;
  protected abstract deleteDocument(filter: any, options?: RepositoryOptions): Promise<void>;
  protected abstract countDocuments(filter: any, options?: RepositoryOptions): Promise<number>;
  protected abstract aggregateDocuments(pipeline: PipelineStage[], options?: RepositoryOptions): Promise<any[]>;
  protected abstract bulkInsertDocuments(documents: any[], options?: RepositoryOptions): Promise<void>;

  /**
   * Builds final MongoDB filter including soft delete conditions
   */
  protected buildMongoFilter(filter?: RepositoryFilter, options?: RepositoryOptions): MongoFilter {
    const finalFilter: MongoFilter = { ...filter };
    
    if (!options?.includeDeleted) {
      finalFilter.isDeleted = { $ne: true };
    }
    
    return finalFilter;
  }

  /**
   * Converts SortParams to MongoDB sort format
   */
  protected buildMongoSort(sortParams?: readonly SortParams[]): any {
    if (!sortParams || sortParams.length === 0) {
      return { createdAt: -1 }; // Default sort by creation date (newest first)
    }

    const sort: any = {};
    for (const param of sortParams) {
      // Convert string direction to MongoDB numeric format
      sort[param.field] = param.direction === 'asc' ? 1 : -1;
    }
    
    return sort;
  }

  /**
   * Converts SortParams to SortOptions format (if needed internally)
   */
  protected convertToSortOptions(sortParams?: readonly SortParams[]): readonly SortOptions[] {
    if (!sortParams) {
      return [{ field: 'createdAt', direction: -1 }];
    }

    return sortParams.map(param => ({
      field: param.field,
      direction: param.direction === 'asc' ? 1 : -1
    }));
  }

  /**
   * Helper method for text search (can be overridden by specific repositories)
   */
  protected buildTextSearchFilter(searchTerm?: string, searchFields?: string[]): MongoFilter {
    if (!searchTerm || !searchFields || searchFields.length === 0) {
      return {};
    }

    const searchRegex = new RegExp(searchTerm, 'i'); // Case-insensitive search
    
    if (searchFields.length === 1) {
      return { [searchFields[0]]: searchRegex };
    }

    // Multiple fields - use $or operator
    return {
      $or: searchFields.map(field => ({ [field]: searchRegex }))
    };
  }

  /**
   * Helper method for date range filtering
   */
  protected buildDateRangeFilter(field: string, startDate?: Date, endDate?: Date): MongoFilter {
    const filter: MongoFilter = {};
    
    if (startDate || endDate) {
      const dateFilter: any = {};
      
      if (startDate) {
        dateFilter.$gte = startDate;
      }
      
      if (endDate) {
        dateFilter.$lte = endDate;
      }
      
      filter[field] = dateFilter;
    }
    
    return filter;
  }

  /**
   * Helper method for building complex filters with logical operators
   */
  protected buildComplexFilter(conditions: any[]): MongoFilter {
    if (conditions.length === 0) {
      return {};
    }
    
    if (conditions.length === 1) {
      return conditions[0];
    }
    
    return { $and: conditions };
  }
}
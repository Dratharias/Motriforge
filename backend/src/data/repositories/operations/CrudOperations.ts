import { Types, Model } from 'mongoose';
import { LoggerFacade } from '@/core/logging';
import { 
  RepositoryContext, 
  FilterQuery,
  QueryOptions,
  AggregationPipeline,
  RepositoryUpdateResult,
  RepositoryDeleteResult,
  toRepositoryDeleteResult,
  toRepositoryUpdateResult
} from '@/types/repositories';
import { QueryBuilder } from '../helpers/QueryBuilder';


/**
 * Handles basic CRUD operations for repositories
 */
export class CrudOperations<T> {
  constructor(
    private readonly model: Model<T>,
    private readonly logger: LoggerFacade,
    private readonly collectionName: string
  ) {}

  /**
   * Find document by ID
   */
  public async findById(
    id: string | Types.ObjectId, 
    context?: RepositoryContext
  ): Promise<T | null> {
    try {
      this.logger.debug('Finding document by ID', { id: id.toString() });

      let query = this.model.findById(id);
      
      if (context?.session) {
        query = query.session(context.session);
      }

      const doc = await query.lean().exec();
      return doc as T | null;
    } catch (error) {
      this.logger.error('Error finding document by ID', error as Error, { 
        id: id.toString() 
      });
      throw error;
    }
  }

  /**
   * Find single document matching query
   */
  public async findOne(
    query: FilterQuery, 
    options?: QueryOptions, 
    context?: RepositoryContext
  ): Promise<T | null> {
    try {
      this.logger.debug('Finding single document', { query });

      const mongoQuery = QueryBuilder.buildMongoQuery(query);
      let dbQuery = this.model.findOne(mongoQuery);
      
      if (context?.session) {
        dbQuery = dbQuery.session(context.session);
      }

      if (options) {
        dbQuery = QueryBuilder.applyQueryOptions(dbQuery, options) as any;
      }

      const doc = await dbQuery.lean().exec();
      return doc as T | null;
    } catch (error) {
      this.logger.error('Error finding single document', error as Error, { query });
      throw error;
    }
  }

  /**
   * Find multiple documents matching query
   */
  public async find(
    query: FilterQuery, 
    options?: QueryOptions, 
    context?: RepositoryContext
  ): Promise<T[]> {
    try {
      this.logger.debug('Finding multiple documents', { query });

      const mongoQuery = QueryBuilder.buildMongoQuery(query);
      let dbQuery = this.model.find(mongoQuery);
      
      if (context?.session) {
        dbQuery = dbQuery.session(context.session);
      }

      if (options) {
        dbQuery = QueryBuilder.applyQueryOptions(dbQuery, options) as any;
      }

      const docs = await dbQuery.lean().exec();
      return docs as T[];
    } catch (error) {
      this.logger.error('Error finding multiple documents', error as Error, { query });
      throw error;
    }
  }

  /**
   * Count documents matching query
   */
  public async count(query: FilterQuery, context?: RepositoryContext): Promise<number> {
    try {
      this.logger.debug('Counting documents', { query });

      const mongoQuery = QueryBuilder.buildMongoQuery(query);
      let countQuery = this.model.countDocuments(mongoQuery);
      
      if (context?.session) {
        countQuery = countQuery.session(context.session);
      }
      
      const count = await countQuery.exec();
      return count;
    } catch (error) {
      this.logger.error('Error counting documents', error as Error, { query });
      throw error;
    }
  }

  /**
   * Create new document
   */
  public async create(data: any, context?: RepositoryContext): Promise<T> {
    try {
      this.logger.debug('Creating document');

      const createOptions: any = {};
      
      if (context?.session) {
        createOptions.session = context.session;
      }
      
      const [doc] = await this.model.create([data], createOptions);

      this.logger.debug('Document created', { id: (doc as any)._id?.toString() });
      return doc as T;
    } catch (error) {
      this.logger.error('Error creating document', error as Error);
      throw error;
    }
  }

  /**
   * Create multiple documents
   */
  public async createMany(data: any[], context?: RepositoryContext): Promise<T[]> {
    try {
      this.logger.debug('Creating multiple documents', { count: data.length });

      const createOptions: any = {};
      
      if (context?.session) {
        createOptions.session = context.session;
      }
      
      const docs = await this.model.create(data, createOptions);

      this.logger.debug('Multiple documents created', { count: docs.length });
      return docs as T[];
    } catch (error) {
      this.logger.error('Error creating multiple documents', error as Error);
      throw error;
    }
  }

  /**
   * Update document by ID
   */
  public async update(
    id: string | Types.ObjectId, 
    data: any, 
    context?: RepositoryContext
  ): Promise<T | null> {
    try {
      this.logger.debug('Updating document', { id: id.toString() });

      let updateQuery = this.model.findByIdAndUpdate(
        id,
        { ...data, updatedAt: new Date() },
        { new: true }
      );
      
      if (context?.session) {
        updateQuery = updateQuery.session(context.session);
      }
      
      const doc = await updateQuery.lean().exec();

      if (doc) {
        this.logger.debug('Document updated', { id: id.toString() });
      }

      return doc as T | null;
    } catch (error) {
      this.logger.error('Error updating document', error as Error, { 
        id: id.toString() 
      });
      throw error;
    }
  }

  /**
   * Update multiple documents
   */
  public async updateMany(
    query: FilterQuery, 
    data: any, 
    context?: RepositoryContext
  ): Promise<RepositoryUpdateResult> {
    try {
      this.logger.debug('Updating multiple documents', { query });

      const mongoQuery = QueryBuilder.buildMongoQuery(query);
      
      let updateQuery = this.model.updateMany(
        mongoQuery,
        { ...data, updatedAt: new Date() }
      );
      
      if (context?.session) {
        updateQuery = updateQuery.session(context.session);
      }
      
      const result = await updateQuery.exec();

      this.logger.debug('Multiple documents updated', { 
        modifiedCount: result.modifiedCount 
      });

      return toRepositoryUpdateResult(result);
    } catch (error) {
      this.logger.error('Error updating multiple documents', error as Error, { query });
      throw error;
    }
  }

  /**
   * Delete document by ID
   */
  public async delete(
    id: string | Types.ObjectId, 
    context?: RepositoryContext
  ): Promise<boolean> {
    try {
      this.logger.debug('Deleting document', { id: id.toString() });

      let deleteQuery = this.model.findByIdAndDelete(id);
      
      if (context?.session) {
        deleteQuery = deleteQuery.session(context.session);
      }
      
      const result = await deleteQuery.exec();

      if (result) {
        this.logger.debug('Document deleted', { id: id.toString() });
      }

      return !!result;
    } catch (error) {
      this.logger.error('Error deleting document', error as Error, { 
        id: id.toString() 
      });
      throw error;
    }
  }

  /**
   * Delete multiple documents
   */
  public async deleteMany(
    query: FilterQuery, 
    context?: RepositoryContext
  ): Promise<RepositoryDeleteResult> {
    try {
      this.logger.debug('Deleting multiple documents', { query });

      const mongoQuery = QueryBuilder.buildMongoQuery(query);
      let deleteQuery = this.model.deleteMany(mongoQuery);
      
      if (context?.session) {
        deleteQuery = deleteQuery.session(context.session);
      }
      
      const result = await deleteQuery.exec();

      this.logger.debug('Multiple documents deleted', { 
        deletedCount: result.deletedCount 
      });

      return toRepositoryDeleteResult(result);
    } catch (error) {
      this.logger.error('Error deleting multiple documents', error as Error, { query });
      throw error;
    }
  }

  /**
   * Check if document exists
   */
  public async exists(query: FilterQuery, context?: RepositoryContext): Promise<boolean> {
    try {
      const mongoQuery = QueryBuilder.buildMongoQuery(query);
      let existsQuery = this.model.exists(mongoQuery);
      
      if (context?.session) {
        existsQuery = existsQuery.session(context.session);
      }
      
      const doc = await existsQuery.exec();
      return !!doc;
    } catch (error) {
      this.logger.error('Error checking document existence', error as Error, { query });
      throw error;
    }
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
    try {
      this.logger.debug('Finding documents with pagination', { 
        query, 
        page, 
        limit 
      });

      const mongoQuery = QueryBuilder.buildMongoQuery(query);
      const skip = (page - 1) * limit;

      // Get total count
      let countQuery = this.model.countDocuments(mongoQuery);
      if (context?.session) {
        countQuery = countQuery.session(context.session);
      }
      const total = await countQuery.exec();

      // Get documents
      let dbQuery = this.model
        .find(mongoQuery)
        .skip(skip)
        .limit(limit);
        
      if (context?.session) {
        dbQuery = dbQuery.session(context.session);
      }

      if (options) {
        dbQuery = QueryBuilder.applyQueryOptions(dbQuery, options) as any;
      }

      const docs = await dbQuery.lean().exec();

      const totalPages = Math.ceil(total / limit);

      return {
        data: docs as T[],
        total,
        page,
        limit,
        totalPages
      };
    } catch (error) {
      this.logger.error('Error finding documents with pagination', error as Error, { 
        query, 
        page, 
        limit 
      });
      throw error;
    }
  }

  /**
   * Aggregate pipeline
   */
  public async aggregate<R = any>(
    pipeline: AggregationPipeline, 
    context?: RepositoryContext
  ): Promise<R[]> {
    try {
      this.logger.debug('Running aggregation pipeline', { 
        stageCount: pipeline.length 
      });

      const validatedPipeline = QueryBuilder.buildAggregationPipeline(pipeline);
      let aggregateQuery = this.model.aggregate(validatedPipeline);
      
      if (context?.session) {
        aggregateQuery = aggregateQuery.session(context.session);
      }
      
      const result = await aggregateQuery.exec();
      return result;
    } catch (error) {
      this.logger.error('Error running aggregation pipeline', error as Error);
      throw error;
    }
  }

  /**
   * Find one and update
   */
  public async findOneAndUpdate(
    query: FilterQuery,
    update: any,
    options?: { upsert?: boolean; returnNew?: boolean },
    context?: RepositoryContext
  ): Promise<T | null> {
    try {
      const mongoQuery = QueryBuilder.buildMongoQuery(query);
      
      let updateQuery = this.model.findOneAndUpdate(
        mongoQuery,
        { ...update, updatedAt: new Date() },
        { 
          new: options?.returnNew ?? true,
          upsert: options?.upsert ?? false
        }
      );
      
      if (context?.session) {
        updateQuery = updateQuery.session(context.session);
      }
      
      const doc = await updateQuery.lean().exec();
      return doc as T | null;
    } catch (error) {
      this.logger.error('Error in findOneAndUpdate', error as Error, { query });
      throw error;
    }
  }

  /**
   * Find one and delete
   */
  public async findOneAndDelete(
    query: FilterQuery, 
    context?: RepositoryContext
  ): Promise<T | null> {
    try {
      const mongoQuery = QueryBuilder.buildMongoQuery(query);
      let deleteQuery = this.model.findOneAndDelete(mongoQuery);
      
      if (context?.session) {
        deleteQuery = deleteQuery.session(context.session);
      }
      
      const doc = await deleteQuery.lean().exec();
      return doc as T | null;
    } catch (error) {
      this.logger.error('Error in findOneAndDelete', error as Error, { query });
      throw error;
    }
  }

  /**
   * Get distinct values
   */
  public async distinct(
    field: string, 
    query?: FilterQuery, 
    context?: RepositoryContext
  ): Promise<any[]> {
    try {
      const mongoQuery = query ? QueryBuilder.buildMongoQuery(query) : {};
      let distinctQuery = this.model.distinct(field, mongoQuery);
      
      if (context?.session) {
        distinctQuery = distinctQuery.session(context.session);
      }
      
      const values = await distinctQuery.exec();
      return values;
    } catch (error) {
      this.logger.error('Error getting distinct values', error as Error, { 
        field, 
        query 
      });
      throw error;
    }
  }
}
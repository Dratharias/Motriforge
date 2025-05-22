import { Types, ClientSession, PipelineStage } from 'mongoose';

/**
 * Filter query interface for database operations
 */
export interface FilterQuery {
  operator?: 'and' | 'or';
  conditions?: Condition[];
  [key: string]: any;
}

/**
 * Individual condition for filtering
 */
export interface Condition {
  field: string;
  operator: string;
  value: any;
}

/**
 * Sort options for queries
 */
export interface SortOptions {
  field: string;
  direction: 'asc' | 'desc';
}

/**
 * Pagination options for queries
 */
export interface PaginationOptions {
  limit: number;
  offset: number;
  page: number;
  pageSize: number;
}

/**
 * Query options combining various query parameters
 */
export interface QueryOptions {
  sort?: SortOptions[];
  pagination?: PaginationOptions;
  projection?: string[];
  populate?: string[] | PopulateOptions[];
}

/**
 * Populate options for MongoDB queries
 */
export interface PopulateOptions {
  path: string;
  select?: string;
  populate?: PopulateOptions[];
  match?: Record<string, any>;
  options?: Record<string, any>;
}

/**
 * Validation result interface
 */
export interface ValidationResult {
  valid: boolean;
  errors?: string[];
}

/**
 * Database session interface for transactions
 */
export interface DatabaseSession {
  id: string;
  isActive: boolean;
  startTransaction(): Promise<void>;
  commitTransaction(): Promise<void>;
  abortTransaction(): Promise<void>;
}

/**
 * Transaction operation interface
 */
export interface TransactionOperation {
  repository: Repository<any>;
  operation: 'create' | 'update' | 'delete';
  data: any;
  execute(session: DatabaseSession): Promise<any>;
  execute(session: DatabaseSession): Promise<any>;
}

/**
 * Transaction status enumeration
 */
export enum TransactionStatus {
  PENDING = 'pending',
  COMMITTED = 'committed',
  ROLLED_BACK = 'rolled_back',
  ERROR = 'error'
}

/**
 * Transaction interface
 */
export interface Transaction {
  session: DatabaseSession;
  operations: TransactionOperation[];
  status: TransactionStatus;
  add(operation: TransactionOperation): void;
  execute(): Promise<any[]>;
  rollback(): Promise<void>;
  getSession(): DatabaseSession;
  getClientSession(): ClientSession;
  getStatus(): TransactionStatus;
}

/**
 * Update result interface
 */
export interface UpdateResult {
  acknowledged: boolean;
  modifiedCount: number;
  upsertedId?: Types.ObjectId;
  upsertedCount: number;
  matchedCount: number;
}

/**
 * Delete result interface
 */
export interface DeleteResult {
  acknowledged: boolean;
  deletedCount: number;
}

/**
 * Insert result interface
 */
export interface InsertResult<T> {
  acknowledged: boolean;
  insertedId: Types.ObjectId;
  insertedIds?: Types.ObjectId[];
}

/**
 * Repository context for operations
 */
export interface RepositoryContext {
  userId?: string;
  organizationId?: string;
  requestId?: string;
  skipValidation?: boolean;
  skipEvents?: boolean;
  session?: ClientSession;
}

/**
 * Base repository interface that all repositories should implement
 */
export interface Repository<T> {
  findById(id: string | Types.ObjectId, context?: RepositoryContext): Promise<T | null>;
  findOne(query: FilterQuery, options?: QueryOptions, context?: RepositoryContext): Promise<T | null>;
  find(query: FilterQuery, options?: QueryOptions, context?: RepositoryContext): Promise<T[]>;

  count(query: FilterQuery, context?: RepositoryContext): Promise<number>;

  create(data: Partial<T>, context?: RepositoryContext): Promise<T>;
  createMany(data: Partial<T>[], context?: RepositoryContext): Promise<T[]>;

  update(id: string | Types.ObjectId, data: Partial<T>, context?: RepositoryContext): Promise<T | null>;
  updateMany(query: FilterQuery, data: Partial<T>, context?: RepositoryContext): Promise<UpdateResult>;
  
  delete(id: string | Types.ObjectId, context?: RepositoryContext): Promise<boolean>;
  deleteMany(query: FilterQuery, context?: RepositoryContext): Promise<DeleteResult>;
  
  exists(query: FilterQuery, context?: RepositoryContext): Promise<boolean>;
  
  findWithPagination(
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
  }>;
  
  aggregate<R = any>(pipeline: Record<string, any>[], context?: RepositoryContext): Promise<R[]>;

  findOneAndUpdate(
    query: FilterQuery,
    update: Partial<T>,
    options?: { upsert?: boolean; returnNew?: boolean },
    context?: RepositoryContext
  ): Promise<T | null>;

  findOneAndDelete(query: FilterQuery, context?: RepositoryContext): Promise<T | null>;
  distinct(field: string, query?: FilterQuery, context?: RepositoryContext): Promise<any[]>;
  startTransaction(): Promise<Transaction>;
  withTransaction<R>(fn: (transaction: Transaction) => Promise<R>): Promise<R>;
}


/**
 * Repository configuration interface
 */
export interface RepositoryConfig {
  enableCaching?: boolean;
  cacheDefaultTTL?: number;
  enableEventPublishing?: boolean;
  enableValidation?: boolean;
  sensitiveFields?: string[];
}

/**
 * Repository context for operations
 */
export interface RepositoryContext {
  userId?: string;
  organizationId?: string;
  requestId?: string;
  skipValidation?: boolean;
  skipEvents?: boolean;
  session?: ClientSession;
}

/**
 * Validation context for data validation
 */
export interface ValidationContext {
  isCreate: boolean;
  isUpdate: boolean;
  currentData?: any;
  userId?: string;
  organizationId?: string;
}


/**
 * Aggregate pipeline stage type
 */
export type AggregationPipeline = PipelineStage[];

/**
 * Repository event data
 */
export interface RepositoryEventData {
  repository: string;
  collection: string;
  operation: string;
  timestamp: Date;
  [key: string]: any;
}
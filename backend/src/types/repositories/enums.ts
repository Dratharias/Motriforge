/**
 * Connection status for database connections
 */
export enum ConnectionStatus {
  DISCONNECTED = 'disconnected',
  CONNECTING = 'connecting',
  CONNECTED = 'connected',
  ERROR = 'error'
}

/**
 * Query builder operators
 */
export enum QueryOperator {
  EQUALS = 'eq',
  NOT_EQUALS = 'ne',
  GREATER_THAN = 'gt',
  GREATER_THAN_EQUAL = 'gte',
  LESS_THAN = 'lt',
  LESS_THAN_EQUAL = 'lte',
  IN = 'in',
  NOT_IN = 'nin',
  EXISTS = 'exists',
  REGEX = 'regex',
  SIZE = 'size',
  ALL = 'all',
  ELEM_MATCH = 'elemMatch'
}

/**
 * Sort directions
 */
export enum SortDirection {
  ASCENDING = 'asc',
  DESCENDING = 'desc'
}

/**
 * Index types for database optimization
 */
export enum IndexType {
  SINGLE = 'single',
  COMPOUND = 'compound',
  TEXT = 'text',
  GEOSPATIAL = 'geospatial',
  HASHED = 'hashed',
  SPARSE = 'sparse',
  UNIQUE = 'unique'
}

/**
 * Repository operation types for logging and metrics
 */
export enum RepositoryOperation {
  CREATE = 'create',
  READ = 'read',
  UPDATE = 'update',
  DELETE = 'delete',
  FIND = 'find',
  COUNT = 'count',
  AGGREGATE = 'aggregate',
  TRANSACTION = 'transaction'
}

/**
 * Repository event types for eventing system
 */
export enum RepositoryEventType {
  BEFORE_CREATE = 'before_create',
  AFTER_CREATE = 'after_create',
  BEFORE_UPDATE = 'before_update',
  AFTER_UPDATE = 'after_update',
  BEFORE_DELETE = 'before_delete',
  AFTER_DELETE = 'after_delete',
  VALIDATION_ERROR = 'validation_error',
  OPERATION_ERROR = 'operation_error'
}

/**
 * Cache strategies for repository operations
 */
export enum CacheStrategy {
  NONE = 'none',
  READ_THROUGH = 'read_through',
  WRITE_THROUGH = 'write_through',
  WRITE_BEHIND = 'write_behind',
  CACHE_ASIDE = 'cache_aside'
}

/**
 * Validation levels for repository operations
 */
export enum ValidationLevel {
  NONE = 'none',
  BASIC = 'basic',
  STRICT = 'strict',
  CUSTOM = 'custom'
}

/**
 * Repository performance metrics types
 */
export enum MetricType {
  OPERATION_COUNT = 'operation_count',
  OPERATION_DURATION = 'operation_duration',
  ERROR_COUNT = 'error_count',
  CACHE_HIT_RATE = 'cache_hit_rate',
  QUERY_COMPLEXITY = 'query_complexity',
  DOCUMENT_SIZE = 'document_size'
}
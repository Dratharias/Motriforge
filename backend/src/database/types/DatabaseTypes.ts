export interface ConnectionPoolConfig {
  readonly host: string;
  readonly port: number;
  readonly database: string;
  readonly user: string;
  readonly password: string;
  readonly max?: number;
  readonly idleTimeoutMillis?: number;
  readonly connectionTimeoutMillis?: number;
  readonly ssl?: boolean | object;
}

export interface MigrationConfig {
  readonly path: string;
  readonly autoRun: boolean;
}

export interface IndexConfig {
  readonly autoCreate: boolean;
  readonly analyzeUsage: boolean;
}

export interface MonitoringConfig {
  readonly enabled: boolean;
  readonly slowQueryThreshold: number;
  readonly logQueries: boolean;
  readonly enableQueryPlan: boolean;
}

export interface BackupConfig {
  readonly enabled: boolean;
  readonly schedule: string;
  readonly retention: number;
  readonly location: string;
}

export interface DatabaseSecurityConfig {
  readonly encryptionKey: string | undefined;
  readonly enableRowLevelSecurity: boolean;
  readonly auditLogging: boolean;
  readonly allowedHosts: readonly string[];
}

export interface DatabaseConfig {
  readonly connection: ConnectionPoolConfig;
  readonly migrations: MigrationConfig;
  readonly indexes: IndexConfig;
  readonly monitoring?: MonitoringConfig;
  readonly backup?: BackupConfig;
  readonly security?: DatabaseSecurityConfig;
}

export interface DatabaseResult<T = any> {
  readonly rows: T[];
  readonly rowCount: number;
  readonly duration: number;
  readonly query: string;
}

export interface QueryOptions {
  readonly timeout?: number;
  readonly retries?: number;
  readonly name?: string;
}

export interface TransactionQuery {
  readonly sql: string;
  readonly params?: readonly any[];
  readonly name?: string;
}

export interface PoolStats {
  readonly totalCount: number;
  readonly idleCount: number;
  readonly waitingCount: number;
  readonly isHealthy: boolean;
}

export interface HealthDetails {
  readonly connection: boolean;
  readonly poolStats: PoolStats;
  readonly latency?: number;
  readonly version?: string;
  readonly error?: string;
}

export interface HealthCheckResult {
  readonly status: 'healthy' | 'degraded' | 'unhealthy';
  readonly details: HealthDetails;
}

export interface Migration {
  readonly version: string;
  readonly name: string;
  readonly up: string;
  readonly down: string;
  readonly timestamp: Date;
}

export interface IndexStats {
  readonly indexName: string;
  readonly tableName: string;
  readonly schemaName: string;
  readonly indexSize: string;
  readonly indexScans: number;
  readonly tuplesFetched: number;
}

export interface PerformanceRecommendations {
  readonly slowQueries: readonly string[];
  readonly missingIndexes: readonly string[];
  readonly unusedIndexes: readonly IndexStats[];
  readonly recommendations: readonly string[];
}

// Error types
export class DatabaseError extends Error {
  constructor(
    message: string,
    public readonly context?: any
  ) {
    super(message);
    this.name = 'DatabaseError';
  }
}

export class DatabaseInitializationError extends DatabaseError {
  constructor(
    message: string,
    public readonly context?: any
  ) {
    super(message, context);
    this.name = 'DatabaseInitializationError';
  }
}

export class ConnectionAcquisitionError extends DatabaseError {
  constructor(
    message: string,
    public readonly context?: any
  ) {
    super(message, context);
    this.name = 'ConnectionAcquisitionError';
  }
}

export class QueryExecutionError extends DatabaseError {
  constructor(
    message: string,
    public readonly context?: any
  ) {
    super(message, context);
    this.name = 'QueryExecutionError';
  }
}

export class TransactionExecutionError extends DatabaseError {
  constructor(
    message: string,
    public readonly context?: any
  ) {
    super(message, context);
    this.name = 'TransactionExecutionError';
  }
}

// Type aliases for common use cases
export type DatabaseResultSet<T> = DatabaseResult<T>;
export type QueryParameter = string | number | boolean | null | Date;
export type QueryParameters = readonly QueryParameter[];

// Utility types
export type DatabaseOperationResult<T> = {
  readonly success: boolean;
  readonly data?: T;
  readonly error?: string;
  readonly duration: number;
};

export type TransactionResult<T> = DatabaseOperationResult<readonly DatabaseResult<T>[]>;
export type SingleQueryResult<T> = DatabaseOperationResult<T | null>;

// Configuration validation types
export interface DatabaseConfigValidation {
  readonly isValid: boolean;
  readonly errors: readonly string[];
  readonly warnings: readonly string[];
}

// Connection state types
export enum ConnectionState {
  DISCONNECTED = 'disconnected',
  CONNECTING = 'connecting',
  CONNECTED = 'connected',
  ERROR = 'error'
}

export interface ConnectionInfo {
  readonly state: ConnectionState;
  readonly host: string;
  readonly port: number;
  readonly database: string;
  readonly connectedAt?: Date;
  readonly lastError?: string;
}

// Pagination types
export interface PaginationOptions {
  readonly limit: number;
  readonly offset: number;
}

export interface PaginatedResult<T> {
  readonly data: readonly T[];
  readonly total: number;
  readonly limit: number;
  readonly offset: number;
  readonly hasMore: boolean;
}
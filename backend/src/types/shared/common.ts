import { ObjectId } from 'mongodb';

/**
 * Common identifier type using MongoDB ObjectId
 */
export type Id = ObjectId;

/**
 * Generic result type for operations that can succeed or fail
 */
export type Result<T, E = Error> = {
  readonly isSuccess: boolean;
  readonly isFailure: boolean;
  readonly value?: T;
  readonly error?: E;
};

/**
 * Success result
 */
export const Success = <T>(value: T): Result<T> => ({
  isSuccess: true,
  isFailure: false,
  value
});

/**
 * Failure result
 */
export const Failure = <T, E = Error>(error: E): Result<T, E> => ({
  isSuccess: false,
  isFailure: true,
  error
});

/**
 * Optional type for values that may not exist
 */
export type Optional<T> = T | null | undefined;

/**
 * Pagination parameters
 */
export interface PaginationParams {
  readonly page: number;
  readonly limit: number;
  readonly offset?: number;
}

/**
 * Paginated result
 */
export interface PaginatedResult<T> {
  readonly items: readonly T[];
  readonly totalCount: number;
  readonly page: number;
  readonly limit: number;
  readonly totalPages: number;
  readonly hasNext: boolean;
  readonly hasPrevious: boolean;
}

/**
 * Sort parameters
 */
export interface SortParams {
  readonly field: string;
  readonly direction: 'asc' | 'desc';
}

/**
 * Filter parameters
 */
export interface FilterParams {
  readonly [key: string]: any;
}

/**
 * Query parameters combining pagination, sorting, and filtering
 */
export interface QueryParams {
  readonly pagination?: PaginationParams;
  readonly sort?: SortParams[];
  readonly filters?: FilterParams;
  readonly search?: string;
}

/**
 * Base audit fields for entities
 */
export interface AuditFields {
  readonly createdAt: Date;
  readonly updatedAt: Date;
  readonly createdBy?: Id;
  readonly updatedBy?: Id;
}

/**
 * Soft delete fields
 */
export interface SoftDeleteFields {
  readonly isDeleted: boolean;
  readonly deletedAt?: Date;
  readonly deletedBy?: Id;
}

/**
 * Version field for optimistic concurrency control
 */
export interface VersionField {
  readonly version: number;
}

/**
 * Base entity interface
 */
export interface BaseEntity extends AuditFields, SoftDeleteFields, VersionField {
  readonly id: Id;
}

/**
 * Validation result
 */
export interface ValidationResult {
  readonly isValid: boolean;
  readonly errors: readonly ValidationError[];
}

/**
 * Validation error
 */
export interface ValidationError {
  readonly field: string;
  readonly message: string;
  readonly code: string;
  readonly value?: any;
}

/**
 * Success validation result
 */
export const ValidationSuccess: ValidationResult = {
  isValid: true,
  errors: []
};

/**
 * Creates a validation failure result
 */
export const ValidationFailure = (errors: ValidationError[]): ValidationResult => ({
  isValid: false,
  errors
});

/**
 * HTTP status codes commonly used in the application
 */
export enum HttpStatus {
  OK = 200,
  CREATED = 201,
  NO_CONTENT = 204,
  BAD_REQUEST = 400,
  UNAUTHORIZED = 401,
  FORBIDDEN = 403,
  NOT_FOUND = 404,
  CONFLICT = 409,
  UNPROCESSABLE_ENTITY = 422,
  INTERNAL_SERVER_ERROR = 500,
  SERVICE_UNAVAILABLE = 503
}

/**
 * Log levels
 */
export enum LogLevel {
  DEBUG = 'debug',
  INFO = 'info',
  WARN = 'warn',
  ERROR = 'error',
  FATAL = 'fatal'
}

/**
 * Environment types
 */
export enum Environment {
  DEVELOPMENT = 'development',
  STAGING = 'staging',
  PRODUCTION = 'production',
  TEST = 'test'
}

/**
 * Generic factory interface
 */
export interface Factory<T> {
  create(...args: any[]): T;
}

/**
 * Generic repository interface
 */
export interface Repository<T extends BaseEntity> {
  findById(id: Id): Promise<Optional<T>>;
  findAll(params?: QueryParams): Promise<PaginatedResult<T>>;
  save(entity: T): Promise<T>;
  delete(id: Id): Promise<void>;
  exists(id: Id): Promise<boolean>;
}

/**
 * Unit of work interface for transaction management
 */
export interface UnitOfWork {
  begin(): Promise<void>;
  commit(): Promise<void>;
  rollback(): Promise<void>;
  isActive(): boolean;
}

/**
 * Event handler interface
 */
export interface EventHandler<T = any> {
  handle(event: T): Promise<void>;
}

/**
 * Command handler interface
 */
export interface CommandHandler<TCommand, TResult = void> {
  handle(command: TCommand): Promise<TResult>;
}

/**
 * Query handler interface
 */
export interface QueryHandler<TQuery, TResult> {
  handle(query: TQuery): Promise<TResult>;
}

/**
 * Mapper interface for converting between different representations
 */
export interface Mapper<TDomain, TDto> {
  toDto(domain: TDomain): TDto;
  toDomain(dto: TDto): TDomain;
}

/**
 * Configuration interface
 */
export interface Config {
  readonly [key: string]: any;
}

/**
 * Health check result
 */
export interface HealthCheckResult {
  readonly name: string;
  readonly status: 'healthy' | 'unhealthy' | 'degraded';
  readonly details?: Record<string, any>;
  readonly duration?: number;
  readonly timestamp: Date;
}

/**
 * Metrics interface
 */
export interface Metrics {
  increment(name: string, value?: number, tags?: Record<string, string>): void;
  gauge(name: string, value: number, tags?: Record<string, string>): void;
  histogram(name: string, value: number, tags?: Record<string, string>): void;
  timing(name: string, value: number, tags?: Record<string, string>): void;
}
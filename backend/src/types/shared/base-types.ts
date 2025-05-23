import { ObjectId } from 'mongodb';
import { ApplicationContext, UserRole, Permission } from './enums/common';

/**
 * Base aggregate root interface
 */
export interface IAggregateRoot<TId extends ObjectId = ObjectId> {
  readonly id: TId;
  readonly version: number;
  readonly domainEvents: readonly IDomainEvent[];
  clearDomainEvents(): void;
  incrementVersion(): void;
}

/**
 * Base entity interface
 */
export interface IEntity<TId extends ObjectId = ObjectId> {
  readonly id: TId;
  readonly createdAt: Date;
  readonly updatedAt: Date;
  readonly isDeleted: boolean;
  equals(other: IEntity<TId>): boolean;
  hashCode(): string;
}

/**
 * Base value object interface
 */
export interface IValueObject {
  equals(other: IValueObject): boolean;
  hashCode(): string;
  toJSON(): Record<string, any>;
}

/**
 * Base domain event interface
 */
export interface IDomainEvent {
  readonly eventId: ObjectId;
  readonly eventType: string;
  readonly occurredOn: Date;
  readonly eventVersion: number;
  readonly aggregateId: ObjectId;
  readonly aggregateType: string;
  readonly contextName: string;
  readonly eventData: Record<string, any>;
  readonly metadata: Record<string, any>;
}

/**
 * Integration event interface for cross-context communication
 */
export interface IIntegrationEvent extends IDomainEvent {
  readonly sourceContext: ApplicationContext;
  readonly targetContexts: readonly ApplicationContext[];
  readonly correlationId: string;
  readonly causationId?: string;
}

/**
 * Command interface
 */
export interface ICommand {
  readonly commandId: ObjectId;
  readonly timestamp: Date;
  readonly userId?: ObjectId;
  readonly correlationId?: string;
  readonly metadata?: Record<string, any>;
}

/**
 * Query interface
 */
export interface IQuery {
  readonly queryId: ObjectId;
  readonly timestamp: Date;
  readonly userId?: ObjectId;
  readonly correlationId?: string;
  readonly metadata?: Record<string, any>;
}

/**
 * Command handler interface
 */
export interface ICommandHandler<TCommand extends ICommand, TResult = void> {
  handle(command: TCommand): Promise<TResult>;
}

/**
 * Query handler interface
 */
export interface IQueryHandler<TQuery extends IQuery, TResult> {
  handle(query: TQuery): Promise<TResult>;
}

/**
 * Event handler interface
 */
export interface IEventHandler<TEvent extends IDomainEvent> {
  handle(event: TEvent): Promise<void>;
}

/**
 * Domain service interface
 */
export interface IDomainService {
  readonly serviceName: string;
}

/**
 * Repository interface
 */
export interface IRepository<TEntity extends IEntity, TId extends ObjectId = ObjectId> {
  findById(id: TId): Promise<TEntity | null>;
  findByIds(ids: readonly TId[]): Promise<readonly TEntity[]>;
  save(entity: TEntity): Promise<TEntity>;
  delete(id: TId): Promise<void>;
  exists(id: TId): Promise<boolean>;
}

/**
 * Unit of work interface
 */
export interface IUnitOfWork {
  begin(): Promise<void>;
  commit(): Promise<void>;
  rollback(): Promise<void>;
  isActive(): boolean;
  registerNew<T extends IEntity>(entity: T): void;
  registerDirty<T extends IEntity>(entity: T): void;
  registerDeleted<T extends IEntity>(entity: T): void;
}

/**
 * Event store interface
 */
export interface IEventStore {
  append(streamId: string, events: readonly IDomainEvent[], expectedVersion: number): Promise<void>;
  getEvents(streamId: string, fromVersion?: number): Promise<readonly IDomainEvent[]>;
  getSnapshot<T>(streamId: string): Promise<T | null>;
  saveSnapshot<T>(streamId: string, snapshot: T, version: number): Promise<void>;
}

/**
 * Read model store interface
 */
export interface IReadModelStore<T> {
  get(id: string): Promise<T | null>;
  save(id: string, model: T): Promise<void>;
  delete(id: string): Promise<void>;
  query(criteria: QueryCriteria): Promise<readonly T[]>;
}

/**
 * Query criteria for read models
 */
export interface QueryCriteria {
  readonly filters?: Record<string, any>;
  readonly sort?: SortCriteria[];
  readonly pagination?: PaginationCriteria;
  readonly projection?: string[];
}

/**
 * Sort criteria
 */
export interface SortCriteria {
  readonly field: string;
  readonly direction: 'asc' | 'desc';
}

/**
 * Pagination criteria
 */
export interface PaginationCriteria {
  readonly page: number;
  readonly limit: number;
}

/**
 * Security context interface
 */
export interface ISecurityContext {
  readonly userId?: ObjectId;
  readonly organizationId?: ObjectId;
  readonly roles: readonly UserRole[];
  readonly permissions: readonly Permission[];
  readonly sessionId?: string;
  readonly ipAddress?: string;
  readonly userAgent?: string;
  hasRole(role: UserRole): boolean;
  hasPermission(permission: Permission): boolean;
  hasAnyRole(roles: readonly UserRole[]): boolean;
  hasAnyPermission(permissions: readonly Permission[]): boolean;
}

/**
 * Policy interface for authorization
 */
export interface IPolicy {
  readonly name: string;
  evaluate(context: ISecurityContext, resource?: any): Promise<boolean>;
}

/**
 * Policy enforcement point interface
 */
export interface IPolicyEnforcementPoint {
  enforce(policyName: string, context: ISecurityContext, resource?: any): Promise<boolean>;
  enforceAll(policyNames: readonly string[], context: ISecurityContext, resource?: any): Promise<boolean>;
  enforceAny(policyNames: readonly string[], context: ISecurityContext, resource?: any): Promise<boolean>;
}

/**
 * Cache interface
 */
export interface ICache {
  get<T>(key: string): Promise<T | null>;
  set<T>(key: string, value: T, ttl?: number): Promise<void>;
  delete(key: string): Promise<void>;
  exists(key: string): Promise<boolean>;
  clear(): Promise<void>;
  keys(pattern?: string): Promise<readonly string[]>;
}

/**
 * Logger interface
 */
export interface ILogger {
  debug(message: string, data?: any): void;
  info(message: string, data?: any): void;
  warn(message: string, data?: any): void;
  error(message: string, error?: Error, data?: any): void;
  fatal(message: string, error?: Error, data?: any): void;
}

/**
 * Metrics interface
 */
export interface IMetrics {
  increment(metric: string, value?: number, tags?: Record<string, string>): void;
  gauge(metric: string, value: number, tags?: Record<string, string>): void;
  histogram(metric: string, value: number, tags?: Record<string, string>): void;
  timing(metric: string, duration: number, tags?: Record<string, string>): void;
}

/**
 * Health check interface
 */
export interface IHealthCheck {
  readonly name: string;
  check(): Promise<HealthCheckResult>;
}

/**
 * Health check result
 */
export interface HealthCheckResult {
  readonly healthy: boolean;
  readonly message?: string;
  readonly details?: Record<string, any>;
  readonly duration: number;
}

/**
 * Configuration interface
 */
export interface IConfiguration {
  get<T = string>(key: string, defaultValue?: T): T;
  getNumber(key: string, defaultValue?: number): number;
  getBoolean(key: string, defaultValue?: boolean): boolean;
  has(key: string): boolean;
  getAll(): Record<string, any>;
}

/**
 * Middleware interface
 */
export interface IMiddleware<TContext = any> {
  readonly name: string;
  readonly priority: number;
  execute(context: TContext, next: () => Promise<void>): Promise<void>;
}

/**
 * Plugin interface
 */
export interface IPlugin {
  readonly name: string;
  readonly version: string;
  readonly dependencies: readonly string[];
  initialize(): Promise<void>;
  activate(): Promise<void>;
  deactivate(): Promise<void>;
  uninstall(): Promise<void>;
}

/**
 * Serializer interface
 */
export interface ISerializer {
  serialize<T>(data: T): string | Buffer;
  deserialize<T>(data: string | Buffer): T;
}

/**
 * Mapper interface
 */
export interface IMapper<TSource, TTarget> {
  map(source: TSource): TTarget;
  mapArray(sources: readonly TSource[]): readonly TTarget[];
}

/**
 * Specification interface for domain queries
 */
export interface ISpecification<T> {
  isSatisfiedBy(candidate: T): boolean;
  and(other: ISpecification<T>): ISpecification<T>;
  or(other: ISpecification<T>): ISpecification<T>;
  not(): ISpecification<T>;
}
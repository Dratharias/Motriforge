import { ObjectId } from 'mongodb';
import { Entity } from './Entity';
import { DomainEvent } from './DomainEvent';

/**
 * Base class for all aggregate roots in the domain.
 * Implements the Aggregate Root pattern from DDD.
 */
export abstract class AggregateRoot<TId extends ObjectId = ObjectId> extends Entity<TId> {
  private readonly _domainEvents: DomainEvent[] = [];
  private _version: number = 0;

  constructor(id: TId) {
    super(id);
  }

  /**
   * Gets the current version of the aggregate for optimistic concurrency control
   */
  get version(): number {
    return this._version;
  }

  /**
   * Sets the version of the aggregate (used by infrastructure)
   */
  set version(value: number) {
    this._version = value;
  }

  /**
   * Gets all uncommitted domain events
   */
  get domainEvents(): readonly DomainEvent[] {
    return Object.freeze([...this._domainEvents]);
  }

  /**
   * Adds a domain event to be published when the aggregate is persisted
   */
  protected addDomainEvent(event: DomainEvent): void {
    this._domainEvents.push(event);
  }

  /**
   * Removes a specific domain event
   */
  protected removeDomainEvent(event: DomainEvent): void {
    const index = this._domainEvents.indexOf(event);
    if (index > -1) {
      this._domainEvents.splice(index, 1);
    }
  }

  /**
   * Clears all uncommitted domain events
   * Called by infrastructure after events are published
   */
  public clearDomainEvents(): void {
    this._domainEvents.splice(0, this._domainEvents.length);
  }

  /**
   * Increments the version for optimistic concurrency control
   */
  public incrementVersion(): void {
    this._version++;
  }

  /**
   * Marks the aggregate as modified and increments version
   */
  protected markAsModified(): void {
    this.incrementVersion();
    this.touch();
  }

  /**
   * Abstract method to validate the aggregate's business rules
   */
  protected abstract validateBusinessRules(): void;

  /**
   * Ensures the aggregate is in a valid state
   */
  public validate(): void {
    this.validateBusinessRules();
  }
}
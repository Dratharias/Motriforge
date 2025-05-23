import { ObjectId } from 'mongodb';

/**
 * Base class for all entities in the domain.
 * Implements the Entity pattern from DDD with identity and lifecycle management.
 */
export abstract class Entity<TId extends ObjectId = ObjectId> {
  protected readonly _id: TId;
  protected _createdAt: Date;
  protected _updatedAt: Date;
  protected _isDeleted: boolean = false;

  constructor(id: TId) {
    this._id = id;
    this._createdAt = new Date();
    this._updatedAt = new Date();
  }

  /**
   * Gets the unique identifier of the entity
   */
  get id(): TId {
    return this._id;
  }

  /**
   * Gets the creation timestamp
   */
  get createdAt(): Date {
    return this._createdAt;
  }

  /**
   * Gets the last update timestamp
   */
  get updatedAt(): Date {
    return this._updatedAt;
  }

  /**
   * Gets whether the entity is marked as deleted
   */
  get isDeleted(): boolean {
    return this._isDeleted;
  }

  /**
   * Updates the timestamp to current time
   */
  protected touch(): void {
    this._updatedAt = new Date();
  }

  /**
   * Marks the entity as deleted (soft delete)
   */
  public markAsDeleted(): void {
    this._isDeleted = true;
    this.touch();
  }

  /**
   * Restores a soft-deleted entity
   */
  public restore(): void {
    this._isDeleted = false;
    this.touch();
  }

  /**
   * Checks equality with another entity based on identity
   */
  public equals(other: Entity<TId>): boolean {
    if (!(other instanceof Entity)) {
      return false;
    }

    if (this === other) {
      return true;
    }

    return this._id.equals(other._id);
  }

  /**
   * Gets the hash code for the entity
   */
  public hashCode(): string {
    return this._id.toHexString();
  }

  /**
   * Returns a string representation of the entity
   */
  public toString(): string {
    return `${this.constructor.name}(${this._id.toHexString()})`;
  }

  /**
   * Converts entity to a plain object for serialization
   */
  public toJSON(): Record<string, any> {
    return {
      id: this._id.toHexString(),
      createdAt: this._createdAt,
      updatedAt: this._updatedAt,
      isDeleted: this._isDeleted
    };
  }

  /**
   * Sets creation timestamp (used during hydration from persistence)
   */
  public setCreatedAt(date: Date): void {
    this._createdAt = date;
  }

  /**
   * Sets update timestamp (used during hydration from persistence)
   */
  public setUpdatedAt(date: Date): void {
    this._updatedAt = date;
  }

  /**
   * Sets deleted flag (used during hydration from persistence)
   */
  public setIsDeleted(isDeleted: boolean): void {
    this._isDeleted = isDeleted;
  }
}
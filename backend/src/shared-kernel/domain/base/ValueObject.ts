/**
 * Base class for all value objects in the domain.
 * Implements the Value Object pattern from DDD with immutability and value equality.
 */
export abstract class ValueObject {
  /**
   * Compares this value object with another for equality
   * Value objects are equal when all their components are equal
   */
  public equals(other: ValueObject): boolean {
    if (other === null || other === undefined) {
      return false;
    }

    if (this === other) {
      return true;
    }

    if (this.constructor !== other.constructor) {
      return false;
    }

    return this.equalityComponents().every((component, index) => {
      const otherComponent = other.equalityComponents()[index];
      return this.isEqual(component, otherComponent);
    });
  }

  /**
   * Deep equality check for components
   */
  private isEqual(a: any, b: any): boolean {
    if (a === b) {
      return true;
    }

    if (a === null || a === undefined || b === null || b === undefined) {
      return a === b;
    }

    if (Array.isArray(a) && Array.isArray(b)) {
      if (a.length !== b.length) {
        return false;
      }
      return a.every((item, index) => this.isEqual(item, b[index]));
    }

    if (typeof a === 'object' && typeof b === 'object') {
      const aKeys = Object.keys(a);
      const bKeys = Object.keys(b);
      
      if (aKeys.length !== bKeys.length) {
        return false;
      }
      
      return aKeys.every(key => this.isEqual(a[key], b[key]));
    }

    return false;
  }

  /**
   * Returns the components that participate in equality comparison
   * Subclasses must implement this method
   */
  protected abstract equalityComponents(): ReadonlyArray<any>;

  /**
   * Returns a hash code for the value object
   */
  public hashCode(): string {
    const components = this.equalityComponents();
    const hash = components
      .map(component => this.getComponentHash(component))
      .join('|');
    
    return btoa(hash); // Base64 encode for consistent hash
  }

  /**
   * Gets hash for a single component
   */
  private getComponentHash(component: any): string {
    if (component === null || component === undefined) {
      return 'null';
    }

    if (Array.isArray(component)) {
      return `[${component.map(item => this.getComponentHash(item)).join(',')}]`;
    }

    if (typeof component === 'object') {
      const keys = Object.keys(component).sort((a, b) => a.localeCompare(b));
      const pairs = keys.map(key => `${key}:${this.getComponentHash(component[key])}`);
      return `{${pairs.join(',')}}`;
    }

    return String(component);
  }

  /**
   * Returns a string representation of the value object
   */
  public toString(): string {
    const components = this.equalityComponents();
    const componentStrings = components.map(c => 
      c === null || c === undefined ? 'null' : String(c)
    );
    return `${this.constructor.name}(${componentStrings.join(', ')})`;
  }

  /**
   * Converts the value object to a plain object for serialization
   */
  public abstract toJSON(): Record<string, any>;

  /**
   * Validates the value object's business rules
   * Should throw an error if the value object is invalid
   */
  protected abstract validate(): void;

  /**
   * Creates a new instance by copying this value object
   * Subclasses should override this for proper cloning
   */
  public abstract clone(): ValueObject;
}
import { ValidationResult, PropertyDefinition } from "@/types/events/schema";

/**
 * Schema for validating event payloads
 */
export class EventSchema {
  public readonly properties: Record<string, PropertyDefinition>;
  public readonly required: string[];
  public readonly description?: string;

  constructor(data: {
    properties: Record<string, PropertyDefinition>;
    required?: string[];
    description?: string;
  }) {
    this.properties = { ...data.properties };
    this.required = data.required ? [...data.required] : [];
    this.description = data.description;
  }

  /**
   * Validates a payload against this schema
   * 
   * @param payload The payload to validate
   * @returns Validation result with errors if invalid
   */
  public validate(payload: any): ValidationResult {
    if (!payload || typeof payload !== 'object') {
      return {
        valid: false,
        errors: ['Payload must be an object']
      };
    }

    const errors: string[] = [];

    // Check required properties
    for (const requiredProp of this.required) {
      if (!(requiredProp in payload)) {
        errors.push(`Missing required property: ${requiredProp}`);
      }
    }

    // Validate property types and constraints
    for (const [propName, propValue] of Object.entries(payload)) {
      const propDef = this.properties[propName];
      
      // Skip validation for properties not defined in schema
      if (!propDef) continue;

      const propErrors = this.validateProperty(propName, propValue, propDef);
      errors.push(...propErrors);
    }

    return {
      valid: errors.length === 0,
      errors: errors.length > 0 ? errors : undefined
    };
  }

  /**
   * Gets the definition for a specific property
   * 
   * @param name Property name
   * @returns Property definition or null if not found
   */
  public getPropertyDefinition(name: string): PropertyDefinition | null {
    return this.properties[name] || null;
  }

  /**
   * Checks if a property is defined in this schema
   * 
   * @param name Property name
   * @returns True if the property is defined
   */
  public hasProperty(name: string): boolean {
    return name in this.properties;
  }

  /**
   * Validates a specific property against its definition
   * 
   * @param propName The property name
   * @param value The property value
   * @param definition The property definition
   * @returns Array of validation errors (empty if valid)
   */
  private validateProperty(
    propName: string,
    value: any,
    definition: PropertyDefinition
  ): string[] {
    // Handle null values first
    if (value === null) {
      return this.validateNullValue(propName, definition);
    }
    
    // Validate based on type
    switch (definition.type) {
      case 'string':
        return this.validateStringProperty(propName, value, definition);
      case 'number':
        return this.validateNumberProperty(propName, value, definition);
      case 'boolean':
        return this.validateBooleanProperty(propName, value, definition);
      case 'object':
        return this.validateObjectProperty(propName, value, definition);
      case 'array':
        return this.validateArrayProperty(propName, value, definition);
      case 'any':
        return []; // No validation needed for 'any' type
      default:
        return [`Unknown type ${definition.type} for property ${propName}`];
    }
  }
  
  /**
   * Validates a null value
   */
  private validateNullValue(propName: string, definition: PropertyDefinition): string[] {
    if (definition.type !== 'null' && definition.type !== 'any') {
      return [`Property ${propName} must not be null`];
    }
    return [];
  }
  
  /**
   * Validates a string property
   */
  private validateStringProperty(propName: string, value: any, definition: PropertyDefinition): string[] {
    const errors: string[] = [];
    
    if (typeof value !== 'string') {
      errors.push(`Property ${propName} must be a string`);
      return errors; // Return early on type mismatch
    }
    
    // Length validations
    this.validateStringLength(propName, value, definition, errors);
    
    // Pattern validation
    this.validateStringPattern(propName, value, definition, errors);
    
    // Format validations
    this.validateStringFormat(propName, value, definition, errors);
    
    // Enum validation
    this.validateEnum(propName, value, definition, errors);
    
    return errors;
  }
  
  /**
   * Validates string length constraints
   */
  private validateStringLength(
    propName: string,
    value: string,
    definition: PropertyDefinition,
    errors: string[]
  ): void {
    if (definition.minLength !== undefined && value.length < definition.minLength) {
      errors.push(`Property ${propName} must be at least ${definition.minLength} characters`);
    }
    
    if (definition.maxLength !== undefined && value.length > definition.maxLength) {
      errors.push(`Property ${propName} must be at most ${definition.maxLength} characters`);
    }
  }
  
  /**
   * Validates string pattern constraints
   */
  private validateStringPattern(
    propName: string,
    value: string,
    definition: PropertyDefinition,
    errors: string[]
  ): void {
    if (definition.pattern !== undefined) {
      const regex = new RegExp(definition.pattern);
      if (!regex.test(value)) {
        errors.push(`Property ${propName} must match pattern ${definition.pattern}`);
      }
    }
  }
  
  /**
   * Validates string format constraints
   */
  private validateStringFormat(
    propName: string,
    value: string,
    definition: PropertyDefinition,
    errors: string[]
  ): void {
    if (definition.format === 'email') {
      // Simple email validation
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(value)) {
        errors.push(`Property ${propName} must be a valid email address`);
      }
    }
  }
  
  /**
   * Validates a number property
   */
  private validateNumberProperty(propName: string, value: any, definition: PropertyDefinition): string[] {
    const errors: string[] = [];
    
    if (typeof value !== 'number' || isNaN(value)) {
      errors.push(`Property ${propName} must be a number`);
      return errors; // Return early on type mismatch
    }
    
    // Range validations
    this.validateNumberRange(propName, value, definition, errors);
    
    // Enum validation
    this.validateEnum(propName, value, definition, errors);
    
    return errors;
  }
  
  /**
   * Validates number range constraints
   */
  private validateNumberRange(
    propName: string,
    value: number,
    definition: PropertyDefinition,
    errors: string[]
  ): void {
    if (definition.minimum !== undefined && value < definition.minimum) {
      errors.push(`Property ${propName} must be at least ${definition.minimum}`);
    }
    
    if (definition.maximum !== undefined && value > definition.maximum) {
      errors.push(`Property ${propName} must be at most ${definition.maximum}`);
    }
  }
  
  /**
   * Validates a boolean property
   */
  private validateBooleanProperty(propName: string, value: any, definition: PropertyDefinition): string[] {
    if (typeof value !== 'boolean') {
      return [`Property ${propName} must be a boolean`];
    }
    return [];
  }
  
  /**
   * Validates an object property
   */
  private validateObjectProperty(propName: string, value: any, definition: PropertyDefinition): string[] {
    const errors: string[] = [];
    
    if (typeof value !== 'object' || Array.isArray(value)) {
      errors.push(`Property ${propName} must be an object`);
      return errors; // Return early on type mismatch
    }
    
    if (!definition.properties) {
      return errors; // No nested properties to validate
    }
    
    return this.validateObjectProperties(propName, value, definition);
  }
  
  /**
   * Validates nested object properties
   */
  private validateObjectProperties(
    parentPropName: string,
    object: Record<string, any>,
    definition: PropertyDefinition
  ): string[] {
    const errors: string[] = [];
    const properties = definition.properties || {};
    
    for (const [nestedPropName, nestedPropDef] of Object.entries(properties)) {
      const fullPropName = `${parentPropName}.${nestedPropName}`;
      
      // Check required properties
      if (nestedPropDef.required && !(nestedPropName in object)) {
        errors.push(`Property ${fullPropName} is required`);
        continue;
      }
      
      // Validate property if it exists
      if (nestedPropName in object) {
        const nestedErrors = this.validateProperty(
          fullPropName,
          object[nestedPropName],
          nestedPropDef
        );
        errors.push(...nestedErrors);
      }
    }
    
    return errors;
  }
  
  /**
   * Validates an array property
   */
  private validateArrayProperty(propName: string, value: any, definition: PropertyDefinition): string[] {
    const errors: string[] = [];
    
    if (!Array.isArray(value)) {
      errors.push(`Property ${propName} must be an array`);
      return errors; // Return early on type mismatch
    }
    
    if (!definition.items) {
      return errors; // No item definition to validate against
    }
    
    // Validate each array item
    return this.validateArrayItems(propName, value, definition);
  }
  
  /**
   * Validates individual array items
   */
  private validateArrayItems(
    propName: string,
    array: any[],
    definition: PropertyDefinition
  ): string[] {
    const errors: string[] = [];
    const itemDefinition = definition.items;
    
    if (!itemDefinition) {
      return errors;
    }
    
    for (let i = 0; i < array.length; i++) {
      const itemPropName = `${propName}[${i}]`;
      const itemErrors = this.validateProperty(
        itemPropName,
        array[i],
        itemDefinition
      );
      errors.push(...itemErrors);
    }
    
    return errors;
  }
  
  /**
   * Validates enum constraints
   */
  private validateEnum(
    propName: string,
    value: any,
    definition: PropertyDefinition,
    errors: string[]
  ): void {
    if (definition.enum && !definition.enum.includes(value)) {
      errors.push(`Property ${propName} must be one of: ${definition.enum.join(', ')}`);
    }
  }
}
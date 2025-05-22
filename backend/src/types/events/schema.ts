/**
 * Result of validating an event payload against a schema
 */
export interface ValidationResult {
  valid: boolean;
  errors?: string[];
}

/**
 * Defines a property in an event schema
 */
export interface PropertyDefinition {
  type: 'string' | 'number' | 'boolean' | 'object' | 'array' | 'null' | 'any';
  format?: string;
  required?: boolean;
  description?: string;
  enum?: any[];
  properties?: Record<string, PropertyDefinition>;
  items?: PropertyDefinition;
  minLength?: number;
  maxLength?: number;
  minimum?: number;
  maximum?: number;
  pattern?: string;
}
import { EventTypeDefinition, ValidationResult } from "@/types/events";
import { LoggerFacade } from "../logging";
import { EventSchema } from "./EventSchema";


/**
 * Registry for event types and schemas
 */
export class EventRegistry {
  private readonly eventTypes: Map<string, EventTypeDefinition> = new Map();
  private readonly eventSchemas: Map<string, EventSchema> = new Map();
  private readonly eventGroups: Map<string, Set<string>> = new Map();
  private readonly logger: LoggerFacade;

  constructor(logger: LoggerFacade) {
    this.logger = logger.withComponent('EventRegistry');
  }

  /**
   * Register a new event type
   * 
   * @param name Event type name
   * @param definition Event type definition
   * @throws Error if definition is invalid or event type already exists
   */
  public registerEventType(name: string, definition: EventTypeDefinition): void {
    if (this.eventTypes.has(name)) {
      throw new Error(`Event type ${name} is already registered`);
    }
    
    if (!this.validateEventTypeDefinition(definition)) {
      throw new Error(`Invalid event type definition for ${name}`);
    }
    
    // Store the event type definition
    this.eventTypes.set(name, {
      ...definition,
      name // Ensure name consistency
    });
    
    // Store the event schema for easier lookup
    this.eventSchemas.set(name, definition.schema);
    
    // Register event groups
    for (const group of definition.groups) {
      if (!this.eventGroups.has(group)) {
        this.eventGroups.set(group, new Set<string>());
      }
      
      this.eventGroups.get(group)?.add(name);
    }
    
    this.logger.debug(`Registered event type: ${name}`, {
      eventType: name,
      groups: definition.groups,
      version: definition.version,
      deprecated: definition.deprecated || false
    });
  }

  /**
   * Register an event group
   * 
   * @param groupName Name of the group
   * @param eventTypes Event types to include in the group
   */
  public registerEventGroup(groupName: string, eventTypes: string[]): void {
    if (!this.eventGroups.has(groupName)) {
      this.eventGroups.set(groupName, new Set<string>());
    }
    
    const group = this.eventGroups.get(groupName)!;
    
    for (const eventType of eventTypes) {
      if (this.eventTypes.has(eventType)) {
        group.add(eventType);
      } else {
        this.logger.warn(`Cannot add unregistered event type ${eventType} to group ${groupName}`);
      }
    }
    
    this.logger.debug(`Registered event group: ${groupName}`, {
      group: groupName,
      eventTypes: Array.from(group)
    });
  }

  /**
   * Get an event type definition
   * 
   * @param name Event type name
   * @returns Event type definition or null if not found
   */
  public getEventType(name: string): EventTypeDefinition | null {
    return this.eventTypes.get(name) || null;
  }

  /**
   * Get an event schema
   * 
   * @param name Event type name
   * @returns Event schema or null if not found
   */
  public getEventSchema(name: string): EventSchema | null {
    return this.eventSchemas.get(name) || null;
  }

  /**
   * Validate an event payload against its schema
   * 
   * @param event The event to validate
   * @returns Validation result
   */
  public validateEvent(event: any): ValidationResult {
    if (!event?.type) {
      return {
        valid: false,
        errors: ['Invalid event format: missing type']
      };
    }
    
    const schema = this.getEventSchema(event.type);
    
    if (!schema) {
      return {
        valid: false,
        errors: [`Unknown event type: ${event.type}`]
      };
    }
    
    return schema.validate(event.payload);
  }

  /**
   * Get all event types in a group
   * 
   * @param groupName Name of the group
   * @returns Array of event types in the group
   */
  public getEventsByGroup(groupName: string): string[] {
    return Array.from(this.eventGroups.get(groupName) || []);
  }

  /**
   * Get all registered event types
   * 
   * @returns Array of all event type definitions
   */
  public getAllEventTypes(): EventTypeDefinition[] {
    return Array.from(this.eventTypes.values());
  }

  /**
   * Check if an event type is registered
   * 
   * @param name Event type name
   * @returns True if the event type is registered
   */
  public hasEventType(name: string): boolean {
    return this.eventTypes.has(name);
  }

  /**
   * Check if a group is registered
   * 
   * @param name Group name
   * @returns True if the group is registered
   */
  public hasGroup(name: string): boolean {
    return this.eventGroups.has(name);
  }

  /**
   * Validate an event type definition
   * 
   * @param definition Event type definition to validate
   * @returns True if valid, false otherwise
   */
  private validateEventTypeDefinition(definition: EventTypeDefinition): boolean {
    // Check required fields
    if (!definition.name || !definition.schema) {
      return false;
    }
    
    // Ensure groups is an array
    if (!Array.isArray(definition.groups)) {
      return false;
    }
    
    // Ensure metadata is an object
    if (definition.metadata && typeof definition.metadata !== 'object') {
      return false;
    }
    
    // Validate version format (semver-like)
    if (definition.version && !/^\d+\.\d+(\.\d+)?$/.test(definition.version)) {
      return false;
    }
    
    return true;
  }
}

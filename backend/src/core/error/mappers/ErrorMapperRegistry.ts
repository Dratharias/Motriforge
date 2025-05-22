import { ErrorMapper } from "@/types/errors";

/**
 * Registry that manages error mappers and provides methods to retrieve
 * the appropriate mapper for a given error.
 */
export class ErrorMapperRegistry {
  private readonly mappers: Map<string, ErrorMapper>;
  private readonly priorityMappers: ErrorMapper[];
  private defaultMapper: ErrorMapper;
  
  constructor(defaultMapper: ErrorMapper) {
    this.mappers = new Map<string, ErrorMapper>();
    this.priorityMappers = [];
    this.defaultMapper = defaultMapper;
  }
  
  /**
   * Register a mapper for a specific error type
   * 
   * @param errorType - Name of the error type (e.g., 'ValidationError')
   * @param mapper - Mapper for this error type
   */
  public registerMapper(errorType: string, mapper: ErrorMapper): void {
    this.mappers.set(errorType, mapper);
  }
  
  /**
   * Register a priority mapper that can map multiple error types
   * 
   * @param mapper - Priority mapper
   */
  public registerPriorityMapper(mapper: ErrorMapper): void {
    this.priorityMappers.push(mapper);
    this.sortPriorityMappers();
  }
  
  /**
   * Set the default mapper to use when no specific mapper is found
   * 
   * @param mapper - Default error mapper
   */
  public setDefaultMapper(mapper: ErrorMapper): void {
    this.defaultMapper = mapper;
  }
  
  /**
   * Get the appropriate mapper for a given error
   * 
   * @param error - Error to find mapper for
   * @returns The most appropriate error mapper
   */
  public getMapper(error: Error): ErrorMapper {
    // First check for a priority mapper that can map this error
    const priorityMapper = this.findMatchingMapper(error);
    if (priorityMapper) {
      return priorityMapper;
    }
    
    // Then check for a mapper registered for this error type
    const errorType = error.constructor.name;
    const mapper = this.mappers.get(errorType);
    
    if (mapper) {
      return mapper;
    }
    
    return this.defaultMapper;
  }
  
  /**
   * Get all registered mappers
   * 
   * @returns All error mappers
   */
  public getAllMappers(): ErrorMapper[] {
    return [
      ...this.priorityMappers,
      ...Array.from(this.mappers.values()),
      this.defaultMapper
    ];
  }
  
  /**
   * Get mapper for a specific error type
   * 
   * @param errorType - Name of the error type
   * @returns Mapper for the specified error type, or null if not found
   */
  public getMapperForType(errorType: string): ErrorMapper | null {
    return this.mappers.get(errorType) || null;
  }
  
  /**
   * Find a priority mapper that can map the given error
   * 
   * @param error - Error to find mapper for
   * @returns Matching mapper or null if none found
   */
  private findMatchingMapper(error: Error): ErrorMapper | null {
    for (const mapper of this.priorityMappers) {
      if (mapper.canMap(error)) {
        return mapper;
      }
    }
    return null;
  }
  
  /**
   * Sort priority mappers by priority (highest first)
   */
  private sortPriorityMappers(): void {
    this.priorityMappers.sort((a, b) => b.getPriority() - a.getPriority());
  }
}
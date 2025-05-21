import { ApiError } from './ApiError';

/**
 * Interface for error mappers that convert domain/application errors
 * to standardized API error responses.
 */
export interface ErrorMapper {
  /**
   * Maps an error to a standardized API error
   * 
   * @param error - The error to map
   * @returns Standardized API error response
   */
  map(error: Error): ApiError;
  
  /**
   * Determines if this mapper can map the given error
   * 
   * @param error - The error to check
   * @returns True if this mapper can map the error
   */
  canMap(error: Error): boolean;
  
  /**
   * Gets the priority of this mapper
   * Higher priority mappers are checked first when multiple mappers can map an error
   * 
   * @returns Priority value (higher is higher priority)
   */
  getPriority(): number;
}
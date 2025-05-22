import { ApiError } from "@/core/error/ApiError";
import { FormattedError } from "@/core/error/FormattedError";

/**
 * Interface for error formatters that convert errors or API errors
 * to specific representation formats (e.g., JSON, HTML).
 */
export interface ErrorFormatter {
  /**
   * Format an error into a specific representation format
   * 
   * @param error - The error or API error to format
   * @returns Formatted error representation
   */
  format(error: Error | ApiError): FormattedError;
  
  /**
   * Gets the formats supported by this formatter (e.g., 'json', 'html')
   * 
   * @returns Array of supported format identifiers
   */
  getSupportedFormats(): string[];
}

/**
 * Configuration options for the JsonErrorFormatter
 */
export interface JsonErrorFormatterConfig {
  includeStack?: boolean;
  masks?: Record<string, boolean>;
  prettyPrint?: boolean;
}
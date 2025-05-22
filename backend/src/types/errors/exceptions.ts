/**
 * Represents a field-level validation error detail
 */
export interface ValidationErrorDetail {
  field: string;
  message: string;
  constraint?: string;
}
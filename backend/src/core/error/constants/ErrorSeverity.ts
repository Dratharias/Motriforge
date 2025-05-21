/**
 * Enumeration of error severity levels used for logging and monitoring.
 */
export enum ErrorSeverity {
  /**
   * Debug-level issue, typically not important in production
   */
  DEBUG = "debug",
  
  /**
   * Informational issue, may be relevant for monitoring
   */
  INFO = "info",
  
  /**
   * Warning condition, potential issue but not an error
   */
  WARNING = "warning",
  
  /**
   * Error condition, something has failed
   */
  ERROR = "error",
  
  /**
   * Critical error, requires immediate attention
   */
  CRITICAL = "critical",
  
  /**
   * Fatal error, causes system or component to terminate
   */
  FATAL = "fatal"
}
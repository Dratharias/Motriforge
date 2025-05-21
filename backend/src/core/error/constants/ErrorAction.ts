/**
 * Enumeration of actions that can be taken in response to an error.
 */
export enum ErrorAction {
  /**
   * Continue normal processing despite the error
   */
  CONTINUE = "continue",
  
  /**
   * Retry the operation that caused the error
   */
  RETRY = "retry",
  
  /**
   * Redirect to another page or URL
   */
  REDIRECT = "redirect",
  
  /**
   * Notify the user about the error
   */
  NOTIFY = "notify",
  
  /**
   * Terminate the application or process
   */
  TERMINATE = "terminate"
}
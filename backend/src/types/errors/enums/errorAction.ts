/**
 * Enumeration of actions that can be taken in response to an error.
 */
export enum ErrorAction {
  CONTINUE = "continue",
  RETRY = "retry",
  REDIRECT = "redirect",
  NOTIFY = "notify",
  TERMINATE = "terminate"
}
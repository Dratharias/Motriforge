/**
 * Represents an error formatted for a specific output medium
 * (e.g., JSON for API responses, HTML for web pages).
 */
export class FormattedError {
  /**
   * The formatted error content
   */
  content: string;
  
  /**
   * Content type of the formatted error (e.g., 'application/json', 'text/html')
   */
  contentType: string;
  
  /**
   * HTTP status code to use when returning this error
   */
  statusCode: number;
  
  constructor(content: string, contentType: string, statusCode: number) {
    this.content = content;
    this.contentType = contentType;
    this.statusCode = statusCode;
  }
}
import { ErrorFormatter } from '../ErrorFormatter';
import { FormattedError } from '../FormattedError';
import { ApiError } from '../ApiError';

export class HtmlErrorFormatter implements ErrorFormatter {
  private readonly templates: Map<number, string>;
  private readonly defaultTemplate: string;

  constructor(templates?: Map<number, string>, defaultTemplate?: string) {
    this.templates = templates ?? new Map();
    this.defaultTemplate = defaultTemplate ?? this.getDefaultTemplate();
  }

  public format(error: Error | ApiError): FormattedError {
    const apiError = this.isApiError(error) ? error : this.convertToApiError(error);
    const template = this.getTemplateForError(apiError);
    const content = this.renderTemplate(template, apiError);

    return {
      content,
      contentType: 'text/html',
      statusCode: apiError.statusCode
    };
  }

  public getSupportedFormats(): string[] {
    return ['html'];
  }

  private renderTemplate(template: string, data: any): string {
    let result = template;
    Object.entries(data).forEach(([key, value]) => {
      if (typeof value !== 'function') {
        const placeholder = new RegExp(`{{\\s*${key}\\s*}}`, 'g');
        result = result.replace(placeholder, String(value));
      }
    });
    return result;
  }

  private getTemplateForError(error: ApiError): string {
    return this.templates.get(error.statusCode) ?? this.defaultTemplate;
  }

  private isApiError(error: any): error is ApiError {
    return error && 'statusCode' in error && 'errorCode' in error;
  }

  private convertToApiError(error: Error): ApiError {
    return {
      errorCode: 'UNKNOWN_ERROR',
      message: error.message,
      statusCode: 500,
      timestamp: new Date(),
      toJSON: () => ({
        errorCode: 'UNKNOWN_ERROR',
        message: error.message,
        statusCode: 500,
        timestamp: new Date()
      })
    };
  }

  private getDefaultTemplate(): string {
    return `<!DOCTYPE html>
    <html>
    <head>
      <title>Error: {{statusCode}}</title>
      <style>
        body {
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
          padding: 2rem;
          max-width: 800px;
          margin: 0 auto;
          line-height: 1.5;
        }
        .error-container {
          border-left: 5px solid #f56565;
          padding: 1.5rem;
          background-color: #fff5f5;
          border-radius: 0.25rem;
        }
        .error-title {
          font-size: 1.5rem;
          color: #c53030;
          margin-top: 0;
        }
        .error-message {
          font-size: 1.2rem;
          color: #2d3748;
        }
        .error-code {
          font-family: monospace;
          background-color: #e2e8f0;
          padding: 0.25rem 0.5rem;
          border-radius: 0.25rem;
        }
        .timestamp {
          color: #718096;
          font-size: 0.875rem;
          margin-top: 1rem;
        }
      </style>
    </head>
    <body>
      <div class="error-container">
        <h1 class="error-title">Error {{statusCode}}</h1>
        <p class="error-message">{{message}}</p>
        <p>Error Code: <span class="error-code">{{errorCode}}</span></p>
        <p class="timestamp">{{timestamp}}</p>
      </div>
    </body>
    </html>`;
  }
}
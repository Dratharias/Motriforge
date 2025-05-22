import { ErrorFormatter } from "@/types/errors";

/**
 * Registry that manages error formatters and provides methods to retrieve
 * the appropriate formatter for a given format.
 */
export class ErrorFormatterRegistry {
  /**
   * Formatters mapped by format name (e.g., 'json', 'html')
   */
  private readonly formatters: Map<string, ErrorFormatter>;
  
  /**
   * Default formatter used when no specific formatter is found
   */
  private defaultFormatter: ErrorFormatter;
  
  constructor(defaultFormatter: ErrorFormatter) {
    this.formatters = new Map<string, ErrorFormatter>();
    this.defaultFormatter = defaultFormatter;
  }
  
  /**
   * Register a formatter for a specific format
   * 
   * @param format - Format name (e.g., 'json', 'html')
   * @param formatter - Formatter for this format
   */
  public registerFormatter(format: string, formatter: ErrorFormatter): void {
    this.formatters.set(format.toLowerCase(), formatter);
  }
  
  /**
   * Set the default formatter to use when no specific formatter is found
   * 
   * @param formatter - Default error formatter
   */
  public setDefaultFormatter(formatter: ErrorFormatter): void {
    this.defaultFormatter = formatter;
  }
  
  /**
   * Get the formatter for a specific format
   * 
   * @param format - Format name
   * @returns Formatter for the specified format or default formatter if not found
   */
  public getFormatter(format: string): ErrorFormatter {
    return this.formatters.get(format.toLowerCase()) ?? this.defaultFormatter;
  }
  
  /**
   * Get all registered formatters
   * 
   * @returns All error formatters
   */
  public getAllFormatters(): ErrorFormatter[] {
    return [
      ...Array.from(this.formatters.values()),
      this.defaultFormatter
    ];
  }
}
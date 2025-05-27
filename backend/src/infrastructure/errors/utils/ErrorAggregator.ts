import { BaseError } from '../base/BaseError';
import { ValidationError } from '../types/ValidationError';
import { Severity } from '../../../types/core/enums';

/**
 * Utility for aggregating and analyzing collections of errors
 */
export class ErrorAggregator {
  private readonly errors: BaseError[] = [];

  /**
   * Add an error to the aggregator
   */
  add(error: BaseError): void {
    this.errors.push(error);
  }

  /**
   * Add multiple errors to the aggregator
   */
  addAll(errors: readonly BaseError[]): void {
    this.errors.push(...errors);
  }

  /**
   * Get all errors
   */
  getAll(): readonly BaseError[] {
    return [...this.errors];
  }

  /**
   * Get errors by severity
   */
  getBySeverity(severity: Severity): readonly BaseError[] {
    return this.errors.filter(error => error.severity === severity);
  }

  /**
   * Get errors by type
   */
  getByType<T extends BaseError>(ctor: new (...args: any[]) => T): T[] {
    return this.errors.filter((e): e is T => e instanceof ctor);
  }

  /**
   * Get validation errors grouped by field
   */
  getValidationErrorsByField(): Record<string, ValidationError[]> {
    const validationErrors = this.getByType(ValidationError);
    const byField: Record<string, ValidationError[]> = {};
    
    for (const error of validationErrors) {
      if (!byField[error.field]) {
        byField[error.field] = [];
      }
      byField[error.field].push(error);
    }
    
    return byField;
  }

  /**
   * Check if aggregator has any critical errors
   */
  hasCriticalErrors(): boolean {
    return this.errors.some(error => error.severity === Severity.CRITICAL);
  }

  /**
   * Check if aggregator has errors above a certain severity
   */
  hasErrorsAboveSeverity(minSeverity: Severity): boolean {
    const severityOrder = [Severity.DEBUG, Severity.INFO, Severity.WARN, Severity.ERROR, Severity.CRITICAL];
    const minIndex = severityOrder.indexOf(minSeverity);
    
    return this.errors.some(error => {
      const errorIndex = severityOrder.indexOf(error.severity);
      return errorIndex >= minIndex;
    });
  }

  /**
   * Get error statistics
   */
  getStatistics(): {
    total: number;
    bySeverity: Record<Severity, number>;
    byCode: Record<string, number>;
    byUserId: Record<string, number>;
    timeRange: { earliest: Date; latest: Date } | null;
  } {
    if (this.errors.length === 0) {
      return {
        total: 0,
        bySeverity: {} as Record<Severity, number>,
        byCode: {},
        byUserId: {},
        timeRange: null
      };
    }

    const bySeverity = {} as Record<Severity, number>;
    const byCode: Record<string, number> = {};
    const byUserId: Record<string, number> = {};
    
    let earliest = this.errors[0].timestamp;
    let latest = this.errors[0].timestamp;

    for (const error of this.errors) {
      // Count by severity
      bySeverity[error.severity] = (bySeverity[error.severity] ?? 0) + 1;
      
      // Count by code
      byCode[error.code] = (byCode[error.code] ?? 0) + 1;
      
      // Count by user
      if (error.userId) {
        byUserId[error.userId] = (byUserId[error.userId] ?? 0) + 1;
      }
      
      // Track time range
      if (error.timestamp < earliest) {
        earliest = error.timestamp;
      }
      if (error.timestamp > latest) {
        latest = error.timestamp;
      }
    }

    return {
      total: this.errors.length,
      bySeverity,
      byCode,
      byUserId,
      timeRange: { earliest, latest }
    };
  }

  /**
   * Clear all errors
   */
  clear(): void {
    this.errors.length = 0;
  }

  /**
   * Get the most recent error
   */
  getMostRecent(): BaseError | null {
    if (this.errors.length === 0) {
      return null;
    }
  
    return this.errors.reduce<BaseError>(
      (latest, current) =>
        current.timestamp > latest.timestamp ? current : latest,
      this.errors[0]
    );
  }

  /**
   * Get the oldest error
   */
  getOldest(): BaseError | null {
    if (this.errors.length === 0) {
      return null;
    }
  
    return this.errors.reduce<BaseError>(
      (oldest, current) =>
        current.timestamp < oldest.timestamp ? current : oldest,
      this.errors[0]
    );
  }
}


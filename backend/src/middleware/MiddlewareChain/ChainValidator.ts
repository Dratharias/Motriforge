import { IConfigurableMiddleware } from '../MiddlewareFramework';
import { 
  ChainValidationResult,
  DependencyValidationResult
} from '@/types/middleware/chain/chain-types';
import { ContextualLogger } from '@/shared-kernel/infrastructure/logging/ContextualLogger';

/**
 * Priority validation result
 */
interface PriorityValidationResult {
  readonly conflicts: Array<{
    readonly priority: number;
    readonly middlewareNames: string[];
  }>;
}

/**
 * Validates middleware chain configuration and dependencies
 */
export class ChainValidator {
  private readonly logger: ContextualLogger;

  constructor(logger: ContextualLogger) {
    this.logger = logger;
  }

  /**
   * Validates the entire middleware chain
   */
  validate(middleware: Map<string, IConfigurableMiddleware>): ChainValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Validate dependencies
    const dependencyResult = this.validateDependencies(middleware);
    errors.push(...this.formatDependencyErrors(dependencyResult));

    // Validate priorities
    const priorityResult = this.validatePriorities(middleware);
    warnings.push(...this.formatPriorityWarnings(priorityResult));

    // Validate chain size
    const sizeErrors = this.validateChainSize(middleware);
    errors.push(...sizeErrors);

    const isValid = errors.length === 0;

    this.logger.debug('Chain validation completed', {
      valid: isValid,
      errorCount: errors.length,
      warningCount: warnings.length
    });

    return {
      valid: isValid,
      errors,
      warnings
    };
  }

  /**
   * Validates middleware dependencies
   */
  private validateDependencies(middleware: Map<string, IConfigurableMiddleware>): DependencyValidationResult {
    const circularDependencies = this.detectCircularDependencies(middleware);
    const missingDependencies = this.detectMissingDependencies(middleware);

    return {
      circularDependencies,
      missingDependencies
    };
  }

  /**
   * Validates middleware priorities
   */
  private validatePriorities(middleware: Map<string, IConfigurableMiddleware>): PriorityValidationResult {
    const priorityMap = new Map<number, string[]>();

    for (const m of middleware.values()) {
      const priority = m.config.priority;
      if (!priorityMap.has(priority)) {
        priorityMap.set(priority, []);
      }
      priorityMap.get(priority)!.push(m.name);
    }

    const conflicts = Array.from(priorityMap.entries())
      .filter(([, names]) => names.length > 1)
      .map(([priority, middlewareNames]) => ({ priority, middlewareNames }));

    return { conflicts };
  }

  /**
   * Validates chain size constraints
   */
  private validateChainSize(middleware: Map<string, IConfigurableMiddleware>): string[] {
    const errors: string[] = [];
    const maxChainSize = 50; // Configurable limit

    if (middleware.size > maxChainSize) {
      errors.push(`Chain size ${middleware.size} exceeds maximum allowed size of ${maxChainSize}`);
    }

    return errors;
  }

  /**
   * Detects circular dependencies in the middleware chain
   */
  private detectCircularDependencies(middleware: Map<string, IConfigurableMiddleware>): string[] {
    const visited = new Set<string>();
    const visiting = new Set<string>();
    const path: string[] = [];

    const visit = (name: string): string[] | null => {
      if (visiting.has(name)) {
        const cycleStart = path.indexOf(name);
        return path.slice(cycleStart).concat([name]);
      }
      if (visited.has(name)) {
        return null;
      }

      visiting.add(name);
      path.push(name);
      
      const m = middleware.get(name);
      if (m?.dependencies) {
        for (const dep of m.dependencies) {
          if (middleware.has(dep)) {
            const cycle = visit(dep);
            if (cycle) {
              return cycle;
            }
          }
        }
      }

      visiting.delete(name);
      path.pop();
      visited.add(name);
      return null;
    };

    for (const name of middleware.keys()) {
      const cycle = visit(name);
      if (cycle) {
        return cycle;
      }
    }

    return [];
  }

  /**
   * Detects missing dependencies
   */
  private detectMissingDependencies(middleware: Map<string, IConfigurableMiddleware>): Array<{
    middleware: string;
    missingDependency: string;
  }> {
    const missing: Array<{ middleware: string; missingDependency: string }> = [];

    for (const m of middleware.values()) {
      if (m.dependencies) {
        for (const dep of m.dependencies) {
          if (!middleware.has(dep)) {
            missing.push({
              middleware: m.name,
              missingDependency: dep
            });
          }
        }
      }
    }

    return missing;
  }

  /**
   * Formats dependency validation errors
   */
  private formatDependencyErrors(result: DependencyValidationResult): string[] {
    const errors: string[] = [];

    if (result.circularDependencies.length > 0) {
      errors.push(`Circular dependencies detected: ${result.circularDependencies.join(' -> ')}`);
    }

    for (const missing of result.missingDependencies) {
      errors.push(`Middleware ${missing.middleware} depends on missing middleware: ${missing.missingDependency}`);
    }

    return errors;
  }

  /**
   * Formats priority validation warnings
   */
  private formatPriorityWarnings(result: PriorityValidationResult): string[] {
    return result.conflicts.map(conflict =>
      `Multiple middleware have the same priority ${conflict.priority}: ${conflict.middlewareNames.join(', ')}`
    );
  }
}
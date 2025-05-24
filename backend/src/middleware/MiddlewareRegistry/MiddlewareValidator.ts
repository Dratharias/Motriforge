import { ContextualLogger } from "@/shared-kernel/infrastructure/logging/ContextualLogger";
import { ValidationErrorType, MiddlewareCategory } from "@/types/middleware/registry/enums";
import { RegistryValidationError, MiddlewareRegistration } from "@/types/middleware/registry/registry-types";
import { ApplicationContext } from "@/types/shared/enums/common";


/**
 * Dependency cycle detection result
 */
export interface DependencyCycle {
  readonly middlewareNames: readonly string[];
  readonly cycleLength: number;
  readonly severity: 'warning' | 'error';
}

/**
 * Priority conflict detection result
 */
export interface PriorityConflict {
  readonly middlewareA: string;
  readonly middlewareB: string;
  readonly priority: number;
  readonly context: ApplicationContext;
  readonly severity: 'warning' | 'error';
}

/**
 * Removal validation result
 */
export interface RemovalValidationResult {
  readonly canRemove: boolean;
  readonly directDependents: readonly string[];
  readonly indirectDependents: readonly string[];
  readonly warnings: readonly string[];
}

/**
 * Detailed validation result interface
 */
export interface DetailedValidationResult {
  readonly valid: boolean;
  readonly errors: readonly RegistryValidationError[];
  readonly warnings: readonly string[];
  readonly dependencyCycles: readonly DependencyCycle[];
  readonly priorityConflicts: readonly PriorityConflict[];
  readonly statistics: ValidationStatistics;
  readonly recommendations: readonly string[];
}

/**
 * Validation statistics
 */
export interface ValidationStatistics {
  readonly totalMiddleware: number;
  readonly enabledMiddleware: number;
  readonly disabledMiddleware: number;
  readonly totalDependencies: number;
  readonly unresolvedDependencies: number;
  readonly averagePriority: number;
  readonly contextsUsed: readonly ApplicationContext[];
  readonly securityMiddleware: number;
  readonly performanceImpactScore: number;
}

/**
 * Middleware validator for validating middleware configurations and dependencies
 */
export class MiddlewareValidator {
  private readonly logger: ContextualLogger;

  constructor(logger: ContextualLogger) {
    this.logger = logger;
  }

  /**
   * Validates a middleware name
   */
  validateName(name: string, existingNames: Set<string>): RegistryValidationError[] {
    const errors: RegistryValidationError[] = [];

    // Check if name is empty or whitespace
    if (!name || name.trim() === '') {
      errors.push({
        field: 'name',
        message: 'Middleware name cannot be empty',
        code: ValidationErrorType.INVALID_NAME,
        value: name,
        severity: 'error'
      });
      return errors;
    }

    // Check if name already exists
    if (existingNames.has(name)) {
      errors.push({
        field: 'name',
        message: `Middleware name '${name}' already exists`,
        code: ValidationErrorType.DUPLICATE_NAME,
        value: name,
        severity: 'error'
      });
    }

    // Validate name format (alphanumeric, hyphens, underscores)
    const namePattern = /^[a-zA-Z0-9_-]+$/;
    if (!namePattern.test(name)) {
      errors.push({
        field: 'name',
        message: 'Middleware name can only contain letters, numbers, hyphens, and underscores',
        code: ValidationErrorType.INVALID_NAME,
        value: name,
        severity: 'error'
      });
    }

    // Check name length
    if (name.length > 50) {
      errors.push({
        field: 'name',
        message: 'Middleware name cannot exceed 50 characters',
        code: ValidationErrorType.INVALID_NAME,
        value: name,
        severity: 'warning'
      });
    }

    return errors;
  }

  /**
   * Validates a single middleware registration
   */
  validateSingle(
    registration: MiddlewareRegistration,
    registrations: Map<string, MiddlewareRegistration>
  ): RegistryValidationError[] {
    const errors: RegistryValidationError[] = [];

    // Validate basic registration fields
    this.validateRegistrationFields(registration, errors);

    // Validate dependencies
    this.validateDependencies(registration, registrations, errors);

    // Validate configuration
    this.validateConfiguration(registration, errors);

    this.logger.debug('Single middleware validation completed', {
      middlewareName: registration.name,
      errorCount: errors.length
    });

    return errors;
  }

  /**
   * Checks if a middleware can be safely removed
   */
  canRemove(
    name: string,
    registrations: Map<string, MiddlewareRegistration>
  ): RemovalValidationResult {
    const directDependents: string[] = [];
    const indirectDependents: string[] = [];
    const warnings: string[] = [];

    // Find direct dependents
    for (const [middlewareName, registration] of registrations) {
      if (middlewareName === name) continue;

      const dependencies = registration.middleware.dependencies ?? [];
      if (dependencies.includes(name)) {
        directDependents.push(middlewareName);
      }
    }

    // Find indirect dependents (middleware that depend on direct dependents)
    for (const dependent of directDependents) {
      const indirectDeps = this.findIndirectDependents(dependent, registrations, new Set([name]));
      indirectDependents.push(...indirectDeps);
    }

    // Generate warnings
    if (directDependents.length > 0) {
      warnings.push(`${directDependents.length} middleware directly depend on '${name}'`);
    }

    if (indirectDependents.length > 0) {
      warnings.push(`${indirectDependents.length} middleware indirectly depend on '${name}'`);
    }

    const canRemove = directDependents.length === 0;

    this.logger.debug('Middleware removal validation completed', {
      middlewareName: name,
      canRemove,
      directDependents: directDependents.length,
      indirectDependents: indirectDependents.length
    });

    return {
      canRemove,
      directDependents,
      indirectDependents,
      warnings
    };
  }

  /**
   * Validates the entire registry
   */
  validate(registrations: Map<string, MiddlewareRegistration>): DetailedValidationResult {
    const errors: RegistryValidationError[] = [];
    const warnings: string[] = [];
    let dependencyCycles: DependencyCycle[] = [];
    let priorityConflicts: PriorityConflict[] = [];

    // Validate each middleware individually
    for (const registration of registrations.values()) {
      const middlewareErrors = this.validateSingle(registration, registrations);
      errors.push(...middlewareErrors);
    }

    // Detect dependency cycles
    dependencyCycles = this.detectDependencyCycles(registrations);
    
    // Detect priority conflicts
    priorityConflicts = this.detectPriorityConflicts(registrations);

    // Generate statistics
    const statistics = this.calculateStatistics(registrations);

    // Generate recommendations
    const recommendations = this.generateRecommendations(registrations, errors, warnings);

    const valid = errors.filter(e => e.severity === 'error').length === 0 && 
                  dependencyCycles.filter(c => c.severity === 'error').length === 0;

    this.logger.info('Registry validation completed', {
      valid,
      errorCount: errors.length,
      warningCount: warnings.length,
      cycleCount: dependencyCycles.length,
      conflictCount: priorityConflicts.length
    });

    return {
      valid,
      errors,
      warnings,
      dependencyCycles,
      priorityConflicts,
      statistics,
      recommendations
    };
  }

  /**
   * Validates basic registration fields
   */
  private validateRegistrationFields(
    registration: MiddlewareRegistration,
    errors: RegistryValidationError[]
  ): void {
    if (!registration.version || registration.version.trim() === '') {
      errors.push({
        field: 'version',
        message: 'Middleware version is required',
        code: ValidationErrorType.INVALID_CONFIGURATION,
        value: registration.version,
        severity: 'error'
      });
    }

    if (!registration.description || registration.description.trim() === '') {
      errors.push({
        field: 'description',
        message: 'Middleware description is required',
        code: ValidationErrorType.INVALID_CONFIGURATION,
        value: registration.description,
        severity: 'warning'
      });
    }

    if (!registration.author || registration.author.trim() === '') {
      errors.push({
        field: 'author',
        message: 'Middleware author is required',
        code: ValidationErrorType.INVALID_CONFIGURATION,
        value: registration.author,
        severity: 'warning'
      });
    }

    if (registration.contexts.length === 0) {
      errors.push({
        field: 'contexts',
        message: 'Middleware must specify at least one application context',
        code: ValidationErrorType.INVALID_CONFIGURATION,
        value: registration.contexts,
        severity: 'error'
      });
    }

    const priority = registration.middleware.config.priority;
    if (priority < 0 || priority > 100) {
      errors.push({
        field: 'priority',
        message: 'Middleware priority must be between 0 and 100',
        code: ValidationErrorType.INVALID_CONFIGURATION,
        value: priority,
        severity: 'error'
      });
    }
  }

  /**
   * Validates middleware dependencies
   */
  private validateDependencies(
    registration: MiddlewareRegistration,
    registrations: Map<string, MiddlewareRegistration>,
    errors: RegistryValidationError[]
  ): void {
    const dependencies = registration.middleware.dependencies ?? [];

    for (const dependency of dependencies) {
      if (!registrations.has(dependency)) {
        errors.push({
          field: 'dependencies',
          message: `Required dependency '${dependency}' not found`,
          code: ValidationErrorType.MISSING_DEPENDENCY,
          value: dependency,
          severity: 'error'
        });
      }
    }
  }

  /**
   * Validates middleware configuration
   */
  private validateConfiguration(
    registration: MiddlewareRegistration,
    errors: RegistryValidationError[]
  ): void {
    const config = registration.middleware.config;

    if (!config.name || config.name !== registration.name) {
      errors.push({
        field: 'config.name',
        message: 'Middleware config name must match registration name',
        code: ValidationErrorType.INVALID_CONFIGURATION,
        value: { configName: config.name, registrationName: registration.name },
        severity: 'error'
      });
    }
  }

  /**
   * Detects circular dependencies in middleware
   */
  private detectDependencyCycles(
    registrations: Map<string, MiddlewareRegistration>
  ): DependencyCycle[] {
    const cycles: DependencyCycle[] = [];
    const visited = new Set<string>();
    const recursionStack = new Set<string>();

    const dfs = (middlewareName: string, path: string[]): void => {
      if (recursionStack.has(middlewareName)) {
        // Found a cycle
        const cycleStart = path.indexOf(middlewareName);
        const cyclePath = path.slice(cycleStart);
        cyclePath.push(middlewareName);

        cycles.push({
          middlewareNames: cyclePath,
          cycleLength: cyclePath.length - 1,
          severity: 'error'
        });
        return;
      }

      if (visited.has(middlewareName)) {
        return;
      }

      visited.add(middlewareName);
      recursionStack.add(middlewareName);

      const registration = registrations.get(middlewareName);
      if (registration) {
        const dependencies = registration.middleware.dependencies ?? [];
        for (const dependency of dependencies) {
          dfs(dependency, [...path, middlewareName]);
        }
      }

      recursionStack.delete(middlewareName);
    };

    for (const middlewareName of registrations.keys()) {
      if (!visited.has(middlewareName)) {
        dfs(middlewareName, []);
      }
    }

    return cycles;
  }

  /**
   * Detects priority conflicts between middleware
   */
  private detectPriorityConflicts(
    registrations: Map<string, MiddlewareRegistration>
  ): PriorityConflict[] {
    const conflicts: PriorityConflict[] = [];
    const priorityGroups = new Map<number, MiddlewareRegistration[]>();

    // Group middleware by priority
    for (const registration of registrations.values()) {
      const priority = registration.middleware.config.priority;
      if (!priorityGroups.has(priority)) {
        priorityGroups.set(priority, []);
      }
      priorityGroups.get(priority)!.push(registration);
    }

    // Check for conflicts within each priority group
    for (const [priority, middlewareList] of priorityGroups) {
      if (middlewareList.length <= 1) continue;

      for (let i = 0; i < middlewareList.length; i++) {
        for (let j = i + 1; j < middlewareList.length; j++) {
          const middlewareA = middlewareList[i];
          const middlewareB = middlewareList[j];

          // Check for common contexts
          const commonContexts = middlewareA.contexts.filter((context: any) =>
            middlewareB.contexts.includes(context)
          );

          for (const context of commonContexts) {
            conflicts.push({
              middlewareA: middlewareA.name,
              middlewareB: middlewareB.name,
              priority,
              context,
              severity: 'warning'
            });
          }
        }
      }
    }

    return conflicts;
  }

  /**
   * Finds indirect dependents of a middleware
   */
  private findIndirectDependents(
    middlewareName: string,
    registrations: Map<string, MiddlewareRegistration>,
    visited: Set<string>
  ): string[] {
    if (visited.has(middlewareName)) {
      return [];
    }

    visited.add(middlewareName);
    const indirectDependents: string[] = [];

    for (const [name, registration] of registrations) {
      if (visited.has(name)) continue;

      const dependencies = registration.middleware.dependencies ?? [];
      if (dependencies.includes(middlewareName)) {
        indirectDependents.push(name);
        // Recursively find dependents of this dependent
        const nestedDependents = this.findIndirectDependents(name, registrations, new Set(visited));
        indirectDependents.push(...nestedDependents);
      }
    }

    return indirectDependents;
  }

  /**
   * Calculates validation statistics
   */
  private calculateStatistics(
    registrations: Map<string, MiddlewareRegistration>
  ): ValidationStatistics {
    const registrationArray = Array.from(registrations.values());
    const enabledMiddleware = registrationArray.filter(r => r.middleware.config.enabled);
    
    const allContexts = new Set<ApplicationContext>();
    let totalDependencies = 0;
    let unresolvedDependencies = 0;
    let securityMiddleware = 0;
    let totalPriority = 0;

    for (const registration of registrationArray) {
      registration.contexts.forEach((context: ApplicationContext) => allContexts.add(context));
      
      const dependencies = registration.middleware.dependencies ?? [];
      totalDependencies += dependencies.length;
      totalPriority += registration.middleware.config.priority;

      // Count security-related middleware
      if (registration.category === MiddlewareCategory.SECURITY ||
          registration.category === MiddlewareCategory.AUTHENTICATION ||
          registration.category === MiddlewareCategory.AUTHORIZATION) {
        securityMiddleware++;
      }

      // Count unresolved dependencies
      for (const dependency of dependencies) {
        if (!registrations.has(dependency)) {
          unresolvedDependencies++;
        }
      }
    }

    const averagePriority = registrationArray.length > 0 ? totalPriority / registrationArray.length : 0;

    // Calculate performance impact score (0-100)
    const performanceImpactScore = Math.min(
      100,
      (registrationArray.length * 2) + 
      (unresolvedDependencies * 5) + 
      (securityMiddleware * 3)
    );

    return {
      totalMiddleware: registrationArray.length,
      enabledMiddleware: enabledMiddleware.length,
      disabledMiddleware: registrationArray.length - enabledMiddleware.length,
      totalDependencies,
      unresolvedDependencies,
      averagePriority,
      contextsUsed: Array.from(allContexts),
      securityMiddleware,
      performanceImpactScore
    };
  }

  /**
   * Generates optimization recommendations
   */
  private generateRecommendations(
    registrations: Map<string, MiddlewareRegistration>,
    errors: RegistryValidationError[],
    warnings: string[]
  ): string[] {
    const recommendations: string[] = [];
    const registrationArray = Array.from(registrations.values());
    const enabledCount = registrationArray.filter(r => r.middleware.config.enabled).length;

    // Recommend enabling disabled middleware if usage is low
    if (enabledCount / registrationArray.length < 0.8) {
      recommendations.push('Consider removing unused disabled middleware to reduce complexity');
    }

    // Recommend priority adjustments for conflicts
    const highPriorityCount = registrationArray.filter(r => r.middleware.config.priority > 80).length;
    if (highPriorityCount > 3) {
      recommendations.push('Too many high-priority middleware may impact performance');
    }

    // Recommend dependency cleanup
    if (errors.some(e => e.code === ValidationErrorType.MISSING_DEPENDENCY)) {
      recommendations.push('Resolve missing dependencies to ensure proper middleware functionality');
    }

    // Recommend security improvements
    const securityMiddleware = registrationArray.filter(r => 
      r.category === MiddlewareCategory.SECURITY ||
      r.category === MiddlewareCategory.AUTHENTICATION ||
      r.category === MiddlewareCategory.AUTHORIZATION
    ).length;

    if (securityMiddleware === 0) {
      recommendations.push('Consider adding security middleware for authentication and authorization');
    }

    return recommendations;
  }
}
import { RequestContext } from "@/types/middleware/framework";
import { MiddlewareCondition } from ".";


/**
 * Evaluates middleware execution conditions
 */
export class MiddlewareConditionEvaluator {
  /**
   * Evaluates all conditions for a middleware
   */
  evaluate(conditions: MiddlewareCondition[], context: RequestContext): boolean {
    if (conditions.length === 0) {
      return true;
    }

    return conditions.every(condition => this.evaluateCondition(condition, context));
  }

  /**
   * Evaluates a single condition
   */
  private evaluateCondition(condition: MiddlewareCondition, context: RequestContext): boolean {
    let result = false;

    switch (condition.type) {
      case 'path':
        result = this.evaluateStringCondition(condition, context.path);
        break;
      case 'method':
        result = this.evaluateStringCondition(condition, context.method);
        break;
      case 'header':
        result = this.evaluateHeaderCondition(condition, context.headers);
        break;
      case 'context':
        result = context.applicationContext === condition.value;
        break;
      case 'custom':
        result = this.evaluateCustomCondition(condition, context);
        break;
    }

    return condition.negate ? !result : result;
  }

  /**
   * Evaluates string-based conditions
   */
  private evaluateStringCondition(condition: MiddlewareCondition, value: string): boolean {
    switch (condition.operator) {
      case 'equals':
        return value === condition.value;
      case 'contains':
        return value.includes(condition.value);
      case 'startsWith':
        return value.startsWith(condition.value);
      case 'endsWith':
        return value.endsWith(condition.value);
      case 'regex':
        return new RegExp(condition.value).test(value);
      case 'exists':
        return value !== undefined && value !== null;
      default:
        return false;
    }
  }

  /**
   * Evaluates header-based conditions
   */
  private evaluateHeaderCondition(
    condition: MiddlewareCondition,
    headers: Record<string, string>
  ): boolean {
    const headerValue = headers[condition.value];
    
    switch (condition.operator) {
      case 'exists':
        return headerValue !== undefined;
      case 'equals':
        return headerValue === condition.value;
      case 'contains':
        return headerValue?.includes(condition.value) ?? false;
      default:
        return headerValue !== undefined;
    }
  }

  /**
   * Evaluates custom conditions (extensible)
   */
  private evaluateCustomCondition(condition: MiddlewareCondition, context: RequestContext): boolean {
    // This can be extended with custom condition logic
    // For now, always return true
    return true;
  }
}
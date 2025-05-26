import { 
  PolicyCondition, 
  PolicyAttribute, 
  PolicyRequest 
} from '@/types/iam/interfaces';
import { PolicyInformationPoint } from './PolicyInformationPoint';
import { LoggerFactory } from '@/shared-kernel/infrastructure/logging/factory/LoggerFactory';

export class RuleEngine {
  private readonly logger = LoggerFactory.getContextualLogger('RuleEngine');

  constructor(private readonly policyInformationPoint: PolicyInformationPoint) {}

  async evaluateCondition(condition: PolicyCondition, request: PolicyRequest): Promise<boolean> {
    try {
      this.logger.debug('Evaluating condition', { 
        operator: condition.operator 
      });

      switch (condition.operator) {
        case 'and':
          return await this.evaluateAndCondition(condition, request);
        case 'or':
          return await this.evaluateOrCondition(condition, request);
        case 'not':
          return await this.evaluateNotCondition(condition, request);
        case 'equals':
          return await this.evaluateEqualsCondition(condition, request);
        case 'contains':
          return await this.evaluateContainsCondition(condition, request);
        case 'greater_than':
          return await this.evaluateGreaterThanCondition(condition, request);
        case 'less_than':
          return await this.evaluateLessThanCondition(condition, request);
        default:
          this.logger.warn('Unknown condition operator', { 
            operator: condition.operator 
          });
          return false;
      }
    } catch (error) {
      this.logger.error('Error evaluating condition', error as Error);
      return false;
    }
  }

  private async evaluateAndCondition(condition: PolicyCondition, request: PolicyRequest): Promise<boolean> {
    for (const operand of condition.operands) {
      const result = await this.evaluateOperand(operand, request);
      if (!result) return false;
    }
    return true;
  }

  private async evaluateOrCondition(condition: PolicyCondition, request: PolicyRequest): Promise<boolean> {
    for (const operand of condition.operands) {
      const result = await this.evaluateOperand(operand, request);
      if (result) return true;
    }
    return false;
  }

  private async evaluateNotCondition(condition: PolicyCondition, request: PolicyRequest): Promise<boolean> {
    if (condition.operands.length !== 1) {
      throw new Error('NOT condition must have exactly one operand');
    }
    const result = await this.evaluateOperand(condition.operands[0], request);
    return !result;
  }

  private async evaluateEqualsCondition(condition: PolicyCondition, request: PolicyRequest): Promise<boolean> {
    if (condition.operands.length !== 2) {
      throw new Error('EQUALS condition must have exactly two operands');
    }

    const [left, right] = condition.operands;
    const leftValue = await this.getOperandValue(left, request);
    const rightValue = await this.getOperandValue(right, request);

    return leftValue === rightValue;
  }

  private async evaluateContainsCondition(condition: PolicyCondition, request: PolicyRequest): Promise<boolean> {
    if (condition.operands.length !== 2) {
      throw new Error('CONTAINS condition must have exactly two operands');
    }

    const [container, item] = condition.operands;
    const containerValue = await this.getOperandValue(container, request);
    const itemValue = await this.getOperandValue(item, request);

    if (Array.isArray(containerValue)) {
      return containerValue.includes(itemValue);
    }

    if (typeof containerValue === 'string' && typeof itemValue === 'string') {
      return containerValue.includes(itemValue);
    }

    return false;
  }

  private async evaluateGreaterThanCondition(condition: PolicyCondition, request: PolicyRequest): Promise<boolean> {
    if (condition.operands.length !== 2) {
      throw new Error('GREATER_THAN condition must have exactly two operands');
    }

    const [left, right] = condition.operands;
    const leftValue = await this.getOperandValue(left, request);
    const rightValue = await this.getOperandValue(right, request);

    if (typeof leftValue === 'number' && typeof rightValue === 'number') {
      return leftValue > rightValue;
    }

    if (leftValue instanceof Date && rightValue instanceof Date) {
      return leftValue > rightValue;
    }

    return false;
  }

  private async evaluateLessThanCondition(condition: PolicyCondition, request: PolicyRequest): Promise<boolean> {
    if (condition.operands.length !== 2) {
      throw new Error('LESS_THAN condition must have exactly two operands');
    }

    const [left, right] = condition.operands;
    const leftValue = await this.getOperandValue(left, request);
    const rightValue = await this.getOperandValue(right, request);

    if (typeof leftValue === 'number' && typeof rightValue === 'number') {
      return leftValue < rightValue;
    }

    if (leftValue instanceof Date && rightValue instanceof Date) {
      return leftValue < rightValue;
    }

    return false;
  }

  private async evaluateOperand(operand: PolicyCondition | PolicyAttribute, request: PolicyRequest): Promise<boolean> {
    if ('operator' in operand) {
      // It's a condition
      return await this.evaluateCondition(operand, request);
    } else {
      // It's an attribute - treat as boolean (exists and is truthy)
      const value = await this.getAttributeValue(operand, request);
      return Boolean(value);
    }
  }

  private async getOperandValue(operand: PolicyCondition | PolicyAttribute, request: PolicyRequest): Promise<unknown> {
    if ('operator' in operand) {
      // It's a condition - return the evaluation result
      return await this.evaluateCondition(operand, request);
    } else {
      // It's an attribute
      return await this.getAttributeValue(operand, request);
    }
  }

  private async getAttributeValue(attribute: PolicyAttribute, request: PolicyRequest): Promise<unknown> {
    // If attribute has a direct value, return it
    if (attribute.value !== undefined) {
      return attribute.value;
    }

    // Otherwise, resolve the attribute from context
    switch (attribute.category) {
      case 'subject':
        return this.getNestedValue(
          await this.policyInformationPoint.getSubjectAttributes(request.subject),
          attribute.attribute
        );

      case 'resource':
        return this.getNestedValue(
          await this.policyInformationPoint.getResourceAttributes(request.resource),
          attribute.attribute
        );

      case 'action':
        return request.action;

      case 'environment':{
        const envValue = this.getNestedValue(
          await this.policyInformationPoint.getEnvironmentAttributes(),
          attribute.attribute
        );
        
        // Also check request environment
        if (envValue === undefined && request.environment) {
          return this.getNestedValue(request.environment, attribute.attribute);
        }
        
        return envValue;
      }

      default:
        this.logger.warn('Unknown attribute category', { 
          category: attribute.category 
        });
        return undefined;
    }
  }

  private getNestedValue(obj: Record<string, unknown>, path: string): unknown {
    return path.split('.').reduce((current: any, key: string) => {
      return current[key] ?? undefined;
    }, obj);
  }
}


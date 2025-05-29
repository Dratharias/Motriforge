import { Action } from "@/types/core/enums";
import { IShareRule, IShareRuleContext, IShareRuleResult } from "./interfaces";

export abstract class BaseShareRule implements IShareRule {
  public abstract readonly name: string;
  public abstract readonly priority: number;
  public abstract readonly description: string;

  abstract evaluate(context: IShareRuleContext): Promise<IShareRuleResult>;
  abstract appliesTo(context: IShareRuleContext): boolean;

  protected createResult(
    allowed: boolean,
    reason?: string,
    options?: {
      warnings?: readonly string[];
      suggestedActions?: readonly Action[];
      maxDuration?: number;
    }
  ): IShareRuleResult {
    return {
      allowed,
      reason,
      warnings: options?.warnings ?? [],
      suggestedActions: options?.suggestedActions ?? [],
      maxDuration: options?.maxDuration
    };
  }
}


import { BaseShareRule } from './IShareRule';
import { IShareRuleContext, IShareRuleResult } from './interfaces';

export class TimeBasedShareRule extends BaseShareRule {
  public readonly name = 'TimeBasedShareRule';
  public readonly priority = 80;
  public readonly description = 'Enforces time-based sharing restrictions';

  private readonly maxDurationDays: number;
  private readonly businessHoursOnly: boolean;
  private readonly allowedDays: readonly number[]; // 0 = Sunday, 1 = Monday, etc.

  constructor(options: {
    maxDurationDays?: number;
    businessHoursOnly?: boolean;
    allowedDays?: readonly number[];
  } = {}) {
    super();
    this.maxDurationDays = options.maxDurationDays ?? 365;
    this.businessHoursOnly = options.businessHoursOnly ?? false;
    this.allowedDays = options.allowedDays ?? [1, 2, 3, 4, 5]; // Monday to Friday
  }

  appliesTo(context: IShareRuleContext): boolean {
    return context.shareRequest.endDate !== undefined || this.businessHoursOnly;
  }

  async evaluate(context: IShareRuleContext): Promise<IShareRuleResult> {
    const now = new Date();
    const warnings: string[] = [];

    // Check if sharing during allowed time
    if (this.businessHoursOnly) {
      const hour = now.getHours();
      const dayOfWeek = now.getDay();

      if (!this.allowedDays.includes(dayOfWeek)) {
        return this.createResult(
          false,
          'Sharing is only allowed on business days'
        );
      }

      if (hour < 8 || hour >= 18) {
        warnings.push('Sharing outside business hours - share will be processed during next business day');
      }
    }

    // Check duration
    if (context.shareRequest.endDate) {
      const durationMs = context.shareRequest.endDate.getTime() - now.getTime();
      const durationDays = Math.ceil(durationMs / (1000 * 60 * 60 * 24));

      if (durationDays > this.maxDurationDays) {
        const suggestedEndDate = new Date(now);
        suggestedEndDate.setDate(suggestedEndDate.getDate() + this.maxDurationDays);

        return this.createResult(
          false,
          `Share duration cannot exceed ${this.maxDurationDays} days`,
          {
            warnings: [`Maximum allowed duration is ${this.maxDurationDays} days`]
          }
        );
      }

      if (durationDays > 90) {
        warnings.push('Long duration share detected - consider shorter duration for security');
      }
    }

    return this.createResult(
      true,
      undefined,
      {
        warnings,
        maxDuration: this.maxDurationDays
      }
    );
  }
}


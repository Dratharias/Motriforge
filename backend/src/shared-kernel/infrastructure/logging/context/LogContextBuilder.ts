import { Types } from "mongoose";
import { ApplicationContext } from "@/types/shared/enums/common";
import { LogContext } from "@/types/shared/infrastructure/logging";

export class LogContextBuilder {
  private context: Partial<LogContext> = {};

  withContext(context: LogContext): this {
    this.context = { ...this.context, ...context };
    return this;
  }

  withCorrelationId(correlationId: string): this {
    this.context.correlationId = correlationId;
    return this;
  }

  withUserId(userId: Types.ObjectId): this {
    this.context.userId = userId;
    return this;
  }

  withOrganizationId(organizationId: Types.ObjectId): this {
    this.context.organizationId = organizationId;
    return this;
  }

  withSessionId(sessionId: string): this {
    this.context.sessionId = sessionId;
    return this;
  }

  withRequestId(requestId: string): this {
    this.context.requestId = requestId;
    return this;
  }

  withApplicationContext(applicationContext: ApplicationContext): this {
    this.context.applicationContext = applicationContext;
    return this;
  }

  build(): Partial<LogContext> {
    return { ...this.context };
  }

  reset(): this {
    this.context = {};
    return this;
  }

  copyFrom(other: LogContextBuilder): this {
    this.context = { ...other.context };
    return this;
  }
}


import { LogMetadata } from "@/types/shared/infrastructure/logging";

export class LogMetadataBuilder {
  constructor(private readonly loggerName: string) {}

  build(): LogMetadata {
    return {
      source: this.loggerName,
      version: process.env.APP_VERSION ?? '1.0.0',
      environment: process.env.NODE_ENV ?? 'development',
      hostname: process.env.HOSTNAME ?? 'localhost',
      pid: process.pid,
      builtAt: new Date()
    };
  }

  reset(): this {
    // Metadata is mostly static, nothing to reset
    return this;
  }
}


import { LogLevel } from "@/types/shared/common";
import { ApplicationContext } from "@/types/shared/enums/common";
import { Types } from "mongoose";

// Example: Creating a logger with decorators
export function createProductionLogger(baseLogger: ILogger): ILogger {
  return LoggerFactory.createSecurePerformanceLogger(baseLogger);
}

// Example: Using the fluent builder
export async function exampleUsage(logger: ILogger): Promise<void> {
  const builder = LoggerFactory.createBuilderFor(logger);

  // Simple logging
  await builder
    .info("User login successful")
    .withUserId(new Types.ObjectId())
    .withCorrelationId("req-123")
    .log();

  // Complex logging with error
  try {
    // Some operation that might fail
    throw new Error("Database connection failed");
  } catch (err) {
    await builder
      .logError("Database operation failed", err as Error)
      .withApplicationContext(ApplicationContext.USER)
      .withData({ 
        operation: "findUser",
        query: { email: "user@example.com" }
      })
      .withDuration(150)
      .withTags({ severity: "high", component: "database" })
      .log();
  }

  // Performance monitoring
  const start = Date.now();
  // ... some operation
  const duration = Date.now() - start;

  await builder
    .info("Operation completed")
    .withDuration(duration)
    .withMetric("operation_time", duration)
    .withHttpStatus(200)
    .log();

  // Reuse builder (it's reset automatically)
  await builder
    .warn("High memory usage detected")
    .withData({ memoryUsage: process.memoryUsage() })
    .log();
}

// Example: Different formatting strategies
export function setupLogFormatting(): void {
  const jsonFormatter = LoggerFactory.createFormattingStrategy('json');
  const textFormatter = LoggerFactory.createFormattingStrategy('text');
  
  // Use formatters as needed
  console.log('JSON format ready:', jsonFormatter);
  console.log('Text format ready:', textFormatter);
}

// Example: Builder pattern for complex configurations
export class LoggingConfigurationBuilder {
  private enableSecurity = false;
  private enablePerformance = false;
  private format: 'json' | 'text' = 'json';

  withSecurity(): this {
    this.enableSecurity = true;
    return this;
  }

  withPerformanceMonitoring(): this {
    this.enablePerformance = true;
    return this;
  }

  withFormat(format: 'json' | 'text'): this {
    this.format = format;
    return this;
  }

  build(baseLogger: ILogger): ILogger {
    let logger: ILogger = baseLogger;

    if (this.enableSecurity) {
      logger = new SecureLogDecorator(logger);
    }

    if (this.enablePerformance) {
      logger = new PerformanceLogDecorator(logger);
    }

    return logger;
  }
}
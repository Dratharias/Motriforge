import { LogContext } from "@/types/common";

export function createLogContext(partial?: Partial<LogContext>): LogContext {
  return {
    environment: process.env.NODE_ENV ?? 'development',
    version: process.env.APP_VERSION ?? '0.0.1',
    ...partial
  };
}

export function mergeLogContexts(...contexts: (LogContext | undefined)[]): LogContext {
  const result: LogContext = {};
  
  for (const context of contexts) {
    if (!context) continue;
    
    // Copy standard fields
    for (const key of Object.keys(context) as Array<keyof LogContext>) {
      if (key === 'custom') continue;
      if (context[key] !== undefined) {
        result[key] = context[key];
      }
    }
    
    // Merge custom fields
    if (context.custom) {
      result.custom = { ...result.custom, ...context.custom };
    }
  }
  
  return result;
}
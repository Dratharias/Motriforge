import { LogLevel } from ".";

export interface LogMiddlewareOptions {
  logRequestBody?: boolean;
  logResponseBody?: boolean;
  skipPaths?: string[];
  skipStaticFiles?: boolean;
  logLevel?: LogLevel;
}
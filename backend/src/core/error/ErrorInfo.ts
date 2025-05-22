import { ErrorInfo } from "@/types/errors";

export function createErrorInfo(error: Error): ErrorInfo {
  const errorInfo: ErrorInfo = {
    name: error.name,
    message: error.message,
    stack: error.stack,
  };

  // Handle cause if exists in modern Error objects
  if ('cause' in error && error.cause instanceof Error) {
    errorInfo.cause = createErrorInfo(error.cause);
  }

  // Handle custom error properties
  if ((error as any).code) {
    errorInfo.code = (error as any).code;
  }

  // Extract additional metadata if available
  if ((error as any).metadata) {
    errorInfo.metadata = (error as any).metadata;
  }

  return errorInfo;
}
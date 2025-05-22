export interface GlobalErrorOptions {
  handleRejections?: boolean;
  handleExceptions?: boolean;
  exitOnUncaughtException?: boolean;
  logErrors?: boolean;
}

export interface ErrorReport {
  error: Error;
  timestamp: Date;
  context?: string;
  isPromiseRejection?: boolean;
}

export interface ErrorInfo {
  name: string;
  message: string;
  stack?: string;
  code?: string;
  cause?: ErrorInfo;
  metadata?: Record<string, any>;
}


export interface ErrorTypeConfig {
  message: string;
  statusCode: number;
  logging: boolean;
  logLevel: string;
  isOperational: boolean;
  redactDetails: boolean;
}

export interface ErrorConfig {
  defaultMessages: Record<string, string>;
  errorTypes: Record<string, ErrorTypeConfig>;
  statusCodes: Record<string, number>;
  logging: {
    levels: string[];
    defaultLevel: string;
  };
  errorCodes: Record<string, string>;
}

export interface ErrorContextOptions {
  request?: any;
  user?: any;
  correlationId?: string;
  source?: string;
  isClient?: boolean;
  metadata?: Record<string, any>;
}

export interface ErrorBoundaryConfig {
  logErrors?: boolean;
  showDetails?: boolean;
  captureStackTrace?: boolean;
}
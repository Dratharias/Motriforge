export interface ConnectionPoolConfig {
  readonly host: string;
  readonly port: number;
  readonly database: string;
  readonly user: string;
  readonly password: string;
  readonly max?: number;
  readonly idleTimeoutMillis?: number;
  readonly connectionTimeoutMillis?: number;
  readonly ssl?: boolean | object;
}

export interface Migration {
  readonly version: string;
  readonly name: string;
  readonly up: string;
  readonly down: string;
  readonly timestamp: Date;
}

export interface DatabaseConfig {
  readonly connection: ConnectionPoolConfig;
  readonly migrations: {
    readonly path: string;
    readonly autoRun: boolean;
  };
  readonly indexes: {
    readonly autoCreate: boolean;
    readonly analyzeUsage: boolean;
  };
}


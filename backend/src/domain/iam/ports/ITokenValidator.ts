export interface ITokenValidator {
  validateAccessToken(token: string): Promise<{
    valid: boolean;
    payload?: Record<string, unknown>;
    error?: string;
  }>;
  validateRefreshToken(token: string): Promise<{
    valid: boolean;
    sessionId?: string;
    error?: string;
  }>;
  revokeToken(token: string): Promise<void>;
}


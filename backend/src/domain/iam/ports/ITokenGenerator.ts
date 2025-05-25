export interface ITokenGenerator {
  generateAccessToken(payload: Record<string, unknown>, expiresIn: string): Promise<string>;
  generateRefreshToken(sessionId: string): Promise<string>;
  generateApiKey(identityId: string, scopes: string[]): Promise<string>;
}


import { SignOptions } from "jsonwebtoken";

export interface ITokenGenerator {
  generateAccessToken(payload: Record<string, unknown>, expiresIn: SignOptions['expiresIn']): Promise<string>;
  generateRefreshToken(sessionId: string): Promise<string>;
  generateApiKey(identityId: string, scopes: string[]): Promise<string>;
}


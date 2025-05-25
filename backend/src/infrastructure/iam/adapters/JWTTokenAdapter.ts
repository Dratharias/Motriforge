import jwt from 'jsonwebtoken';
import { ITokenGenerator } from '@/domain/iam/ports/ITokenGenerator';
import { ITokenValidator } from '@/domain/iam/ports/ITokenValidator';
import { randomBytes } from 'crypto';

export class JWTTokenAdapter implements ITokenGenerator, ITokenValidator {
  private readonly revokedTokens = new Set<string>(); // In production, use Redis

  constructor(
    private readonly accessTokenSecret: string,
    private readonly refreshTokenSecret: string,
    private readonly issuer: string = 'iam-service'
  ) {}

  async generateAccessToken(payload: Record<string, unknown>, expiresIn: string): Promise<string> {
    const tokenPayload = {
      ...payload,
      iss: this.issuer,
      iat: Math.floor(Date.now() / 1000),
      jti: randomBytes(16).toString('hex') // Unique token ID
    };

    return jwt.sign(tokenPayload, this.accessTokenSecret, {
      expiresIn,
      algorithm: 'HS256'
    });
  }

  async generateRefreshToken(sessionId: string): Promise<string> {
    const payload = {
      sessionId,
      iss: this.issuer,
      iat: Math.floor(Date.now() / 1000),
      jti: randomBytes(16).toString('hex'),
      type: 'refresh'
    };

    return jwt.sign(payload, this.refreshTokenSecret, {
      expiresIn: '7d',
      algorithm: 'HS256'
    });
  }

  async generateApiKey(identityId: string, scopes: string[]): Promise<string> {
    const payload = {
      sub: identityId,
      scopes,
      iss: this.issuer,
      iat: Math.floor(Date.now() / 1000),
      jti: randomBytes(16).toString('hex'),
      type: 'api_key'
    };

    return jwt.sign(payload, this.accessTokenSecret, {
      expiresIn: '1y',
      algorithm: 'HS256'
    });
  }

  async validateAccessToken(token: string): Promise<{
    valid: boolean;
    payload?: Record<string, unknown>;
    error?: string;
  }> {
    try {
      if (this.revokedTokens.has(token)) {
        return { valid: false, error: 'Token has been revoked' };
      }

      const decoded = jwt.verify(token, this.accessTokenSecret, {
        issuer: this.issuer,
        algorithms: ['HS256']
      });

      return { valid: true, payload: decoded as Record<string, unknown> };
    } catch (error) {
      return { 
        valid: false, 
        error: error instanceof Error ? error.message : 'Invalid token' 
      };
    }
  }

  async validateRefreshToken(token: string): Promise<{
    valid: boolean;
    sessionId?: string;
    error?: string;
  }> {
    try {
      if (this.revokedTokens.has(token)) {
        return { valid: false, error: 'Token has been revoked' };
      }

      const decoded = jwt.verify(token, this.refreshTokenSecret, {
        issuer: this.issuer,
        algorithms: ['HS256']
      }) as any;

      if (decoded.type !== 'refresh') {
        return { valid: false, error: 'Invalid token type' };
      }

      return { valid: true, sessionId: decoded.sessionId };
    } catch (error) {
      return { 
        valid: false, 
        error: error instanceof Error ? error.message : 'Invalid refresh token' 
      };
    }
  }

  async revokeToken(token: string): Promise<void> {
    this.revokedTokens.add(token);
    // In production, you would store this in Redis with TTL equal to token expiry
  }
}


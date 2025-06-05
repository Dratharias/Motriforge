// src/services/auth/JWTManager.ts

import jwt, { type SignOptions, type Secret } from 'jsonwebtoken';
import { randomUUID } from 'crypto';
import type {
  TokenPair,
  TokenPayload,
  RefreshTokenPayload,
  User,
  Permission
} from '@/shared/types/auth.js';
import { authConfig } from '@/config/auth.js';

export class JWTManager {
  private readonly accessTokenSecret: Secret;
  private readonly refreshTokenSecret: Secret;
  private readonly accessTokenExpiry: string;
  private readonly refreshTokenExpiry: string;
  private readonly issuer: string;
  private readonly audience: string;
  private readonly blacklistedTokens = new Set<string>();

  constructor() {
    this.accessTokenSecret = authConfig.jwt.accessTokenSecret;
    this.refreshTokenSecret = authConfig.jwt.refreshTokenSecret;
    this.accessTokenExpiry = authConfig.jwt.accessTokenExpiry;
    this.refreshTokenExpiry = authConfig.jwt.refreshTokenExpiry;
    this.issuer = authConfig.jwt.issuer;
    this.audience = authConfig.jwt.audience;
  }

  generateTokens(user: User, permissions: Permission[]): TokenPair {
    const tokenId = randomUUID();
    const refreshTokenId = randomUUID();

    const accessTokenPayload: Omit<TokenPayload, 'iat' | 'exp'> = {
      sub: user.id,
      email: user.email,
      roles: [],
      permissions: permissions.map(p => `${p.resource}:${p.action}`),
      jti: tokenId,
    };

    const accessTokenOptions: SignOptions = {
      expiresIn: this.parseExpiryToSeconds(this.accessTokenExpiry),
      issuer: this.issuer,
      audience: this.audience,
    };

    const accessToken = jwt.sign(
      accessTokenPayload,
      this.accessTokenSecret,
      accessTokenOptions
    );

    const refreshTokenPayload: Omit<RefreshTokenPayload, 'iat' | 'exp'> = {
      sub: user.id,
      jti: refreshTokenId,
    };

    const refreshTokenOptions: SignOptions = {
      expiresIn: this.parseExpiryToSeconds(this.refreshTokenExpiry),
      issuer: this.issuer,
      audience: this.audience,
    };

    const refreshToken = jwt.sign(
      refreshTokenPayload,
      this.refreshTokenSecret,
      refreshTokenOptions
    );

    return {
      accessToken,
      refreshToken,
      expiresIn: this.parseExpiryToSeconds(this.accessTokenExpiry),
    };
  }

  verifyAccessToken(token: string): TokenPayload {
    try {
      if (this.blacklistedTokens.has(token)) {
        throw new Error('Token has been blacklisted');
      }

      const payload = jwt.verify(token, this.accessTokenSecret, {
        issuer: this.issuer,
        audience: this.audience,
      }) as TokenPayload;

      return payload;
    } catch (error) {
      throw new Error(`Invalid access token: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  verifyRefreshToken(token: string): RefreshTokenPayload {
    try {
      if (this.blacklistedTokens.has(token)) {
        throw new Error('Token has been blacklisted');
      }

      const payload = jwt.verify(token, this.refreshTokenSecret, {
        issuer: this.issuer,
        audience: this.audience,
      }) as RefreshTokenPayload;

      return payload;
    } catch (error) {
      throw new Error(`Invalid refresh token: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  blacklistToken(token: string): void {
    this.blacklistedTokens.add(token);
  }

  private parseExpiryToSeconds(expiry: string): number {
    const unit = expiry.slice(-1);
    const value = parseInt(expiry.slice(0, -1), 10);
    
    switch (unit) {
      case 's': return value;
      case 'm': return value * 60;
      case 'h': return value * 3600;
      case 'd': return value * 86400;
      default: return 900; // 15 minutes default
    }
  }
}
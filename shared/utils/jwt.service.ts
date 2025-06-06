import { jwtVerify, errors, decodeJwt, SignJWT } from 'jose'
import { AuthenticationError } from '../types/errors'

/**
 * JWT Token Payload structure
 */
export interface JWTTokenPayload {
  readonly sub: string // User ID
  readonly email: string
  readonly roles?: readonly string[]
  readonly permissions?: readonly string[]
  readonly institutionId?: string
  readonly iat?: number // Issued at
  readonly exp?: number // Expires at
  readonly iss?: string // Issuer
  readonly aud?: string // Audience
}

/**
 * JWT Service for token generation and verification
 * Uses jose library for modern JWT handling with proper security
 */
export class JWTService {
  private readonly secret: Uint8Array
  private readonly issuer: string
  private readonly audience: string

  constructor(
    secretKey: string,
    issuer: string = 'motriforge',
    audience: string = 'motriforge-api'
  ) {
    if (!secretKey || secretKey.length < 32) {
      throw new Error('JWT secret must be at least 32 characters long')
    }
    
    this.secret = new TextEncoder().encode(secretKey)
    this.issuer = issuer
    this.audience = audience
  }

  /**
   * Generate a JWT token for a user
   */
  public async generateToken(
    userId: string,
    email: string,
    options: {
      roles?: readonly string[]
      permissions?: readonly string[]
      institutionId?: string
      expiresIn?: string | number
    } = {}
  ): Promise<string> {
    const {
      roles = [],
      permissions = [],
      institutionId,
      expiresIn = '24h',
    } = options

    try {
      const payload: Omit<JWTTokenPayload, 'iat' | 'exp' | 'iss' | 'aud'> = {
        sub: userId,
        email,
        ...(roles.length > 0 && { roles }),
        ...(permissions.length > 0 && { permissions }),
        ...(institutionId && { institutionId }),
      }

      const token = await new SignJWT(payload)
        .setProtectedHeader({ alg: 'HS256' })
        .setIssuedAt()
        .setIssuer(this.issuer)
        .setAudience(this.audience)
        .setExpirationTime(expiresIn)
        .sign(this.secret)

      return token
    } catch (error) {
      throw new Error(`Failed to generate JWT token: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Generate a refresh token (longer expiration)
   */
  public async generateRefreshToken(
    userId: string,
    email: string,
    expiresIn: string | number = '7d'
  ): Promise<string> {
    try {
      const payload = {
        sub: userId,
        email,
        type: 'refresh',
      }

      const token = await new SignJWT(payload)
        .setProtectedHeader({ alg: 'HS256' })
        .setIssuedAt()
        .setIssuer(this.issuer)
        .setAudience(this.audience)
        .setExpirationTime(expiresIn)
        .sign(this.secret)

      return token
    } catch (error) {
      throw new Error(`Failed to generate refresh token: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Verify and decode a JWT token
   */
  public async verify(token: string): Promise<JWTTokenPayload> {
    try {
      const { payload } = await jwtVerify(token, this.secret, {
        issuer: this.issuer,
        audience: this.audience,
      })

      // Validate required fields
      if (!payload.sub || typeof payload.sub !== 'string') {
        throw new AuthenticationError('Invalid token: missing or invalid subject')
      }

      if (!payload.email || typeof payload.email !== 'string') {
        throw new AuthenticationError('Invalid token: missing or invalid email')
      }

      return {
        sub: payload.sub,
        email: payload.email,
        roles: Array.isArray(payload.roles) ? payload.roles : [],
        permissions: Array.isArray(payload.permissions) ? payload.permissions : [],
        institutionId: typeof payload.institutionId === 'string' ? payload.institutionId : undefined,
        iat: payload.iat,
        exp: payload.exp,
        iss: payload.iss,
        aud: payload.aud as string,
      }
    } catch (error) {
      if (error instanceof AuthenticationError) {
        throw error
      }

      // Handle specific jose errors
      if (error instanceof errors.JWTExpired) {
        throw new AuthenticationError('Token has expired')
      }

      if (error instanceof errors.JWTInvalid) {
        throw new AuthenticationError('Invalid token format')
      }

      if (error instanceof errors.JWTClaimValidationFailed) {
        throw new AuthenticationError('Token validation failed')
      }

      throw new AuthenticationError('Token verification failed')
    }
  }

  /**
   * Decode token without verification (for debugging)
   */
  public decode(token: string): JWTTokenPayload | null {
    try {
      const payload = decodeJwt(token)
      
      if (!payload.sub || !payload.email) {
        return null
      }

      return {
        sub: payload.sub,
        email: payload.email as string,
        roles: Array.isArray(payload.roles) ? payload.roles : [],
        permissions: Array.isArray(payload.permissions) ? payload.permissions : [],
        institutionId: typeof payload.institutionId === 'string' ? payload.institutionId : undefined,
        iat: payload.iat,
        exp: payload.exp,
        iss: payload.iss,
        aud: payload.aud as string,
      }
    } catch {
      return null
    }
  }

  /**
   * Check if token is expired (without verification)
   */
  public isExpired(token: string): boolean {
    try {
      const decoded = this.decode(token)
      if (!decoded?.exp) {
        return true
      }

      const now = Math.floor(Date.now() / 1000)
      return decoded.exp < now
    } catch {
      return true
    }
  }

  /**
   * Get token expiration date
   */
  public getExpirationDate(token: string): Date | null {
    try {
      const decoded = this.decode(token)
      if (!decoded?.exp) {
        return null
      }

      return new Date(decoded.exp * 1000)
    } catch {
      return null
    }
  }

  /**
   * Extract user ID from token without full verification
   */
  public getUserId(token: string): string | null {
    try {
      const decoded = this.decode(token)
      return decoded?.sub ?? null
    } catch {
      return null
    }
  }
}
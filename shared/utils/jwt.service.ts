import { SignJWT, jwtVerify, type JWTPayload } from 'jose';

export interface JWTTokenPayload extends JWTPayload {
  readonly sub: string;
  readonly email: string;
  readonly roles?: readonly string[];
  readonly permissions?: readonly string[];
  readonly institutionId?: string;
}

export class JWTService {
  private readonly secret: Uint8Array;

  constructor(secretKey: string) {
    this.secret = new TextEncoder().encode(secretKey);
  }

  public async sign(
    payload: Omit<JWTTokenPayload, 'iat' | 'exp'>,
    expiresIn: string = '24h'
  ): Promise<string> {
    const jwt = new SignJWT(payload)
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime(expiresIn);

    return jwt.sign(this.secret);
  }

  public async verify(token: string): Promise<JWTTokenPayload> {
    try {
      const { payload } = await jwtVerify(token, this.secret);
      return payload as JWTTokenPayload;
    } catch (error) {
      throw new Error('Invalid token');
    }
  }
}
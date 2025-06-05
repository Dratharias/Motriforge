import { randomUUID } from 'crypto';
import type {
  User,
  UserCredentials,
  UserRegistration,
  AuthResult
} from '@/shared/types/auth.js';
import { PasswordManager } from './PasswordManager.js';
import { JWTManager } from './JWTManager.js';
import { SessionManager } from './SessionManager.js';
import { RoleManager } from './RoleManager.js';
import { DatabaseService } from '@/database/DatabaseService.js';

interface UserRow {
  readonly id: string;
  readonly email: string;
  readonly first_name: string;
  readonly last_name: string;
  readonly date_of_birth: Date | null;
  readonly notes: string | null;
  readonly password_hash?: string;
  readonly visibility_id: string;
  readonly created_by: string;
  readonly created_at: Date;
  readonly updated_at: Date;
  readonly last_login: Date | null;
  readonly is_active: boolean;
}

export class AuthenticationManager {
  constructor(
    private readonly db: DatabaseService,
    private readonly passwordManager: PasswordManager,
    private readonly jwtManager: JWTManager,
    private readonly sessionManager: SessionManager,
    private readonly roleManager: RoleManager
  ) {}

  async register(userData: UserRegistration, visibilityId: string): Promise<AuthResult> {
    try {
      const passwordValidation = this.passwordManager.validatePasswordStrength(userData.password);
      if (!passwordValidation.isValid) {
        return {
          success: false,
          error: passwordValidation.errors.join(', '),
        };
      }

      const existingUser = await this.getUserByEmail(userData.email);
      if (existingUser) {
        return {
          success: false,
          error: 'User with this email already exists',
        };
      }

      const passwordHash = await this.passwordManager.hashPassword(userData.password);
      const userId = randomUUID();
      const now = new Date();

      await this.db.query(`
        INSERT INTO "user" (
          id, email, first_name, last_name, date_of_birth, notes,
          password_hash, visibility_id, created_by, created_at, updated_at, is_active
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      `, [
        userId,
        userData.email,
        userData.firstName,
        userData.lastName,
        userData.dateOfBirth ?? null,
        userData.notes ?? null,
        passwordHash,
        visibilityId,
        userId,
        now,
        now,
        true,
      ]);

      const user = await this.getUserById(userId);
      if (!user) {
        throw new Error('Failed to retrieve created user');
      }

      const permissions = await this.roleManager.getUserPermissions(userId);
      const tokens = this.jwtManager.generateTokens(user, permissions);
      const refreshTokenPayload = this.jwtManager.verifyRefreshToken(tokens.refreshToken);

      await this.sessionManager.createSession(userId, refreshTokenPayload.jti);

      return {
        success: true,
        user,
        tokens,
      };
    } catch (error) {
      return {
        success: false,
        error: `Registration failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  }

  async authenticate(credentials: UserCredentials, userAgent?: string, ipAddress?: string): Promise<AuthResult> {
    try {
      const user = await this.getUserByEmail(credentials.email);
      if (!user || !user.isActive) {
        return {
          success: false,
          error: 'Invalid credentials',
        };
      }

      const passwordResult = await this.db.query<{ password_hash: string }>(`
        SELECT password_hash FROM "user" WHERE id = $1
      `, [user.id]);

      if (passwordResult.rows.length === 0) {
        return {
          success: false,
          error: 'Invalid credentials',
        };
      }

      const passwordHash = passwordResult.rows[0]?.password_hash;
      if (!passwordHash) {
        return {
          success: false,
          error: 'Invalid credentials',
        };
      }

      const isValidPassword = await this.passwordManager.verifyPassword(
        credentials.password,
        passwordHash
      );

      if (!isValidPassword) {
        return {
          success: false,
          error: 'Invalid credentials',
        };
      }

      await this.db.query(`
        UPDATE "user" SET last_login = NOW() WHERE id = $1
      `, [user.id]);

      const permissions = await this.roleManager.getUserPermissions(user.id);
      const tokens = this.jwtManager.generateTokens(user, permissions);
      const refreshTokenPayload = this.jwtManager.verifyRefreshToken(tokens.refreshToken);

      await this.sessionManager.createSession(user.id, refreshTokenPayload.jti, userAgent, ipAddress);

      return {
        success: true,
        user: { ...user, lastLogin: new Date() },
        tokens,
      };
    } catch (error) {
      return {
        success: false,
        error: `Authentication failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  }

  async refreshTokens(refreshToken: string): Promise<AuthResult> {
    try {
      const payload = this.jwtManager.verifyRefreshToken(refreshToken);
      const session = await this.sessionManager.getSessionByRefreshToken(payload.jti);
      
      if (!session) {
        return {
          success: false,
          error: 'Invalid session',
        };
      }

      const user = await this.getUserById(payload.sub);
      if (!user || !user.isActive) {
        return {
          success: false,
          error: 'User not found or inactive',
        };
      }

      const permissions = await this.roleManager.getUserPermissions(user.id);
      const tokens = this.jwtManager.generateTokens(user, permissions);
      const newRefreshTokenPayload = this.jwtManager.verifyRefreshToken(tokens.refreshToken);

      await this.db.query(`
        UPDATE user_session
        SET refresh_token_id = $1, last_active_at = NOW()
        WHERE id = $2
      `, [newRefreshTokenPayload.jti, session.id]);

      this.jwtManager.blacklistToken(refreshToken);

      return {
        success: true,
        user,
        tokens,
      };
    } catch (error) {
      return {
        success: false,
        error: `Token refresh failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  }

  async logout(sessionId: string, accessToken?: string): Promise<void> {
    try {
      await this.sessionManager.destroySession(sessionId);
      
      if (accessToken) {
        this.jwtManager.blacklistToken(accessToken);
      }
    } catch (error) {
      throw new Error(`Logout failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async changePassword(userId: string, oldPassword: string, newPassword: string): Promise<AuthResult> {
    try {
      const passwordValidation = this.passwordManager.validatePasswordStrength(newPassword);
      if (!passwordValidation.isValid) {
        return {
          success: false,
          error: passwordValidation.errors.join(', '),
        };
      }

      const result = await this.db.query<{ password_hash: string }>(`
        SELECT password_hash FROM "user" WHERE id = $1
      `, [userId]);

      if (result.rows.length === 0) {
        return {
          success: false,
          error: 'User not found',
        };
      }

      const currentPasswordHash = result.rows[0]?.password_hash;
      if (!currentPasswordHash) {
        return {
          success: false,
          error: 'User not found',
        };
      }

      const isValidOldPassword = await this.passwordManager.verifyPassword(
        oldPassword,
        currentPasswordHash
      );

      if (!isValidOldPassword) {
        return {
          success: false,
          error: 'Current password is incorrect',
        };
      }

      const newPasswordHash = await this.passwordManager.hashPassword(newPassword);

      await this.db.query(`
        UPDATE "user"
        SET password_hash = $1, updated_at = NOW()
        WHERE id = $2
      `, [newPasswordHash, userId]);

      await this.sessionManager.destroyUserSessions(userId);

      return {
        success: true,
      };
    } catch (error) {
      return {
        success: false,
        error: `Password change failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  }

  private async getUserByEmail(email: string): Promise<User | null> {
    try {
      const result = await this.db.query<UserRow>(`
        SELECT id, email, first_name, last_name, date_of_birth, notes,
               visibility_id, created_by, created_at, updated_at, last_login, is_active
        FROM "user"
        WHERE email = $1
      `, [email]);

      if (result.rows.length === 0) {
        return null;
      }

      const row = result.rows[0];
      if (!row) {
        return null;
      }

      const user: User = {
        id: row.id,
        email: row.email,
        firstName: row.first_name,
        lastName: row.last_name,
        visibilityId: row.visibility_id,
        createdBy: row.created_by,
        createdAt: new Date(row.created_at),
        updatedAt: new Date(row.updated_at),
        isActive: row.is_active,
      };

      if (row.date_of_birth) {
        Object.assign(user, { dateOfBirth: new Date(row.date_of_birth) });
      }
      if (row.notes) {
        Object.assign(user, { notes: row.notes });
      }
      if (row.last_login) {
        Object.assign(user, { lastLogin: new Date(row.last_login) });
      }

      return user;
    } catch (error) {
      throw new Error(`Failed to get user by email: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private async getUserById(id: string): Promise<User | null> {
    try {
      const result = await this.db.query<UserRow>(`
        SELECT id, email, first_name, last_name, date_of_birth, notes,
               visibility_id, created_by, created_at, updated_at, last_login, is_active
        FROM "user"
        WHERE id = $1
      `, [id]);

      if (result.rows.length === 0) {
        return null;
      }

      const row = result.rows[0];
      if (!row) {
        return null;
      }

      const user: User = {
        id: row.id,
        email: row.email,
        firstName: row.first_name,
        lastName: row.last_name,
        visibilityId: row.visibility_id,
        createdBy: row.created_by,
        createdAt: new Date(row.created_at),
        updatedAt: new Date(row.updated_at),
        isActive: row.is_active,
      };

      if (row.date_of_birth) {
        Object.assign(user, { dateOfBirth: new Date(row.date_of_birth) });
      }
      if (row.notes) {
        Object.assign(user, { notes: row.notes });
      }
      if (row.last_login) {
        Object.assign(user, { lastLogin: new Date(row.last_login) });
      }

      return user;
    } catch (error) {
      throw new Error(`Failed to get user by ID: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}
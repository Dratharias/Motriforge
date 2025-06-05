import { PasswordManager } from './PasswordManager';
import { JWTManager } from './JWTManager';
import { SessionManager } from './SessionManager';
import { RoleManager } from './RoleManager';
import { AuthenticationManager } from './AuthenticationManager';
import { AuthorizationEngine } from './AuthorizationEngine';
import { RateLimitManager } from './RateLimitManager';
import { DatabaseService } from '@/database/DatabaseService';
import { UserRegistration, AuthResult, UserCredentials } from '@/shared/types/auth';

export class AuthenticationFacade {
  private readonly passwordManager: PasswordManager;
  private readonly jwtManager: JWTManager;
  private readonly sessionManager: SessionManager;
  private readonly roleManager: RoleManager;
  private readonly authenticationManager: AuthenticationManager;
  private readonly authorizationEngine: AuthorizationEngine;
  private readonly rateLimitManager: RateLimitManager;

  constructor(db: DatabaseService) {
    this.passwordManager = new PasswordManager();
    this.jwtManager = new JWTManager();
    this.sessionManager = new SessionManager(db);
    this.roleManager = new RoleManager(db);
    this.authenticationManager = new AuthenticationManager(
      db,
      this.passwordManager,
      this.jwtManager,
      this.sessionManager,
      this.roleManager
    );
    this.authorizationEngine = new AuthorizationEngine(this.roleManager);
    this.rateLimitManager = new RateLimitManager();
  }

  async register(userData: UserRegistration, visibilityId: string): Promise<AuthResult> {
    return this.authenticationManager.register(userData, visibilityId);
  }

  async login(credentials: UserCredentials, userAgent?: string, ipAddress?: string): Promise<AuthResult> {
    return this.authenticationManager.authenticate(credentials, userAgent, ipAddress);
  }

  async logout(sessionId: string, accessToken?: string): Promise<void> {
    return this.authenticationManager.logout(sessionId, accessToken);
  }

  async refreshToken(refreshToken: string): Promise<AuthResult> {
    return this.authenticationManager.refreshTokens(refreshToken);
  }

  async changePassword(userId: string, oldPassword: string, newPassword: string): Promise<AuthResult> {
    return this.authenticationManager.changePassword(userId, oldPassword, newPassword);
  }

  async checkPermission(userId: string, resource: string, action: string): Promise<boolean> {
    return this.authorizationEngine.checkPermission(userId, resource, action);
  }

  async getUserPermissions(userId: string) {
    return this.authorizationEngine.getUserPermissions(userId);
  }

  async assignRole(userId: string, roleId: string, assignedBy: string): Promise<void> {
    return this.roleManager.assignRole(userId, roleId, assignedBy);
  }

  async removeRole(userId: string, roleId: string): Promise<void> {
    return this.roleManager.removeRole(userId, roleId);
  }

  get auth() {
    return this.authenticationManager;
  }

  get authz() {
    return this.authorizationEngine;
  }

  get rateLimit() {
    return this.rateLimitManager;
  }

  get jwt() {
    return this.jwtManager;
  }

  get session() {
    return this.sessionManager;
  }

  destroy(): void {
    this.sessionManager.destroy();
    this.rateLimitManager.destroy();
  }
}
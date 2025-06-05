-- Add password_hash column to user table
ALTER TABLE "user" ADD COLUMN password_hash VARCHAR(255);

-- Create user_session table
CREATE TABLE user_session (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
    refresh_token_id UUID NOT NULL UNIQUE,
    user_agent TEXT,
    ip_address INET,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    last_active_at TIMESTAMP NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMP NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT true
);

-- Create indexes for user_session
CREATE INDEX idx_user_session_user_id ON user_session(user_id);
CREATE INDEX idx_user_session_refresh_token_id ON user_session(refresh_token_id);
CREATE INDEX idx_user_session_expires_at ON user_session(expires_at);
CREATE INDEX idx_user_session_active ON user_session(is_active, expires_at);

-- Insert default visibility level
INSERT INTO visibility (id, name, description, level, created_by, created_at, is_active)
VALUES ('00000000-0000-0000-0000-000000000001', 'public', 'Public visibility', 0, '00000000-0000-0000-0000-000000000001', NOW(), true)
ON CONFLICT (id) DO NOTHING;

-- Insert default roles
INSERT INTO role (id, name, display_name, description, level, created_by, created_at, is_active)
VALUES 
  ('00000000-0000-0000-0000-000000000001', 'user', 'User', 'Standard user role', 0, '00000000-0000-0000-0000-000000000001', NOW(), true),
  ('00000000-0000-0000-0000-000000000002', 'admin', 'Administrator', 'Administrator role', 100, '00000000-0000-0000-0000-000000000001', NOW(), true)
ON CONFLICT (id) DO NOTHING;

-- Insert default permissions
INSERT INTO permission (id, name, display_name, description, resource, action, created_by, created_at, is_active)
VALUES 
  ('00000000-0000-0000-0000-000000000001', 'read_exercises', 'Read Exercises', 'Can view exercises', 'exercise', 'read', '00000000-0000-0000-0000-000000000001', NOW(), true),
  ('00000000-0000-0000-0000-000000000002', 'create_exercises', 'Create Exercises', 'Can create exercises', 'exercise', 'create', '00000000-0000-0000-0000-000000000001', NOW(), true),
  ('00000000-0000-0000-0000-000000000003', 'update_exercises', 'Update Exercises', 'Can update exercises', 'exercise', 'update', '00000000-0000-0000-0000-000000000001', NOW(), true),
  ('00000000-0000-0000-0000-000000000004', 'delete_exercises', 'Delete Exercises', 'Can delete exercises', 'exercise', 'delete', '00000000-0000-0000-0000-000000000001', NOW(), true),
  ('00000000-0000-0000-0000-000000000005', 'admin_all', 'Admin All', 'Full admin access', '*', '*', '00000000-0000-0000-0000-000000000001', NOW(), true)
ON CONFLICT (id) DO NOTHING;

-- Assign permissions to roles
INSERT INTO role_permission (role_id, permission_id, created_by, created_at, is_active)
VALUES 
  ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', NOW(), true),
  ('00000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000005', '00000000-0000-0000-0000-000000000001', NOW(), true)
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- frontend/services/auth.ts
import type { 
  UserRegistration, 
  UserCredentials, 
  AuthResult, 
  TokenPair, 
  User 
} from '../../shared/types/auth';

class AuthService {
  private readonly baseUrl = '/api/auth';
  private _user: User | null = null;
  private _tokens: TokenPair | null = null;

  constructor() {
    this.loadFromStorage();
  }

  get user(): User | null {
    return this._user;
  }

  get isAuthenticated(): boolean {
    return this._user !== null && this._tokens !== null;
  }

  get accessToken(): string | null {
    return this._tokens?.accessToken ?? null;
  }

  async register(userData: UserRegistration): Promise<AuthResult> {
    try {
      const response = await fetch(`${this.baseUrl}/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(userData),
      });

      const data = await response.json();

      if (!response.ok) {
        return {
          success: false,
          error: data.error ?? 'Registration failed',
        };
      }

      this._user = data.user;
      this._tokens = data.tokens;
      this.saveToStorage();

      return {
        success: true,
        user: data.user,
        tokens: data.tokens,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Registration failed',
      };
    }
  }

  async login(credentials: UserCredentials): Promise<AuthResult> {
    try {
      const response = await fetch(`${this.baseUrl}/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(credentials),
      });

      const data = await response.json();

      if (!response.ok) {
        return {
          success: false,
          error: data.error ?? 'Login failed',
        };
      }

      this._user = data.user;
      this._tokens = data.tokens;
      this.saveToStorage();

      return {
        success: true,
        user: data.user,
        tokens: data.tokens,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Login failed',
      };
    }
  }

  async logout(): Promise<void> {
    try {
      if (this._tokens?.accessToken) {
        await fetch(`${this.baseUrl}/logout`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${this._tokens.accessToken}`,
          },
        });
      }
    } catch (error) {
      console.error('Logout request failed:', error);
    } finally {
      this._user = null;
      this._tokens = null;
      this.clearStorage();
    }
  }

  async refreshToken(): Promise<boolean> {
    if (!this._tokens?.refreshToken) {
      return false;
    }

    try {
      const response = await fetch(`${this.baseUrl}/refresh`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ refreshToken: this._tokens.refreshToken }),
      });

      if (!response.ok) {
        this.logout();
        return false;
      }

      const data = await response.json();
      this._tokens = data.tokens;
      this.saveToStorage();

      return true;
    } catch (error) {
      console.error('Token refresh failed:', error);
      this.logout();
      return false;
    }
  }

  async getProfile(): Promise<User | null> {
    if (!this._tokens?.accessToken) {
      return null;
    }

    try {
      const response = await fetch(`${this.baseUrl}/me`, {
        headers: {
          'Authorization': `Bearer ${this._tokens.accessToken}`,
        },
      });

      if (!response.ok) {
        if (response.status === 401) {
          const refreshed = await this.refreshToken();
          if (refreshed && this._tokens?.accessToken) {
            return this.getProfile();
          }
        }
        return null;
      }

      const data = await response.json();
      this._user = data.user;
      this.saveToStorage();

      return data.user;
    } catch (error) {
      console.error('Get profile failed:', error);
      return null;
    }
  }

  async changePassword(oldPassword: string, newPassword: string): Promise<AuthResult> {
    if (!this._tokens?.accessToken) {
      return {
        success: false,
        error: 'Not authenticated',
      };
    }

    try {
      const response = await fetch(`${this.baseUrl}/change-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this._tokens.accessToken}`,
        },
        body: JSON.stringify({ oldPassword, newPassword }),
      });

      const data = await response.json();

      if (!response.ok) {
        return {
          success: false,
          error: data.error ?? 'Password change failed',
        };
      }

      return {
        success: true,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Password change failed',
      };
    }
  }

  private saveToStorage(): void {
    if (typeof window !== 'undefined') {
      if (this._user) {
        localStorage.setItem('auth_user', JSON.stringify(this._user));
      }
      if (this._tokens) {
        localStorage.setItem('auth_tokens', JSON.stringify(this._tokens));
      }
    }
  }

  private loadFromStorage(): void {
    if (typeof window !== 'undefined') {
      try {
        const userStr = localStorage.getItem('auth_user');
        const tokensStr = localStorage.getItem('auth_tokens');

        if (userStr) {
          this._user = JSON.parse(userStr);
        }
        if (tokensStr) {
          this._tokens = JSON.parse(tokensStr);
        }
      } catch (error) {
        console.error('Failed to load auth data from storage:', error);
        this.clearStorage();
      }
    }
  }

  private clearStorage(): void {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('auth_user');
      localStorage.removeItem('auth_tokens');
    }
  }
}

export const authService = new AuthService();
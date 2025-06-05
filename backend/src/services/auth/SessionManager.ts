// src/services/auth/SessionManager.ts

import { randomUUID } from 'crypto';
import type { Session } from '@/shared/types/auth.js';
import { authConfig } from '@/config/auth.js';
import { DatabaseService } from '@/database/DatabaseService.js';

export class SessionManager {
  private readonly cleanupInterval: number;
  private readonly maxConcurrentSessions: number;
  private cleanupTimer: NodeJS.Timeout | undefined;

  constructor(private readonly db: DatabaseService) {
    this.cleanupInterval = authConfig.session.cleanupIntervalMs;
    this.maxConcurrentSessions = authConfig.session.maxConcurrentSessions;
    this.startCleanupTimer();
  }

  async createSession(
    userId: string,
    refreshTokenId: string,
    userAgent?: string,
    ipAddress?: string
  ): Promise<Session> {
    try {
      await this.enforceSessionLimit(userId);

      const sessionId = randomUUID();
      const now = new Date();
      const expiresAt = new Date(now.getTime() + this.parseExpiry(authConfig.jwt.refreshTokenExpiry));

      // Create session object with proper typing
      const session: Session = {
        id: sessionId,
        userId,
        refreshTokenId,
        createdAt: now,
        lastActiveAt: now,
        expiresAt,
        isActive: true,
      };

      // Add optional properties if they exist
      if (userAgent) {
        Object.assign(session, { userAgent });
      }
      if (ipAddress) {
        Object.assign(session, { ipAddress });
      }

      await this.db.query(`
        INSERT INTO user_session (
          id, user_id, refresh_token_id, user_agent, ip_address,
          created_at, last_active_at, expires_at, is_active
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      `, [
        session.id,
        session.userId,
        session.refreshTokenId,
        session.userAgent,
        session.ipAddress,
        session.createdAt,
        session.lastActiveAt,
        session.expiresAt,
        session.isActive,
      ]);

      return session;
    } catch (error) {
      throw new Error(`Failed to create session: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async getSession(sessionId: string): Promise<Session | null> {
    try {
      const result = await this.db.query<{
        id: string;
        user_id: string;
        refresh_token_id: string;
        user_agent: string | null;
        ip_address: string | null;
        created_at: Date;
        last_active_at: Date;
        expires_at: Date;
        is_active: boolean;
      }>(`
        SELECT id, user_id, refresh_token_id, user_agent, ip_address,
               created_at, last_active_at, expires_at, is_active
        FROM user_session
        WHERE id = $1 AND is_active = true AND expires_at > NOW()
      `, [sessionId]);

      if (result.rows.length === 0) {
        return null;
      }

      const row = result.rows[0];
      const session: Session = {
        id: row.id,
        userId: row.user_id,
        refreshTokenId: row.refresh_token_id,
        createdAt: new Date(row.created_at),
        lastActiveAt: new Date(row.last_active_at),
        expiresAt: new Date(row.expires_at),
        isActive: row.is_active,
      };

      if (row.user_agent) {
        Object.assign(session, { userAgent: row.user_agent });
      }
      if (row.ip_address) {
        Object.assign(session, { ipAddress: row.ip_address });
      }

      return session;
    } catch (error) {
      throw new Error(`Failed to get session: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async updateLastActivity(sessionId: string): Promise<void> {
    try {
      await this.db.query(`
        UPDATE user_session
        SET last_active_at = NOW()
        WHERE id = $1 AND is_active = true
      `, [sessionId]);
    } catch (error) {
      throw new Error(`Failed to update session activity: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async destroySession(sessionId: string): Promise<void> {
    try {
      await this.db.query(`
        UPDATE user_session
        SET is_active = false
        WHERE id = $1
      `, [sessionId]);
    } catch (error) {
      throw new Error(`Failed to destroy session: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async destroyUserSessions(userId: string): Promise<void> {
    try {
      await this.db.query(`
        UPDATE user_session
        SET is_active = false
        WHERE user_id = $1
      `, [userId]);
    } catch (error) {
      throw new Error(`Failed to destroy user sessions: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async getSessionByRefreshToken(refreshTokenId: string): Promise<Session | null> {
    try {
      const result = await this.db.query<{
        id: string;
        user_id: string;
        refresh_token_id: string;
        user_agent: string | null;
        ip_address: string | null;
        created_at: Date;
        last_active_at: Date;
        expires_at: Date;
        is_active: boolean;
      }>(`
        SELECT id, user_id, refresh_token_id, user_agent, ip_address,
               created_at, last_active_at, expires_at, is_active
        FROM user_session
        WHERE refresh_token_id = $1 AND is_active = true AND expires_at > NOW()
      `, [refreshTokenId]);

      if (result.rows.length === 0) {
        return null;
      }

      const row = result.rows[0];
      const session: Session = {
        id: row.id,
        userId: row.user_id,
        refreshTokenId: row.refresh_token_id,
        createdAt: new Date(row.created_at),
        lastActiveAt: new Date(row.last_active_at),
        expiresAt: new Date(row.expires_at),
        isActive: row.is_active,
      };

      if (row.user_agent) {
        Object.assign(session, { userAgent: row.user_agent });
      }
      if (row.ip_address) {
        Object.assign(session, { ipAddress: row.ip_address });
      }

      return session;
    } catch (error) {
      throw new Error(`Failed to get session by refresh token: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private async enforceSessionLimit(userId: string): Promise<void> {
    try {
      const result = await this.db.query<{ count: string }>(`
        SELECT COUNT(*) as count
        FROM user_session
        WHERE user_id = $1 AND is_active = true AND expires_at > NOW()
      `, [userId]);

      const currentSessions = parseInt(result.rows[0]?.count ?? '0', 10);

      if (currentSessions >= this.maxConcurrentSessions) {
        await this.db.query(`
          UPDATE user_session
          SET is_active = false
          WHERE id = (
            SELECT id FROM user_session
            WHERE user_id = $1 AND is_active = true
            ORDER BY last_active_at ASC
            LIMIT 1
          )
        `, [userId]);
      }
    } catch (error) {
      throw new Error(`Failed to enforce session limit: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private async cleanupExpiredSessions(): Promise<void> {
    try {
      await this.db.query(`
        UPDATE user_session
        SET is_active = false
        WHERE expires_at <= NOW() OR is_active = false
      `);
    } catch (error) {
      console.error('Failed to cleanup expired sessions:', error);
    }
  }

  private startCleanupTimer(): void {
    this.cleanupTimer = setInterval(() => {
      this.cleanupExpiredSessions().catch(console.error);
    }, this.cleanupInterval);
  }

  private parseExpiry(expiry: string): number {
    const unit = expiry.slice(-1);
    const value = parseInt(expiry.slice(0, -1), 10);
    switch (unit) {
      case 's': return value * 1000;
      case 'm': return value * 60 * 1000;
      case 'h': return value * 3600 * 1000;
      case 'd': return value * 86400 * 1000;
      default: return 7 * 86400 * 1000; // 7 days default
    }
  }

  destroy(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = undefined;
    }
  }
}
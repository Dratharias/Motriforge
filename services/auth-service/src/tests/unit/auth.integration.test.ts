import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { AuthServer } from '../../main'

// Mock all dependencies
vi.mock('@/shared/database/database.service', () => ({
  DatabaseService: {
    getInstance: vi.fn().mockReturnValue({
      connect: vi.fn().mockResolvedValue(undefined),
      disconnect: vi.fn().mockResolvedValue(undefined),
    }),
  },
}))

vi.mock('@/shared/database/repositories/user.repository', () => ({
  UserRepository: vi.fn().mockImplementation(() => ({
    findUserByEmail: vi.fn(),
    createUser: vi.fn(),
    updateUserLastLogin: vi.fn(),
    isEmailAvailable: vi.fn().mockResolvedValue(true),
  })),
}))

vi.mock('../../config/auth.config', () => ({
  AuthConfig: {
    fromEnvironment: vi.fn().mockReturnValue({
      port: 3002,
      environment: 'development',
      version: '1.0.0',
      jwt: {
        secret: 'test-secret-key-must-be-at-least-32-characters',
        accessTokenExpiry: '15m',
        refreshTokenExpiry: '7d',
        issuer: 'test-issuer',
        audience: 'test-audience',
      },
      password: {
        minLength: 8,
        requireUppercase: true,
        requireLowercase: true,
        requireNumbers: true,
        requireSpecialChars: true,
        saltRounds: 12,
      },
      rateLimiting: {
        loginAttempts: 5,
        lockoutDuration: 900000,
      },
    }),
  },
}))

describe('Auth Service Integration Tests', () => {
  let app: AuthServer

  beforeEach(async () => {
    // Create test server
    app = new AuthServer()
  })

  afterEach(async () => {
    if (app) {
      await app.shutdown()
    }
  })

  describe('AuthServer', () => {
    it('should create AuthServer instance', () => {
      expect(app).toBeDefined()
      expect(app).toBeInstanceOf(AuthServer)
    })

    it('should have start method', () => {
      expect(typeof app.start).toBe('function')
    })

    it('should have shutdown method', () => {
      expect(typeof app.shutdown).toBe('function')
    })
  })
})

/**
 * Test Environment Configuration
 * Sets up environment variables and mocks for testing
 */

import { beforeAll, beforeEach, afterEach, vi } from 'vitest'

// Set up test environment variables
beforeAll(() => {
  // JWT Configuration - Required for AuthService
  process.env.JWT_SECRET = 'test-jwt-secret-key-minimum-32-characters-long-for-security'
  process.env.JWT_ACCESS_TOKEN_EXPIRY = '15m'
  process.env.JWT_REFRESH_TOKEN_EXPIRY = '7d'
  process.env.JWT_ISSUER = 'motriforge-auth-test'
  process.env.JWT_AUDIENCE = 'motriforge-test'
  
  // Password Configuration
  process.env.PASSWORD_MIN_LENGTH = '8'
  process.env.PASSWORD_REQUIRE_UPPERCASE = 'true'
  process.env.PASSWORD_REQUIRE_LOWERCASE = 'true' 
  process.env.PASSWORD_REQUIRE_NUMBERS = 'true'
  process.env.PASSWORD_REQUIRE_SPECIAL = 'true'
  process.env.PASSWORD_SALT_ROUNDS = '10' // Lower for faster tests
  
  // Rate Limiting Configuration
  process.env.RATE_LIMIT_LOGIN_ATTEMPTS = '5'
  process.env.RATE_LIMIT_LOCKOUT_DURATION = '900000' // 15 minutes
  
  // Service Configuration
  process.env.AUTH_SERVICE_PORT = '3002'
  process.env.NODE_ENV = 'test'
  process.env.AUTH_SERVICE_VERSION = '1.0.0'
})

// Mock Date.now for consistent testing
let mockDateNow: typeof Date.now

beforeEach(() => {
  mockDateNow = vi.fn(() => new Date('2024-06-07T10:00:00Z').getTime())
  vi.stubGlobal('Date', {
    ...Date,
    now: mockDateNow
  })
})

afterEach(() => {
  vi.unstubAllGlobals()
})

export { mockDateNow }
import { vi } from 'vitest'

// Mock bcrypt for testing
vi.mock('bcrypt', () => ({
  hash: vi.fn().mockResolvedValue('$2b$12$hashed_password'),
  compare: vi.fn(),
}))

// Mock JWT Service
vi.mock('@/shared/utils/jwt.service', () => ({
  JWTService: vi.fn().mockImplementation(() => ({
    generateToken: vi.fn().mockResolvedValue('mock_access_token'),
    generateRefreshToken: vi.fn().mockResolvedValue('mock_refresh_token'),
    verify: vi.fn(),
  })),
}))

// Mock Logger
vi.mock('@/shared/utils/logger', () => ({
  createLogger: vi.fn().mockReturnValue({
    info: vi.fn(),
    debug: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  }),
}))

// Mock Database Service
vi.mock('@/shared/database/database.service', () => ({
  DatabaseService: {
    getInstance: vi.fn().mockReturnValue({
      connect: vi.fn().mockResolvedValue(undefined),
      disconnect: vi.fn().mockResolvedValue(undefined),
    }),
  },
}))

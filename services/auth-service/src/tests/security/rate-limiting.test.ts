import { describe, it, expect, beforeEach, vi } from 'vitest'
import { AuthService } from '../../services/auth.service'
import { AuthConfig } from '../../config/auth.config'
import { AuthenticationError } from '../../../../../shared/types/errors'
import { createMockUserRepository } from '../mocks/user-repository.mock'

describe('Rate Limiting Security Tests', () => {
  let authService: AuthService
  let mockUserRepository: ReturnType<typeof createMockUserRepository>
  let mockConfig: AuthConfig

  beforeEach(() => {
    mockUserRepository = createMockUserRepository()
    
    mockConfig = {
      rateLimiting: {
        loginAttempts: 3, // Lower limit for faster testing
        lockoutDuration: 1000, // 1 second for testing
      },
    } as AuthConfig

    authService = new AuthService(mockUserRepository as any, mockConfig)
  })

  it('should allow login attempts up to the limit', async () => {
    // Arrange
    mockUserRepository.findUserByEmail.mockResolvedValue(null) // Simulate failed login

    const credentials = { email: 'test@example.com', password: 'wrong' }

    // Act & Assert - First 3 attempts should fail with AuthenticationError
    for (let i = 0; i < 3; i++) {
      await expect(authService.login(credentials))
        .rejects.toThrow(AuthenticationError)
      
      const error = await authService.login(credentials).catch(e => e)
      expect(error.message).not.toContain('Too many login attempts')
    }
  })

  it('should enforce rate limiting after exceeding attempts', async () => {
    // Arrange
    mockUserRepository.findUserByEmail.mockResolvedValue(null)
    const credentials = { email: 'test@example.com', password: 'wrong' }

    // Act - Exceed the limit
    for (let i = 0; i < 3; i++) {
      await authService.login(credentials).catch(() => {})
    }

    // Assert - Next attempt should be rate limited
    await expect(authService.login(credentials))
      .rejects.toThrow('Too many login attempts')
  })

  it('should reset rate limiting after lockout period', async () => {
    // Arrange
    mockUserRepository.findUserByEmail.mockResolvedValue(null)
    const credentials = { email: 'test@example.com', password: 'wrong' }

    // Act - Trigger rate limit
    for (let i = 0; i < 4; i++) {
      await authService.login(credentials).catch(() => {})
    }

    // Wait for lockout period to expire
    await new Promise(resolve => setTimeout(resolve, 1100))

    // Assert - Should allow attempts again
    const error = await authService.login(credentials).catch(e => e)
    expect(error.message).not.toContain('Too many login attempts')
  })

  it('should clear rate limiting on successful login', async () => {
    // Arrange
    const mockUser = { id: '123', email: 'test@example.com', password: 'hashed' }
    
    // First make some failed attempts
    mockUserRepository.findUserByEmail.mockResolvedValue(null)
    const credentials = { email: 'test@example.com', password: 'wrong' }
    
    for (let i = 0; i < 2; i++) {
      await authService.login(credentials).catch(() => {})
    }

    // Then successful login
    mockUserRepository.findUserByEmail.mockResolvedValue(mockUser)
    mockUserRepository.updateUserLastLogin.mockResolvedValue(undefined)
    vi.mocked(require('bcrypt').compare).mockResolvedValue(true)

    await authService.login({ email: 'test@example.com', password: 'correct' })

    // Assert - Failed attempts should be reset
    mockUserRepository.findUserByEmail.mockResolvedValue(null)
    const error = await authService.login(credentials).catch(e => e)
    expect(error.message).not.toContain('Too many login attempts')
  })
})

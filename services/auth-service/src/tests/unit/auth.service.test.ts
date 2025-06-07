import { describe, it, expect, beforeEach, vi } from 'vitest'
import * as bcrypt from 'bcrypt'
import { AuthService } from '../../services/auth.service'
import { AuthConfig } from '../../config/auth.config'
import { 
  AuthenticationError, 
  ValidationError, 
  BusinessLogicError 
} from '../../../../../shared/types/errors'
import { createMockUserRepository, mockUser } from '../mocks/user-repository.mock'

// Mock bcrypt
const mockBcrypt = bcrypt as any
mockBcrypt.compare = vi.fn()
mockBcrypt.hash = vi.fn()

describe('AuthService', () => {
  let authService: AuthService
  let mockUserRepository: ReturnType<typeof createMockUserRepository>
  let mockConfig: AuthConfig
  let mockJwtService: any

  beforeEach(() => {
    vi.clearAllMocks()
    
    mockUserRepository = createMockUserRepository()
    
    mockConfig = {
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
      isProduction: () => false,
      isDevelopment: () => true,
    } as AuthConfig

    mockJwtService = {
      generateToken: vi.fn().mockResolvedValue('mock_access_token'),
      generateRefreshToken: vi.fn().mockResolvedValue('mock_refresh_token'),
      verify: vi.fn(),
    }

    authService = new AuthService(mockUserRepository as any, mockConfig)
    ;(authService as any).jwtService = mockJwtService
  })

  describe('login', () => {
    const validCredentials = {
      email: 'test@example.com',
      password: 'password123',
    }

    it('should login successfully with valid credentials', async () => {
      // Arrange
      mockUserRepository.findUserByEmail.mockResolvedValue(mockUser)
      mockBcrypt.compare.mockResolvedValue(true)
      mockUserRepository.updateUserLastLogin.mockResolvedValue(undefined)

      // Act
      const result = await authService.login(validCredentials)

      // Assert
      expect(result).toEqual({
        user: {
          id: mockUser.id,
          email: mockUser.email,
          firstName: mockUser.firstName,
          lastName: mockUser.lastName,
          ageRange: mockUser.ageRange, // Include ageRange in expected result
        },
        tokens: {
          accessToken: 'mock_access_token',
          refreshToken: 'mock_refresh_token',
          expiresIn: 900, // 15 minutes
          tokenType: 'Bearer',
        },
      })

      expect(mockUserRepository.findUserByEmail).toHaveBeenCalledWith('test@example.com')
      expect(mockBcrypt.compare).toHaveBeenCalledWith('password123', '$2b$12$hashed_password')
      expect(mockUserRepository.updateUserLastLogin).toHaveBeenCalledWith(mockUser.id)
    })

    it('should throw AuthenticationError for non-existent user', async () => {
      // Arrange
      mockUserRepository.findUserByEmail.mockResolvedValue(null)

      // Act & Assert
      await expect(authService.login(validCredentials))
        .rejects.toThrow(AuthenticationError)
      
      expect(mockBcrypt.compare).not.toHaveBeenCalled()
    })

    it('should throw AuthenticationError for invalid password', async () => {
      // Arrange
      mockUserRepository.findUserByEmail.mockResolvedValue(mockUser)
      mockBcrypt.compare.mockResolvedValue(false)

      // Act & Assert
      await expect(authService.login(validCredentials))
        .rejects.toThrow(AuthenticationError)
    })

    it('should enforce rate limiting after multiple failed attempts', async () => {
      // Arrange
      mockUserRepository.findUserByEmail.mockResolvedValue(null)

      // Act - Make 5 failed login attempts
      for (let i = 0; i < 5; i++) {
        await expect(authService.login(validCredentials))
          .rejects.toThrow(AuthenticationError)
      }

      // Assert - 6th attempt should be rate limited
      await expect(authService.login(validCredentials))
        .rejects.toThrow('Too many login attempts')
    })
  })

  describe('register', () => {
    const validRegisterData = {
      email: 'newuser@example.com',
      password: 'Password123!',
      firstName: 'Jane',
      lastName: 'Smith',
      dateOfBirth: null,
    }

    it('should register user successfully with valid data', async () => {
      // Arrange
      mockUserRepository.isEmailAvailable.mockResolvedValue(true)
      mockBcrypt.hash.mockResolvedValue('$2b$12$new_hashed_password')
      const newUser = { ...mockUser, id: 'new-user-123', email: 'newuser@example.com' }
      mockUserRepository.createUser.mockResolvedValue(newUser)

      // Act
      const result = await authService.register(validRegisterData)

      // Assert
      expect(result.user.email).toBe('newuser@example.com')
      expect(result.tokens.accessToken).toBe('mock_access_token')
      
      expect(mockUserRepository.isEmailAvailable).toHaveBeenCalledWith('newuser@example.com')
      expect(mockBcrypt.hash).toHaveBeenCalledWith('Password123!', 12)
      expect(mockUserRepository.createUser).toHaveBeenCalledWith({
        email: 'newuser@example.com',
        firstName: 'Jane',
        lastName: 'Smith',
        dateOfBirth: null,
        visibilityId: 'default-visibility-id',
        createdBy: 'system',
        password: '$2b$12$new_hashed_password',
      })
    })

    it('should throw BusinessLogicError for existing email', async () => {
      // Arrange
      mockUserRepository.isEmailAvailable.mockResolvedValue(false)

      // Act & Assert
      await expect(authService.register(validRegisterData))
        .rejects.toThrow(BusinessLogicError)
    })

    it('should validate password requirements', async () => {
      // Test cases for password validation
      const invalidPasswords = [
        { password: '123', error: 'at least 8 characters' },
        { password: 'lowercase', error: 'uppercase letter' },
        { password: 'UPPERCASE', error: 'lowercase letter' },
        { password: 'NoNumbers!', error: 'number' },
        { password: 'NoSpecial123', error: 'special character' },
      ]

      for (const { password, error } of invalidPasswords) {
        const invalidData = { ...validRegisterData, password }
        
        await expect(authService.register(invalidData))
          .rejects.toThrow(ValidationError)
      }
    })
  })

  describe('refreshToken', () => {
    it('should refresh tokens successfully with valid refresh token', async () => {
      // Arrange
      const refreshTokenRequest = { refreshToken: 'valid_refresh_token' }
      
      mockJwtService.verify.mockResolvedValue({
        sub: mockUser.id,
        email: mockUser.email,
        type: 'refresh',
      })
      mockUserRepository.findUserById.mockResolvedValue(mockUser)

      // Act
      const result = await authService.refreshToken(refreshTokenRequest)

      // Assert
      expect(result).toEqual({
        accessToken: 'mock_access_token',
        refreshToken: 'mock_refresh_token',
        expiresIn: 900,
        tokenType: 'Bearer',
      })

      expect(mockJwtService.verify).toHaveBeenCalledWith('valid_refresh_token')
      expect(mockUserRepository.findUserById).toHaveBeenCalledWith(mockUser.id)
    })

    it('should throw AuthenticationError for invalid refresh token type', async () => {
      // Arrange
      mockJwtService.verify.mockResolvedValue({
        sub: mockUser.id,
        email: mockUser.email,
        type: 'access', // Wrong type
      })

      // Act & Assert
      await expect(authService.refreshToken({ refreshToken: 'invalid_token' }))
        .rejects.toThrow(AuthenticationError)
    })

    it('should throw AuthenticationError for non-existent user', async () => {
      // Arrange
      mockJwtService.verify.mockResolvedValue({
        sub: 'non-existent-user',
        email: 'test@example.com',
        type: 'refresh',
      })
      mockUserRepository.findUserById.mockResolvedValue(null)

      // Act & Assert
      await expect(authService.refreshToken({ refreshToken: 'valid_token' }))
        .rejects.toThrow(AuthenticationError)
    })
  })

  describe('verifyToken', () => {
    it('should verify token and return user', async () => {
      // Arrange
      mockJwtService.verify.mockResolvedValue({
        sub: mockUser.id,
        email: mockUser.email,
      })
      mockUserRepository.findUserById.mockResolvedValue(mockUser)

      // Act
      const result = await authService.verifyToken('valid_token')

      // Assert
      expect(result).toEqual(mockUser)
      expect(mockJwtService.verify).toHaveBeenCalledWith('valid_token')
      expect(mockUserRepository.findUserById).toHaveBeenCalledWith(mockUser.id)
    })

    it('should throw AuthenticationError for invalid token', async () => {
      // Arrange
      mockJwtService.verify.mockRejectedValue(new AuthenticationError('Invalid token'))

      // Act & Assert
      await expect(authService.verifyToken('invalid_token'))
        .rejects.toThrow(AuthenticationError)
    })
  })

  describe('changePassword', () => {
    const passwordChangeRequest = {
      currentPassword: 'oldPassword123',
      newPassword: 'NewPassword456!',
    }

    it('should change password successfully', async () => {
      // Arrange
      mockUserRepository.findUserById.mockResolvedValue(mockUser)
      mockBcrypt.compare.mockResolvedValue(true)
      mockBcrypt.hash.mockResolvedValue('$2b$12$new_hashed_password')
      mockUserRepository.updateUser.mockResolvedValue(undefined)

      // Act
      await authService.changePassword(mockUser.id, passwordChangeRequest)

      // Assert
      expect(mockBcrypt.compare).toHaveBeenCalledWith('oldPassword123', '$2b$12$hashed_password')
      expect(mockBcrypt.hash).toHaveBeenCalledWith('NewPassword456!', 12)
      expect(mockUserRepository.updateUser).toHaveBeenCalledWith(mockUser.id, {
        password: '$2b$12$new_hashed_password',
      })
    })

    it('should throw AuthenticationError for incorrect current password', async () => {
      // Arrange
      mockUserRepository.findUserById.mockResolvedValue(mockUser)
      mockBcrypt.compare.mockResolvedValue(false)

      // Act & Assert
      await expect(authService.changePassword(mockUser.id, passwordChangeRequest))
        .rejects.toThrow(AuthenticationError)
    })

    it('should validate new password requirements', async () => {
      // Arrange
      mockUserRepository.findUserById.mockResolvedValue(mockUser)
      mockBcrypt.compare.mockResolvedValue(true)

      const invalidRequest = {
        currentPassword: 'oldPassword123',
        newPassword: 'weak', // Invalid password
      }

      // Act & Assert
      await expect(authService.changePassword(mockUser.id, invalidRequest))
        .rejects.toThrow(ValidationError)
    })
  })

  describe('logout', () => {
    it('should logout successfully', async () => {
      // Act & Assert
      await expect(authService.logout(mockUser.id)).resolves.toBeUndefined()
    })
  })

  describe('requestPasswordReset', () => {
    it('should handle password reset request for existing user', async () => {
      // Arrange
      mockUserRepository.findUserByEmail.mockResolvedValue(mockUser)

      // Act & Assert
      await expect(authService.requestPasswordReset({ email: mockUser.email }))
        .resolves.toBeUndefined()
    })

    it('should handle password reset request for non-existent user gracefully', async () => {
      // Arrange
      mockUserRepository.findUserByEmail.mockResolvedValue(null)

      // Act & Assert
      await expect(authService.requestPasswordReset({ email: 'nonexistent@example.com' }))
        .resolves.toBeUndefined()
    })
  })
})
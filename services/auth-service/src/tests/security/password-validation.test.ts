import { describe, it, expect, beforeEach } from 'vitest'
import { AuthService } from '../../services/auth.service'
import { AuthConfig } from '../../config/auth.config'
import { createMockUserRepository } from '../mocks/user-repository.mock'

describe('Password Validation Security Tests', () => {
  let authService: AuthService
  let mockUserRepository: ReturnType<typeof createMockUserRepository>

  beforeEach(() => {
    mockUserRepository = createMockUserRepository()
    
    const mockConfig = {
      password: {
        minLength: 8,
        requireUppercase: true,
        requireLowercase: true,
        requireNumbers: true,
        requireSpecialChars: true,
        saltRounds: 12,
      },
    } as AuthConfig

    authService = new AuthService(mockUserRepository as any, mockConfig)
    mockUserRepository.isEmailAvailable.mockResolvedValue(true)
  })

  const testCases = [
    {
      password: '123',
      expectedError: 'at least 8 characters',
      description: 'too short password',
    },
    {
      password: 'alllowercase123!',
      expectedError: 'uppercase letter',
      description: 'missing uppercase',
    },
    {
      password: 'ALLUPPERCASE123!',
      expectedError: 'lowercase letter', 
      description: 'missing lowercase',
    },
    {
      password: 'NoNumbersHere!',
      expectedError: 'number',
      description: 'missing numbers',
    },
    {
      password: 'NoSpecialChars123',
      expectedError: 'special character',
      description: 'missing special characters',
    },
  ]

  testCases.forEach(({ password, expectedError, description }) => {
    it(`should reject ${description}`, async () => {
      const registerData = {
        email: 'test@example.com',
        password,
        firstName: 'John',
        lastName: 'Doe',
        dateOfBirth: null,
      }

      await expect(authService.register(registerData))
        .rejects.toThrow(expectedError)
    })
  })

  it('should accept valid password', async () => {
    const registerData = {
      email: 'test@example.com',
      password: 'ValidPassword123!',
      firstName: 'John',
      lastName: 'Doe', 
      dateOfBirth: null,
    }

    // Should not throw validation error
    await expect(authService.register(registerData)).resolves.toBeDefined()
  })
})
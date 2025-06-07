import { describe, it, expect, beforeEach, vi } from 'vitest'
import { AuthController } from '../../controllers/auth.controller'
import { 
  AuthenticationError,
  BusinessLogicError,
} from '../../../../../shared/types/errors'

describe('AuthController', () => {
  let authController: AuthController
  let mockAuthService: any
  let mockReq: any
  let mockRes: any

  beforeEach(() => {
    vi.clearAllMocks()

    mockAuthService = {
      login: vi.fn(),
      register: vi.fn(),
      refreshToken: vi.fn(),
      logout: vi.fn(),
      verifyToken: vi.fn(),
      changePassword: vi.fn(),
      requestPasswordReset: vi.fn(),
    }

    authController = new AuthController(mockAuthService)

    // Mock request and response objects
    mockReq = {
      method: 'POST',
      url: '/auth/login',
      headers: {},
      [Symbol.asyncIterator]: async function* () {
        yield Buffer.from('{"email":"test@example.com","password":"password123"}')
      },
    }

    mockRes = {
      statusCode: 200,
      setHeader: vi.fn(),
      end: vi.fn(),
      headersSent: false,
    }
  })

  describe('handleRequest', () => {
    it('should handle login request successfully', async () => {
      // Arrange
      const authResult = {
        user: { id: '123', email: 'test@example.com', firstName: 'John', lastName: 'Doe' },
        tokens: { accessToken: 'token', refreshToken: 'refresh', expiresIn: 900, tokenType: 'Bearer' as const },
      }
      mockAuthService.login.mockResolvedValue(authResult)

      // Act
      await authController.handleRequest(mockReq, mockRes, '/auth/login', 'POST')

      // Assert
      expect(mockAuthService.login).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'password123',
      })
      expect(mockRes.statusCode).toBe(200)
      expect(mockRes.end).toHaveBeenCalled()
    })

    it('should handle register request successfully', async () => {
      // Arrange
      mockReq[Symbol.asyncIterator] = async function* () {
        yield Buffer.from(JSON.stringify({
          email: 'newuser@example.com',
          password: 'Password123!',
          firstName: 'Jane',
          lastName: 'Smith',
        }))
      }

      const authResult = {
        user: { id: '456', email: 'newuser@example.com', firstName: 'Jane', lastName: 'Smith' },
        tokens: { accessToken: 'token', refreshToken: 'refresh', expiresIn: 900, tokenType: 'Bearer' as const },
      }
      mockAuthService.register.mockResolvedValue(authResult)

      // Act
      await authController.handleRequest(mockReq, mockRes, '/auth/register', 'POST')

      // Assert
      expect(mockAuthService.register).toHaveBeenCalledWith({
        email: 'newuser@example.com',
        password: 'Password123!',
        firstName: 'Jane',
        lastName: 'Smith',
        dateOfBirth: null,
      })
      expect(mockRes.statusCode).toBe(201)
    })

    it('should handle refresh token request', async () => {
      // Arrange
      mockReq[Symbol.asyncIterator] = async function* () {
        yield Buffer.from('{"refreshToken":"valid_refresh_token"}')
      }

      const tokens = {
        accessToken: 'new_token',
        refreshToken: 'new_refresh',
        expiresIn: 900,
        tokenType: 'Bearer' as const,
      }
      mockAuthService.refreshToken.mockResolvedValue(tokens)

      // Act
      await authController.handleRequest(mockReq, mockRes, '/auth/refresh', 'POST')

      // Assert
      expect(mockAuthService.refreshToken).toHaveBeenCalledWith({
        refreshToken: 'valid_refresh_token',
      })
      expect(mockRes.statusCode).toBe(200)
    })

    it('should handle verification request', async () => {
      // Arrange
      mockReq[Symbol.asyncIterator] = async function* () {
        yield Buffer.from('{"token":"valid_token"}')
      }

      const user = {
        id: '123',
        email: 'test@example.com',
        firstName: 'John',
        lastName: 'Doe',
      }
      mockAuthService.verifyToken.mockResolvedValue(user)

      // Act
      await authController.handleRequest(mockReq, mockRes, '/auth/verify', 'POST')

      // Assert
      expect(mockAuthService.verifyToken).toHaveBeenCalledWith('valid_token')
      expect(mockRes.statusCode).toBe(200)
    })

    it('should handle logout request', async () => {
      // Arrange
      mockReq.headers.authorization = 'Bearer valid_token'
      mockReq[Symbol.asyncIterator] = async function* () {
        yield Buffer.from('{}')
      }

      mockAuthService.verifyToken.mockResolvedValue({ id: '123' })
      mockAuthService.logout.mockResolvedValue(undefined)

      // Act
      await authController.handleRequest(mockReq, mockRes, '/auth/logout', 'POST')

      // Assert
      expect(mockAuthService.logout).toHaveBeenCalledWith('123')
      expect(mockRes.statusCode).toBe(200)
    })

    it('should handle validation errors', async () => {
      // Arrange
      mockReq[Symbol.asyncIterator] = async function* () {
        yield Buffer.from('{"email":""}') // Missing password
      }

      // Act
      await authController.handleRequest(mockReq, mockRes, '/auth/login', 'POST')

      // Assert
      expect(mockRes.statusCode).toBe(400)
      expect(mockAuthService.login).not.toHaveBeenCalled()
    })

    it('should handle authentication errors', async () => {
      // Arrange
      mockAuthService.login.mockRejectedValue(new AuthenticationError('Invalid credentials'))

      // Act
      await authController.handleRequest(mockReq, mockRes, '/auth/login', 'POST')

      // Assert
      expect(mockRes.statusCode).toBe(401)
    })

    it('should handle business logic errors', async () => {
      // Arrange
      mockReq[Symbol.asyncIterator] = async function* () {
        yield Buffer.from(JSON.stringify({
          email: 'existing@example.com',
          password: 'Password123!',
          firstName: 'Jane',
          lastName: 'Smith',
        }))
      }

      mockAuthService.register.mockRejectedValue(new BusinessLogicError('Email already registered'))

      // Act
      await authController.handleRequest(mockReq, mockRes, '/auth/register', 'POST')

      // Assert
      expect(mockRes.statusCode).toBe(422)
    })

    it('should handle 404 for unknown routes', async () => {
      // Act
      await authController.handleRequest(mockReq, mockRes, '/auth/unknown', 'POST')

      // Assert
      expect(mockRes.statusCode).toBe(404)
    })

    it('should handle invalid JSON in request body', async () => {
      // Arrange
      mockReq[Symbol.asyncIterator] = async function* () {
        yield Buffer.from('invalid json')
      }

      // Act
      await authController.handleRequest(mockReq, mockRes, '/auth/login', 'POST')

      // Assert
      expect(mockRes.statusCode).toBe(400)
    })
  })
})
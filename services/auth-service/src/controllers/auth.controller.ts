import { IncomingMessage, ServerResponse } from 'node:http'
import { AuthService } from '../services/auth.service'
import { logger } from '../utils/logger'
import { 
  createSuccessResponse, 
  createErrorResponse,
  createValidationErrorResponse
} from '@/shared/types/responses'
import { 
  APIError,
  ValidationError,
  AuthenticationError,
  BusinessLogicError
} from '@/shared/types/errors'

export class AuthController {
  private readonly authService: AuthService

  constructor(authService: AuthService) {
    this.authService = authService
  }

  public async handleRequest(
    req: IncomingMessage, 
    res: ServerResponse, 
    pathname: string, 
    method: string
  ): Promise<void> {
    try {
      const requestId = this.generateRequestId()

      res.setHeader('Content-Type', 'application/json')
      res.setHeader('X-Request-ID', requestId)

      if (pathname === '/auth/login' && method === 'POST') {
        await this.handleLogin(req, res, requestId)
      } else if (pathname === '/auth/register' && method === 'POST') {
        await this.handleRegister(req, res, requestId)
      } else if (pathname === '/auth/refresh' && method === 'POST') {
        await this.handleRefreshToken(req, res, requestId)
      } else if (pathname === '/auth/logout' && method === 'POST') {
        await this.handleLogout(req, res, requestId)
      } else if (pathname === '/auth/verify' && method === 'POST') {
        await this.handleVerifyToken(req, res, requestId)
      } else if (pathname === '/auth/change-password' && method === 'POST') {
        await this.handleChangePassword(req, res, requestId)
      } else if (pathname === '/auth/reset-password' && method === 'POST') {
        await this.handlePasswordReset(req, res, requestId)
      } else {
        res.statusCode = 404
        res.end(JSON.stringify(createErrorResponse(
          'ROUTE_NOT_FOUND',
          `Route ${method} ${pathname} not found`,
          requestId
        )))
      }
    } catch (error) {
      await this.handleControllerError(error, res)
    }
  }

  private async handleRegister(req: IncomingMessage, res: ServerResponse, requestId: string): Promise<void> {
    try {
      const body = await this.parseRequestBody(req)
      
      const validationErrors = []
      if (!body.email) validationErrors.push({ field: 'email', message: 'Email is required' })
      if (!body.password) validationErrors.push({ field: 'password', message: 'Password is required' })
      if (!body.firstName) validationErrors.push({ field: 'firstName', message: 'First name is required' })
      if (!body.lastName) validationErrors.push({ field: 'lastName', message: 'Last name is required' })

      if (validationErrors.length > 0) {
        res.statusCode = 400
        res.end(JSON.stringify(createValidationErrorResponse(validationErrors, requestId)))
        return
      }

      const result = await this.authService.register({
        email: body.email,
        password: body.password,
        firstName: body.firstName,
        lastName: body.lastName,
        dateOfBirth: body.dateOfBirth
      })

      res.statusCode = 201
      res.end(JSON.stringify(createSuccessResponse(result, requestId)))
    } catch (error) {
      await this.handleAuthError(error, res, requestId)
    }
  }

  private async handleLogin(req: IncomingMessage, res: ServerResponse, requestId: string): Promise<void> {
    try {
      const body = await this.parseRequestBody(req)
      
      if (!body.email || !body.password) {
        res.statusCode = 400
        res.end(JSON.stringify(createValidationErrorResponse([
          ...(body.email ? [] : [{ field: 'email', message: 'Email is required' }]),
          ...(body.password ? [] : [{ field: 'password', message: 'Password is required' }])
        ], requestId)))
        return
      }

      const result = await this.authService.login({
        email: body.email,
        password: body.password
      })

      res.statusCode = 200
      res.end(JSON.stringify(createSuccessResponse(result, requestId)))
    } catch (error) {
      await this.handleAuthError(error, res, requestId)
    }
  }

  private async handleRefreshToken(req: IncomingMessage, res: ServerResponse, requestId: string): Promise<void> {
    try {
      const body = await this.parseRequestBody(req)
      
      if (!body.refreshToken) {
        res.statusCode = 400
        res.end(JSON.stringify(createValidationErrorResponse([
          { field: 'refreshToken', message: 'Refresh token is required' }
        ], requestId)))
        return
      }

      const tokens = await this.authService.refreshToken({
        refreshToken: body.refreshToken
      })

      res.statusCode = 200
      res.end(JSON.stringify(createSuccessResponse(tokens, requestId)))
    } catch (error) {
      await this.handleAuthError(error, res, requestId)
    }
  }

  private async handleLogout(req: IncomingMessage, res: ServerResponse, requestId: string): Promise<void> {
    try {
      const userId = await this.extractUserIdFromToken(req)
      
      await this.authService.logout(userId)

      res.statusCode = 200
      res.end(JSON.stringify(createSuccessResponse({ success: true }, requestId)))
    } catch (error) {
      await this.handleAuthError(error, res, requestId)
    }
  }

  private async handleVerifyToken(req: IncomingMessage, res: ServerResponse, requestId: string): Promise<void> {
    try {
      const body = await this.parseRequestBody(req)
      
      if (!body.token) {
        res.statusCode = 400
        res.end(JSON.stringify(createValidationErrorResponse([
          { field: 'token', message: 'Token is required' }
        ], requestId)))
        return
      }

      const user = await this.authService.verifyToken(body.token)

      res.statusCode = 200
      res.end(JSON.stringify(createSuccessResponse({
        valid: true,
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName
        }
      }, requestId)))
    } catch (error) {
      await this.handleAuthError(error, res, requestId)
    }
  }

  private async handleChangePassword(req: IncomingMessage, res: ServerResponse, requestId: string): Promise<void> {
    try {
      const userId = await this.extractUserIdFromToken(req)
      const body = await this.parseRequestBody(req)
      
      const validationErrors = []
      if (!body.currentPassword) validationErrors.push({ field: 'currentPassword', message: 'Current password is required' })
      if (!body.newPassword) validationErrors.push({ field: 'newPassword', message: 'New password is required' })

      if (validationErrors.length > 0) {
        res.statusCode = 400
        res.end(JSON.stringify(createValidationErrorResponse(validationErrors, requestId)))
        return
      }

      await this.authService.changePassword(userId, {
        currentPassword: body.currentPassword,
        newPassword: body.newPassword
      })

      res.statusCode = 200
      res.end(JSON.stringify(createSuccessResponse({ success: true }, requestId)))
    } catch (error) {
      await this.handleAuthError(error, res, requestId)
    }
  }

  private async handlePasswordReset(req: IncomingMessage, res: ServerResponse, requestId: string): Promise<void> {
    try {
      const body = await this.parseRequestBody(req)
      
      if (!body.email) {
        res.statusCode = 400
        res.end(JSON.stringify(createValidationErrorResponse([
          { field: 'email', message: 'Email is required' }
        ], requestId)))
        return
      }

      await this.authService.requestPasswordReset({
        email: body.email
      })

      res.statusCode = 200
      res.end(JSON.stringify(createSuccessResponse({ success: true }, requestId)))
    } catch (error) {
      await this.handleAuthError(error, res, requestId)
    }
  }

  private async parseRequestBody(req: IncomingMessage): Promise<any> {
    try {
      const chunks: Buffer[] = []
      for await (const chunk of req) {
        chunks.push(chunk)
      }
      const body = Buffer.concat(chunks).toString()
      return body ? JSON.parse(body) : {}
    } catch (error) {
      throw new ValidationError('Invalid JSON in request body')
    }
  }

  private async extractUserIdFromToken(req: IncomingMessage): Promise<string> {
    const authHeader = req.headers.authorization
    if (!authHeader?.startsWith('Bearer ')) {
      throw new AuthenticationError('Authorization header required')
    }

    const token = authHeader.substring(7)
    const user = await this.authService.verifyToken(token)
    return user.id
  }

  private async handleAuthError(error: unknown, res: ServerResponse, requestId?: string): Promise<void> {
    if (error instanceof ValidationError) {
      res.statusCode = 400
      res.end(JSON.stringify(createErrorResponse(
        error.code,
        error.message,
        requestId,
        error.details
      )))
    } else if (error instanceof AuthenticationError) {
      res.statusCode = 401
      res.end(JSON.stringify(createErrorResponse(
        error.code,
        error.message,
        requestId
      )))
    } else if (error instanceof BusinessLogicError) {
      res.statusCode = 422
      res.end(JSON.stringify(createErrorResponse(
        error.code,
        error.message,
        requestId,
        error.details
      )))
    } else if (error instanceof APIError) {
      res.statusCode = error.statusCode
      res.end(JSON.stringify(createErrorResponse(
        error.code,
        error.message,
        requestId,
        error.details
      )))
    } else {
      logger.error('Unexpected error in auth controller', { error })
      res.statusCode = 500
      res.end(JSON.stringify(createErrorResponse(
        'INTERNAL_SERVER_ERROR',
        'An unexpected error occurred',
        requestId
      )))
    }
  }

  private async handleControllerError(error: unknown, res: ServerResponse): Promise<void> {
    logger.error('Controller error', { error })
    
    if (!res.headersSent) {
      res.statusCode = 500
      res.setHeader('Content-Type', 'application/json')
      res.end(JSON.stringify(createErrorResponse(
        'INTERNAL_SERVER_ERROR',
        'An unexpected error occurred'
      )))
    }
  }

  private generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substring(7)}`
  }
}
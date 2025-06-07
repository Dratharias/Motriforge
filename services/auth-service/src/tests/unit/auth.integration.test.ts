import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { Server } from 'node:http'
import request from 'supertest'
import { AuthServer } from '../../main'
import { DatabaseService } from '../../../../../shared/database/database.service'

// Mock the database
vi.mock('@/shared/database/database.service')

describe('Auth Service Integration Tests', () => {
  let server: Server
  let app: AuthServer

  beforeEach(async () => {
    // Mock database connection
    const mockDbService = {
      connect: vi.fn().mockResolvedValue(undefined),
      disconnect: vi.fn().mockResolvedValue(undefined),
    }
    
    ;(DatabaseService.getInstance as any).mockReturnValue(mockDbService)

    // Create test server
    app = new AuthServer()
    await app.start()
  })

  afterEach(async () => {
    if (app) {
      await app.shutdown()
    }
  })

  describe('POST /auth/register', () => {
    it('should register a new user successfully', async () => {
      const userData = {
        email: 'test@example.com',
        password: 'Password123!',
        firstName: 'John',
        lastName: 'Doe',
        dateOfBirth: '1990-01-01',
      }

      const response = await request(app as any)
        .post('/auth/register')
        .send(userData)
        .expect(201)

      expect(response.body.success).toBe(true)
      expect(response.body.data.user.email).toBe(userData.email)
      expect(response.body.data.tokens.accessToken).toBeDefined()
      expect(response.body.data.tokens.refreshToken).toBeDefined()
    })

    it('should return validation error for missing fields', async () => {
      const incompleteData = {
        email: 'test@example.com',
        // Missing password, firstName, lastName
      }

      const response = await request(app as any)
        .post('/auth/register')
        .send(incompleteData)
        .expect(400)

      expect(response.body.success).toBe(false)
      expect(response.body.error.code).toBe('VALIDATION_ERROR')
    })
  })

  describe('POST /auth/login', () => {
    it('should login with valid credentials', async () => {
      const credentials = {
        email: 'test@example.com',
        password: 'password123',
      }

      const response = await request(app as any)
        .post('/auth/login')
        .send(credentials)
        .expect(200)

      expect(response.body.success).toBe(true)
      expect(response.body.data.user.email).toBe(credentials.email)
      expect(response.body.data.tokens.accessToken).toBeDefined()
    })

    it('should return 401 for invalid credentials', async () => {
      const credentials = {
        email: 'nonexistent@example.com',
        password: 'wrongpassword',
      }

      const response = await request(app as any)
        .post('/auth/login')
        .send(credentials)
        .expect(401)

      expect(response.body.success).toBe(false)
      expect(response.body.error.code).toBe('AUTHENTICATION_ERROR')
    })
  })

  describe('GET /health', () => {
    it('should return health status', async () => {
      const response = await request(app as any)
        .get('/health')
        .expect(200)

      expect(response.body.status).toBe('healthy')
      expect(response.body.service).toBe('auth-service')
    })
  })
})
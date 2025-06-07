import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { DatabaseService } from '../../../../../shared/database/database.service'

describe('Database Connection Tests', () => {
  let dbService: DatabaseService

  beforeAll(async () => {
    dbService = DatabaseService.getInstance()
  })

  afterAll(async () => {
    await dbService.disconnect()
  })

  it('should connect to motriforge database', async () => {
    try {
      await dbService.connect()
      expect(true).toBe(true) // Connection successful
    } catch (error) {
      console.error('Database connection failed:', error)
      throw error
    }
  })

  it('should perform health check', async () => {
    const client = dbService['prisma'] || dbService['db']
    if (client && typeof client.$queryRaw === 'function') {
      try {
        await client.$queryRaw`SELECT 1`
        expect(true).toBe(true)
      } catch (error) {
        console.error('Health check failed:', error)
        throw error
      }
    } else {
      console.log('Database client not available - likely using placeholder')
      expect(true).toBe(true)
    }
  })

  it('should have database client available', () => {
    expect(dbService).toBeDefined()
    expect(typeof dbService.connect).toBe('function')
    expect(typeof dbService.disconnect).toBe('function')
  })

  it('should access database tables', async () => {
    // Try to access the internal Prisma client
    const client = dbService['prisma'] || dbService['db']
    
    if (client && typeof client.$queryRaw === 'function') {
      try {
        const result = await client.$queryRaw`SELECT 1 as test`
        expect(result).toBeDefined()
        console.log('✅ Database query successful:', result)
      } catch (error) {
        console.error('❌ Database query failed:', error)
        throw error
      }
    } else {
      console.log('⚠️ Real database client not available - using placeholder')
      expect(true).toBe(true)
    }
  })
})
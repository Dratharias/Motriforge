import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { DatabaseService } from './database/DatabaseService';

/**
 * Initialize the Hono application with database setup
 */
export async function createApp(): Promise<Hono> {
  const app = new Hono();

  // Add CORS middleware
  app.use('*', cors({
    origin: ['http://localhost:3000', 'http://localhost:5173'],
    allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
  }));

  // Initialize database
  try {
    const dbService = DatabaseService.getInstance();
    await dbService.initialize();
    console.log('✅ Database initialized for application');
  } catch (error) {
    console.error('❌ Failed to initialize database:', error);
    throw error;
  }

  // Health check endpoint
  app.get('/health', async (c) => {
    try {
      const dbService = DatabaseService.getInstance();
      const dbHealth = await dbService.healthCheck();
      
      return c.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        database: dbHealth,
      });
    } catch (error) {
      return c.json({
        status: 'error',
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : 'Unknown error',
      }, 500);
    }
  });

  // Database info endpoint (development only)
  if (process.env.NODE_ENV === 'development') {
    app.get('/dev/db-info', async (c) => {
      try {
        const dbService = DatabaseService.getInstance();
        const manager = dbService.getManager();
        
        const poolStats = manager.getPoolStats();
        const health = await dbService.healthCheck();
        
        return c.json({
          poolStats,
          health,
          environment: process.env.NODE_ENV,
        });
      } catch (error) {
        return c.json({
          error: error instanceof Error ? error.message : 'Unknown error',
        }, 500);
      }
    });
  }

  return app;
}

/**
 * Graceful shutdown handler
 */
export async function gracefulShutdown(): Promise<void> {
  console.log('🔄 Initiating graceful shutdown...');
  
  try {
    const dbService = DatabaseService.getInstance();
    await dbService.shutdown();
    console.log('✅ Graceful shutdown completed');
  } catch (error) {
    console.error('❌ Error during shutdown:', error);
    process.exit(1);
  }
}

// Setup process handlers for graceful shutdown
process.on('SIGINT', gracefulShutdown);
process.on('SIGTERM', gracefulShutdown);
process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught exception:', error);
  gracefulShutdown().then(() => process.exit(1));
});
process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled rejection at:', promise, 'reason:', reason);
  gracefulShutdown().then(() => process.exit(1));
});


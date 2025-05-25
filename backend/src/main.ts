import { Hono } from 'hono';
import { IAMModule } from '@/infrastructure/iam/IAMModule';
import { LoggerFactory } from '@/shared-kernel/infrastructure/logging/LoggerFactory';
import { serve } from '@hono/node-server';
import mongoose from 'mongoose';

async function bootstrap() {
  const logger = LoggerFactory.getInstance().createLogger('Bootstrap');

  try {
    logger.info('Starting application bootstrap');

    // Initialize Logger
    LoggerFactory.initialize({
      level: 'info',
      enableConsole: true,
      enableFile: true,
      enableMetrics: true
    });

    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/fitness-platform');
    logger.info('Connected to MongoDB');

    // Initialize IAM Module
    const iamModule = new IAMModule({
      jwtAccessTokenSecret: process.env.JWT_ACCESS_SECRET || 'default-access-secret',
      jwtRefreshTokenSecret: process.env.JWT_REFRESH_SECRET || 'default-refresh-secret',
      jwtIssuer: process.env.JWT_ISSUER || 'fitness-platform',
      bcryptSaltRounds: parseInt(process.env.BCRYPT_SALT_ROUNDS || '12')
    });

    // Create main app
    const app = new Hono();

    // Add IAM routes
    app.route('/iam', iamModule.createRoutes());

    // Health check endpoint
    app.get('/health', async (c) => {
      const iamHealth = await iamModule.healthCheck();
      
      return c.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        services: {
          iam: iamHealth
        }
      });
    });

    // Start server
    const port = parseInt(process.env.PORT || '3000');
    logger.info(`Starting server on port ${port}`);

    serve({
      fetch: app.fetch,
      port
    });

    logger.info('Application started successfully');

  } catch (error) {
    logger.error('Failed to bootstrap application', error as Error);
    process.exit(1);
  }
}

// Start the application
if (require.main === module) {
  bootstrap();
}
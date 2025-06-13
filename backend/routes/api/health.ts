import { json } from '@solidjs/router';
import { APIEvent } from '@solidjs/start/server';
import { db } from '~/database/connection';

interface HealthCheckResponse {
  status: 'healthy' | 'unhealthy';
  timestamp: string;
  version: string;
  environment: string;
  services: {
    database: 'healthy' | 'unhealthy';
    cache: 'healthy' | 'unhealthy';
  };
  uptime: number;
}

const startTime = Date.now();

/**
 * Health check endpoint for monitoring and load balancers
 * GET /api/health
 */
export async function GET(_event: APIEvent): Promise<Response> {
  try {
    const healthCheck: HealthCheckResponse = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version ?? '1.0.0',
      environment: process.env.NODE_ENV ?? 'development',
      services: {
        database: 'healthy',
        cache: 'healthy',
      },
      uptime: Math.floor((Date.now() - startTime) / 1000),
    };

    // Check database connectivity
    try {
      await db.execute('SELECT 1');
      healthCheck.services.database = 'healthy';
    } catch (error) {
      console.error('Database health check failed:', error);
      healthCheck.services.database = 'unhealthy';
      healthCheck.status = 'unhealthy';
    }

    // Check cache connectivity (if Redis URL is provided)
    if (process.env.REDIS_URL) {
      try {
        // TODO: Implement Redis health check when cache service is implemented
        healthCheck.services.cache = 'healthy';
      } catch (error) {
        console.error('Cache health check failed:', error);
        healthCheck.services.cache = 'unhealthy';
        healthCheck.status = 'unhealthy';
      }
    }

    const statusCode = healthCheck.status === 'healthy' ? 200 : 503;

    return json(healthCheck, {
      status: statusCode,
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Content-Type': 'application/json',
      },
    });
  } catch (error) {
    console.error('Health check endpoint error:', error);

    return json(
      {
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        error: 'Internal server error during health check',
      },
      {
        status: 500,
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Content-Type': 'application/json',
        },
      }
    );
  }
}
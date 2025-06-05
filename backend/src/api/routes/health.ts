import type { RouteHandler } from '@/shared/types/api';
import { DatabaseService } from '@/database/DatabaseService';

export const healthCheckHandler: RouteHandler = async () => {
  try {
    const dbService = DatabaseService.getInstance();
    const dbHealth = await dbService.healthCheck();
    
    return {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      services: {
        database: {
          status: dbHealth.status,
          responseTime: dbHealth.details?.responseTime ?? 0
        },
        api: {
          status: 'operational',
          version: process.env.API_VERSION ?? 'v1'
        }
      }
    };
  } catch (error) {
    throw new Error('Health check failed');
  }
};
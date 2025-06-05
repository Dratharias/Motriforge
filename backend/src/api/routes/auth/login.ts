import { AuthenticationFacade } from '@/services/auth/AuthenticationFacade';
import { DatabaseService } from '@/database/DatabaseService';
import { AuthUtils } from '@/utils/AuthUtils';
import type { RouteHandler } from '@/shared/types/api';
import { Logger } from '@/utils/Logger';

const logger = new Logger('LoginRoute');

export const loginHandler: RouteHandler = async (context) => {
  try {
    const { email, password } = context.validatedData?.body ?? {};

    if (!email || !password) {
      throw new Error('Email and password are required');
    }

    // Validate email format
    if (!AuthUtils.isValidEmail(email)) {
      throw new Error('Invalid email format');
    }

    // Get database service instance
    const databaseService = DatabaseService.getInstance();
    
    // Create authentication facade with proper dependency injection
    const authFacade = new AuthenticationFacade(databaseService);

    // Extract user agent and IP for session tracking using utilities
    const userAgent: string | undefined = AuthUtils.extractUserAgent(context.request);
    const ipAddress: string | undefined = AuthUtils.extractClientIP(context.request);

    const result = await authFacade.login(
      { 
        email: AuthUtils.sanitizeString(email).toLowerCase(), 
        password 
      },
      userAgent,
      ipAddress
    );

    if (!result.success) {
      throw new Error(result.error ?? 'Authentication failed');
    }

    logger.info('User logged in successfully', { 
      userId: result.user?.id, 
      email: result.user?.email,
      ipAddress: ipAddress ?? 'unknown'
    });

    return {
      user: {
        id: result.user?.id,
        email: result.user?.email,
        firstName: result.user?.firstName,
        lastName: result.user?.lastName
      },
      tokens: result.tokens
    };
  } catch (error) {
    logger.error('Login failed', { 
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    throw error;
  }
};

import { AuthenticationFacade } from '@/services/auth/AuthenticationFacade';
import { DatabaseService } from '@/database/DatabaseService';
import { AuthUtils } from '@/utils/AuthUtils';
import type { RouteHandler } from '@/shared/types/api';
import { Logger } from '@/utils/Logger';

const logger = new Logger('RegisterRoute');

export const registerHandler: RouteHandler = async (context) => {
  try {
    const { email, password, firstName, lastName } = context.validatedData?.body ?? {};

    if (!email || !password || !firstName || !lastName) {
      throw new Error('Missing required fields: email, password, firstName, lastName');
    }

    // Validate email format
    if (!AuthUtils.isValidEmail(email)) {
      throw new Error('Invalid email format');
    }

    // Sanitize input data
    const sanitizedData = {
      email: AuthUtils.sanitizeString(email).toLowerCase(),
      firstName: AuthUtils.sanitizeString(firstName),
      lastName: AuthUtils.sanitizeString(lastName),
      password, // Don't sanitize password as it might remove valid special characters
    };

    // Get database service instance
    const databaseService = DatabaseService.getInstance();
    
    // Create authentication facade with proper dependency injection
    const authFacade = new AuthenticationFacade(databaseService);

    // Get default visibility ID using utility
    const visibilityId: string = await AuthUtils.getDefaultVisibilityId();

    // Call register with both required parameters
    const result = await authFacade.register({
      email: sanitizedData.email,
      password: sanitizedData.password,
      firstName: sanitizedData.firstName,
      lastName: sanitizedData.lastName
    }, visibilityId);

    if (!result.success) {
      throw new Error(result.error ?? 'Registration failed');
    }

    logger.info('User registered successfully', { 
      userId: result.user?.id, 
      email: result.user?.email 
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
    logger.error('Registration failed', { 
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    throw error;
  }
};
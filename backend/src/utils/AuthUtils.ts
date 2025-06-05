import { DatabaseService } from '@/database/DatabaseService';
import { Logger } from '@/utils/Logger';

export class AuthUtils {
  private static readonly logger = new Logger('AuthUtils');

  /**
   * Get default visibility ID for new user registrations
   */
  public static async getDefaultVisibilityId(): Promise<string> {
    try {
      const databaseService = DatabaseService.getInstance();
      const result = await databaseService.querySingle<{ id: string }>(
        'SELECT id FROM visibility WHERE name = $1 AND is_active = true',
        ['private']
      );

      if (!result?.id) {
        throw new Error('Default visibility configuration not found');
      }

      return result.id;
    } catch (error) {
      AuthUtils.logger.error('Failed to get default visibility ID', error);
      throw error;
    }
  }

  /**
   * Extract client IP address from request headers
   */
  public static extractClientIP(request: Request): string | undefined {
    return request.headers.get('CF-Connecting-IP') ??
           request.headers.get('X-Forwarded-For')?.split(',')[0]?.trim() ??
           request.headers.get('X-Real-IP') ??
           undefined;
  }

  /**
   * Extract user agent from request headers
   */
  public static extractUserAgent(request: Request): string | undefined {
    return request.headers.get('User-Agent') ?? undefined;
  }

  /**
   * Validate email format
   */
  public static isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * Sanitize string input to prevent XSS
   */
  public static sanitizeString(input: string): string {
    return input
      .trim()
      .replace(/[<>]/g, '') // Remove potential HTML tags
      .substring(0, 1000);   // Limit length
  }
}
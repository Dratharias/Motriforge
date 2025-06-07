import { logger } from '../utils/logger'

export function errorHandler() {
  return async (error: unknown): Promise<void> => {
    logger.error('Unhandled error', { error })
  }
}
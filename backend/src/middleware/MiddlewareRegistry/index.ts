/**
 * Barrel export for middleware registry classes
 * 
 * Exports only the main classes, not the types or interfaces.
 * Types should be imported directly from their respective files when needed.
 */

// Core registry management
export { RegistryEventManager } from './MiddlewareRegistry';

// Discovery and search functionality
export { MiddlewareDiscovery } from './MiddlewareDiscovery';

// Health monitoring
export { MiddlewareHealthChecker } from './MiddlewareHealthChecker';

// Statistics and analytics
export { MiddlewareStatistics } from './MiddlewareStatistics';

// Validation and integrity checking
export { MiddlewareValidator } from './MiddlewareValidator';
import { Hono } from 'hono';
import { Role, ResourceType, Action } from '../../../types/core/enums';
import { IAMSystem } from '../IAMFactory';

export class HonoIAMIntegration {
  constructor(private readonly iamSystem: IAMSystem) {}

  setupApp(app: Hono): void {
    // Global error handler
    app.onError((err, c) => {
      console.error('IAM Error:', err);
      
      if (err.name === 'HTTPException') {
        return c.json({
          error: err.message,
          status: err.status ?? 500
        }, err.status ?? 500);
      }

      return c.json({
        error: 'Internal server error',
        status: 500
      }, 500);
    });

    // Public routes (no auth required)
    app.use('/health', this.iamSystem.middleware.auth.allowGuest());
  }

  createAuthenticatedRouter(): Hono {
    const router = new Hono();
    
    // All routes require authentication
    router.use('*', this.iamSystem.middleware.auth.requireAuth());
    router.use('*', this.iamSystem.middleware.authz.extractOrganization());
    
    return router;
  }

  createAdminRouter(): Hono {
    const router = new Hono();
    
    // Admin-only routes
    router.use('*', this.iamSystem.middleware.auth.requireAuth());
    router.use('*', this.iamSystem.middleware.authz.requireRole(Role.ADMIN));
    
    router.get('/users', (c) => c.json({ message: 'List users - Admin only' }));
    router.post('/users', (c) => c.json({ message: 'Create user - Admin only' }));
    
    return router;
  }

  createTrainerRouter(): Hono {
    const router = new Hono();
    
    // Trainer routes
    router.use('*', this.iamSystem.middleware.auth.requireAuth());
    router.use('*', this.iamSystem.middleware.authz.requireRole(Role.TRAINER));
    
    // Exercise management
    router.use('/exercises/*', this.iamSystem.middleware.authz.requirePermission(ResourceType.EXERCISE, Action.CREATE));
    router.post('/exercises', (c) => c.json({ message: 'Create exercise - Trainer' }));
    router.put('/exercises/:id', (c) => c.json({ message: 'Update exercise - Trainer' }));
    
    // Workout management  
    router.use('/workouts/*', this.iamSystem.middleware.authz.requirePermission(ResourceType.WORKOUT, Action.CREATE));
    router.post('/workouts', (c) => c.json({ message: 'Create workout - Trainer' }));
    
    return router;
  }

  createClientRouter(): Hono {
    const router = new Hono();
    
    // Client routes
    router.use('*', this.iamSystem.middleware.auth.requireAuth());
    router.use('*', this.iamSystem.middleware.authz.requireRole(Role.CLIENT));
    
    // Profile management
    router.use('/profile', this.iamSystem.middleware.authz.requirePermission(ResourceType.PROFILE, Action.READ));
    router.get('/profile', (c) => c.json({ message: 'Get profile - Client' }));
    router.put('/profile', this.iamSystem.middleware.authz.requirePermission(ResourceType.PROFILE, Action.UPDATE));
    
    return router;
  }

  addPermissionCheckRoute(app: Hono): void {
    const router = new Hono();
    
    router.use('*', this.iamSystem.middleware.auth.requireAuth());
    
    router.post('/check', async (c) => {
      const iamContext = c.get('iamContext');
      const { resource, action } = await c.req.json();
      
      if (!iamContext.user) {
        return c.json({ error: 'User not authenticated' }, 401);
      }

      const hasAccess = await this.iamSystem.iamService.canAccess(
        iamContext.user,
        resource,
        action,
        { organizationId: iamContext.organizationId }
      );

      // Publish access event
      await this.iamSystem.eventPublisher.publishAccessEvent({
        userId: iamContext.user.id,
        resource,
        action,
        organizationId: iamContext.organizationId ?? iamContext.user.organization,
        granted: hasAccess,
        sessionId: iamContext.sessionId,
        traceId: iamContext.traceId
      });

      return c.json({ 
        allowed: hasAccess,
        user: iamContext.user.email,
        role: iamContext.user.role
      });
    });

    app.route('/permissions', router);
  }
}


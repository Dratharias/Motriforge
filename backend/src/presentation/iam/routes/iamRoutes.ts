import { Hono } from 'hono';
import { IdentityController } from '../controllers/IdentityController';
import { SessionController } from '../controllers/SessionController';
import { AccessController } from '../controllers/AccessController';

export function createIAMRoutes(
  identityController: IdentityController,
  sessionController: SessionController,
  accessController: AccessController
): Hono {
  const iam = new Hono();

  // Identity routes
  iam.post('/identities', (c) => identityController.createIdentity(c));
  iam.get('/identities/:id', (c) => identityController.getIdentity(c));
  iam.put('/identities/:id', (c) => identityController.updateIdentity(c));
  iam.post('/identities/:id/verify-email', (c) => identityController.verifyEmail(c));
  iam.post('/identities/:id/enable-mfa', (c) => identityController.enableMFA(c));

  // Session routes
  iam.post('/sessions', (c) => sessionController.createSession(c));
  iam.post('/sessions/refresh', (c) => sessionController.refreshSession(c));
  iam.delete('/sessions/:sessionId', (c) => sessionController.revokeSession(c));
  iam.get('/sessions/:sessionId/validate', (c) => sessionController.validateSession(c));
  iam.get('/identities/:identityId/sessions', (c) => sessionController.getActiveSessions(c));

  // Access control routes
  iam.post('/access/assign-role', (c) => accessController.assignRole(c));
  iam.post('/access/grant-permission', (c) => accessController.grantPermission(c));
  iam.get('/access/check', (c) => accessController.checkAccess(c));
  iam.get('/identities/:identityId/permissions', (c) => accessController.getPermissions(c));
  iam.get('/identities/:identityId/roles', (c) => accessController.getRoles(c));
  iam.get('/identities/:identityId/access-dashboard', (c) => accessController.getAccessControlDashboard(c));

  return iam;
}


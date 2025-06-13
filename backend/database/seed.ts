/**
 * Database Seeding Script
 * Populates the database with initial development and test data
 */

import { db } from './connection';
import { 
  severityClassification,
  eventActorType,
  eventActionType,
  eventScopeType,
  eventTargetType,
  eventLog,
  auditLog,
  errorLog
} from './schema';
import { createId } from '@paralleldrive/cuid2';

const SYSTEM_USER_ID = 'system';

async function seedSeverityTypes() {
  console.log('Seeding severity types...');
  
  const severityData = [
    // Debug severities
    { level: 'low', type: 'debug', requiresNotification: false, priorityOrder: 1 },
    { level: 'medium', type: 'debug', requiresNotification: false, priorityOrder: 2 },
    
    // Info severities  
    { level: 'low', type: 'info', requiresNotification: false, priorityOrder: 3 },
    { level: 'medium', type: 'info', requiresNotification: false, priorityOrder: 4 },
    { level: 'high', type: 'info', requiresNotification: true, priorityOrder: 5 },
    
    // Warning severities
    { level: 'medium', type: 'warn', requiresNotification: false, priorityOrder: 6 },
    { level: 'high', type: 'warn', requiresNotification: true, priorityOrder: 7 },
    { level: 'highest', type: 'warn', requiresNotification: true, priorityOrder: 8 },
    
    // Error severities
    { level: 'low', type: 'error', requiresNotification: false, priorityOrder: 9 },
    { level: 'medium', type: 'error', requiresNotification: true, priorityOrder: 10 },
    { level: 'high', type: 'error', requiresNotification: true, priorityOrder: 11 },
    { level: 'highest', type: 'error', requiresNotification: true, priorityOrder: 12 },
    { level: 'critical', type: 'error', requiresNotification: true, priorityOrder: 13 },
    
    // Audit severities
    { level: 'medium', type: 'audit', requiresNotification: false, priorityOrder: 14 },
    { level: 'high', type: 'audit', requiresNotification: true, priorityOrder: 15 },
    { level: 'critical', type: 'audit', requiresNotification: true, priorityOrder: 16 },
    
    // Lifecycle severities
    { level: 'low', type: 'lifecycle', requiresNotification: false, priorityOrder: 17 },
    { level: 'medium', type: 'lifecycle', requiresNotification: false, priorityOrder: 18 },
    { level: 'high', type: 'lifecycle', requiresNotification: true, priorityOrder: 19 }
  ];

  await db.insert(severityClassification).values(
    severityData.map(data => ({
      ...data,
      createdBy: SYSTEM_USER_ID
    }))
  ).onConflictDoNothing();

  console.log(`Seeded ${severityData.length} severity classifications (19 total)`);
}

async function seedEventTypes() {
  console.log('Seeding event types...');
  
  // Actor types
  const actorTypes = [
    { name: 'user', displayName: 'User', description: 'End user performing actions' },
    { name: 'system', displayName: 'System', description: 'Automated system processes' },
    { name: 'service', displayName: 'Service', description: 'Microservice components' },
    { name: 'admin', displayName: 'Administrator', description: 'System administrator' },
    { name: 'api', displayName: 'API', description: 'External API or integration' }
  ];

  await db.insert(eventActorType).values(
    actorTypes.map(actor => ({
      ...actor,
      createdBy: SYSTEM_USER_ID
    }))
  ).onConflictDoNothing();

  // Action types - FIXED: Added missing action types
  const actionTypes = [
    { name: 'create', displayName: 'Create', description: 'Creating new resources' },
    { name: 'read', displayName: 'Read', description: 'Reading or accessing resources' },
    { name: 'update', displayName: 'Update', description: 'Updating existing resources' },
    { name: 'delete', displayName: 'Delete', description: 'Deleting resources' },
    { name: 'login', displayName: 'Login', description: 'User authentication' },
    { name: 'logout', displayName: 'Logout', description: 'User session termination' },
    { name: 'access', displayName: 'Access', description: 'Accessing protected resources' },
    { name: 'modify', displayName: 'Modify', description: 'Modifying configurations or settings' },
    { name: 'error', displayName: 'Error', description: 'Error conditions or failures' },
    { name: 'complete', displayName: 'Complete', description: 'Successful completion of operations' },
    // ADDED MISSING ACTIONS
    { name: 'start', displayName: 'Start', description: 'Starting processes or operations' },
    { name: 'stop', displayName: 'Stop', description: 'Stopping processes or operations' },
    { name: 'retry', displayName: 'Retry', description: 'Retrying failed operations' },
    { name: 'validate', displayName: 'Validate', description: 'Validating data or operations' },
    { name: 'process', displayName: 'Process', description: 'Processing data or requests' }
  ];

  await db.insert(eventActionType).values(
    actionTypes.map(action => ({
      ...action,
      createdBy: SYSTEM_USER_ID
    }))
  ).onConflictDoNothing();

  // Scope types
  const scopeTypes = [
    { name: 'system', displayName: 'System', description: 'System-wide scope' },
    { name: 'domain', displayName: 'Domain', description: 'Domain-specific scope' },
    { name: 'institution', displayName: 'Institution', description: 'Institution-level scope' },
    { name: 'user', displayName: 'User', description: 'User-specific scope' },
    { name: 'session', displayName: 'Session', description: 'Session-level scope' },
    { name: 'api', displayName: 'API', description: 'API operation scope' },
    { name: 'database', displayName: 'Database', description: 'Database operation scope' },
    { name: 'cache', displayName: 'Cache', description: 'Cache operation scope' },
    // ADDED MORE SCOPE TYPES
    { name: 'security', displayName: 'Security', description: 'Security-related scope' },
    { name: 'workflow', displayName: 'Workflow', description: 'Workflow processing scope' }
  ];

  await db.insert(eventScopeType).values(
    scopeTypes.map(scope => ({
      ...scope,
      createdBy: SYSTEM_USER_ID
    }))
  ).onConflictDoNothing();

  // Target types
  const targetTypes = [
    { name: 'user', displayName: 'User', description: 'User entities' },
    { name: 'institution', displayName: 'Institution', description: 'Institution entities' },
    { name: 'resource', displayName: 'Resource', description: 'General resources' },
    { name: 'database', displayName: 'Database', description: 'Database entities' },
    { name: 'cache', displayName: 'Cache', description: 'Cache entries' },
    { name: 'session', displayName: 'Session', description: 'User sessions' },
    { name: 'api', displayName: 'API', description: 'API endpoints' },
    { name: 'file', displayName: 'File', description: 'File resources' },
    { name: 'configuration', displayName: 'Configuration', description: 'System configurations' },
    { name: 'service', displayName: 'Service', description: 'Service instances' },
    // ADDED MORE TARGET TYPES
    { name: 'endpoint', displayName: 'Endpoint', description: 'API endpoints' },
    { name: 'process', displayName: 'Process', description: 'System processes' }
  ];

  await db.insert(eventTargetType).values(
    targetTypes.map(target => ({
      ...target,
      createdBy: SYSTEM_USER_ID
    }))
  ).onConflictDoNothing();

  console.log(`Seeded ${actorTypes.length} actors, ${actionTypes.length} actions, ${scopeTypes.length} scopes, ${targetTypes.length} targets`);
}

async function seedSampleData() {
  if (process.env.NODE_ENV === 'development') {
    console.log('Seeding development sample data...');
    
    // Get some reference IDs for sample data
    const severities = await db.select().from(severityClassification).limit(5);
    const actors = await db.select().from(eventActorType).limit(3);
    const actions = await db.select().from(eventActionType).limit(3);
    const scopes = await db.select().from(eventScopeType).limit(3);
    const targets = await db.select().from(eventTargetType).limit(3);

    if (severities.length > 0 && actors.length > 0) {
      // Sample event logs
      await db.insert(eventLog).values([
        {
          eventActorId: actors[0]?.id ?? "Unknown",
          eventActionId: actions[0]?.id ?? "Unknown",
          eventScopeId: scopes[0]?.id ?? "Unknown",
          eventTargetId: targets[0]?.id ?? "Unknown",
          severityId: severities[0]?.id ?? "Unknown",
          eventData: { action: 'system_startup', version: '1.0.0' },
          contextData: { environment: 'development' },
          status: 'completed',
          createdBy: SYSTEM_USER_ID
        },
        {
          eventActorId: actors[1]?.id ?? "Unknown",
          eventActionId: actions[1]?.id ?? "Unknown",
          eventScopeId: scopes[1]?.id ?? "Unknown",
          eventTargetId: targets[1]?.id ?? "Unknown",
          severityId: severities[1]?.id ?? "Unknown",
          eventData: { action: 'database_migration', success: true },
          contextData: { tables_affected: 10 },
          status: 'completed',
          createdBy: SYSTEM_USER_ID
        }
      ]).onConflictDoNothing();

      // Sample audit logs
      await db.insert(auditLog).values([
        {
          entityType: 'system',
          entityId: createId(),
          action: 'create',
          newValues: { status: 'initialized' },
          reason: 'System initialization',
          createdBy: SYSTEM_USER_ID
        }
      ]).onConflictDoNothing();

      // Sample error logs
      await db.insert(errorLog).values([
        {
          errorCode: 'INIT_001',
          errorMessage: 'Sample initialization warning',
          errorDescription: 'This is a sample error log entry for development',
          severityId: severities[0]?.id ?? "Unknown",
          sourceComponent: 'database-seeder',
          sourceMethod: 'seedSampleData',
          status: 'resolved',
          createdBy: SYSTEM_USER_ID
        }
      ]).onConflictDoNothing();
    }
  }
}

async function main() {
  try {
    console.log('🌱 Starting database seeding...');
    
    await seedSeverityTypes();
    await seedEventTypes();
    await seedSampleData();
    
    console.log('✅ Database seeding completed successfully!');
  } catch (error) {
    console.error('❌ Database seeding failed:', error);
    process.exit(1);
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { main as seedDatabase };
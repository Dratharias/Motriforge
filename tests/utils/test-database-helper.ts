import { Database } from '~/database/connection';
import { sql } from 'drizzle-orm';

export class TestDatabaseHelper {
  constructor(private readonly db: Database) {}

  /**
   * Clean test data with proper dependency order - FIXED
   */
  async cleanTestData(createdBy: string = 'test'): Promise<void> {
    try {
      // Step 1: Delete from tables with foreign key dependencies first (in correct order)
      await this.db.execute(sql`DELETE FROM log_entry WHERE created_by LIKE ${createdBy + '%'}`);
      await this.db.execute(sql`DELETE FROM event_log WHERE created_by LIKE ${createdBy + '%'}`);
      await this.db.execute(sql`DELETE FROM audit_log WHERE created_by LIKE ${createdBy + '%'}`);
      await this.db.execute(sql`DELETE FROM error_log WHERE created_by LIKE ${createdBy + '%'}`);

      // Step 2: Delete from reference tables (no foreign key dependencies between these)
      await this.db.execute(sql`DELETE FROM severity_classification WHERE created_by LIKE ${createdBy + '%'}`);
      await this.db.execute(sql`DELETE FROM event_actor_type WHERE created_by LIKE ${createdBy + '%'}`);
      await this.db.execute(sql`DELETE FROM event_action_type WHERE created_by LIKE ${createdBy + '%'}`);
      await this.db.execute(sql`DELETE FROM event_scope_type WHERE created_by LIKE ${createdBy + '%'}`);
      await this.db.execute(sql`DELETE FROM event_target_type WHERE created_by LIKE ${createdBy + '%'}`);
    } catch (error) {
      console.warn('Test cleanup warning:', error);
      // Don't throw - we want tests to continue even if cleanup has issues
    }
  }

  /**
   * Set up basic test data that many tests need
   */
  async setupBasicTestData(testId: string): Promise<TestDataIds> {
    const createdBy = `test-${testId}`;

    // Insert basic severity types
    await this.db.execute(sql`
      INSERT INTO severity_classification (level, type, requires_notification, priority_order, created_by)
      VALUES 
        ('low', 'debug', false, 1, ${createdBy}),
        ('medium', 'info', false, 4, ${createdBy}),
        ('high', 'warn', true, 7, ${createdBy}),
        ('highest', 'error', true, 12, ${createdBy}),
        ('critical', 'error', true, 13, ${createdBy}),
        ('high', 'audit', true, 15, ${createdBy})
      ON CONFLICT (level, type) DO UPDATE SET created_by = EXCLUDED.created_by
    `);

    // Insert basic actor types
    await this.db.execute(sql`
      INSERT INTO event_actor_type (name, display_name, description, created_by)
      VALUES 
        (${`${testId}-user`}, 'Test User', 'Test user actor', ${createdBy}),
        (${`${testId}-system`}, 'Test System', 'Test system actor', ${createdBy}),
        (${`${testId}-service`}, 'Test Service', 'Test service actor', ${createdBy})
      ON CONFLICT (name) DO UPDATE SET created_by = EXCLUDED.created_by
    `);

    // Insert basic action types
    await this.db.execute(sql`
      INSERT INTO event_action_type (name, display_name, description, created_by)
      VALUES 
        (${`${testId}-create`}, 'Test Create', 'Test create action', ${createdBy}),
        (${`${testId}-login`}, 'Test Login', 'Test login action', ${createdBy}),
        (${`${testId}-error`}, 'Test Error', 'Test error action', ${createdBy}),
        (${`${testId}-update`}, 'Test Update', 'Test update action', ${createdBy})
      ON CONFLICT (name) DO UPDATE SET created_by = EXCLUDED.created_by
    `);

    // Insert basic scope types
    await this.db.execute(sql`
      INSERT INTO event_scope_type (name, display_name, description, created_by)
      VALUES 
        (${`${testId}-domain`}, 'Test Domain', 'Test domain scope', ${createdBy}),
        (${`${testId}-api`}, 'Test API', 'Test API scope', ${createdBy}),
        (${`${testId}-system`}, 'Test System', 'Test system scope', ${createdBy})
      ON CONFLICT (name) DO UPDATE SET created_by = EXCLUDED.created_by
    `);

    // Insert basic target types
    await this.db.execute(sql`
      INSERT INTO event_target_type (name, display_name, description, created_by)
      VALUES 
        (${`${testId}-resource`}, 'Test Resource', 'Test resource target', ${createdBy}),
        (${`${testId}-endpoint`}, 'Test Endpoint', 'Test endpoint target', ${createdBy}),
        (${`${testId}-service`}, 'Test Service', 'Test service target', ${createdBy})
      ON CONFLICT (name) DO UPDATE SET created_by = EXCLUDED.created_by
    `);

    // Get the IDs for use in tests - FIXED: Query with exact created_by match
    const severities = await this.db.execute(sql`
      SELECT id, level, type FROM severity_classification 
      WHERE created_by = ${createdBy}
      ORDER BY priority_order
    `);

    const actors = await this.db.execute(sql`
      SELECT id, name FROM event_actor_type 
      WHERE created_by = ${createdBy}
      ORDER BY name
    `);

    const actions = await this.db.execute(sql`
      SELECT id, name FROM event_action_type 
      WHERE created_by = ${createdBy}
      ORDER BY name
    `);

    const scopes = await this.db.execute(sql`
      SELECT id, name FROM event_scope_type 
      WHERE created_by = ${createdBy}
      ORDER BY name
    `);

    const targets = await this.db.execute(sql`
      SELECT id, name FROM event_target_type 
      WHERE created_by = ${createdBy}
      ORDER BY name
    `);

    return {
      testId,
      createdBy,
      severities: severities as any[],
      actors: actors as any[],
      actions: actions as any[],
      scopes: scopes as any[],
      targets: targets as any[]
    };
  }

  /**
   * Insert a test log entry with proper references
   */
  async insertTestLogEntry(testData: TestDataIds, message: string, severityType: string = 'info'): Promise<string> {
    const severity = testData.severities.find(s => s.type === severityType);
    const actor = testData.actors.find(a => a.name === `${testData.testId}-user`);
    const action = testData.actions.find(a => a.name === `${testData.testId}-create`);
    const scope = testData.scopes.find(s => s.name === `${testData.testId}-domain`);
    const target = testData.targets.find(t => t.name === `${testData.testId}-resource`);

    if (!severity || !actor || !action || !scope || !target) {
      console.error('Available data:', {
        severities: testData.severities.map(s => ({ id: s.id, type: s.type })),
        actors: testData.actors.map(a => ({ id: a.id, name: a.name })),
        actions: testData.actions.map(a => ({ id: a.id, name: a.name })),
        scopes: testData.scopes.map(s => ({ id: s.id, name: s.name })),
        targets: testData.targets.map(t => ({ id: t.id, name: t.name }))
      });
      throw new Error(`Required test data not found. Looking for severity: ${severityType}, but found: ${testData.severities.map(s => s.type).join(', ')}`);
    }

    const result = await this.db.execute(sql`
      INSERT INTO log_entry (
        event_actor_id, event_action_id, event_scope_id, event_target_id,
        severity_id, message, context, source_component, created_by
      ) VALUES (
        ${actor.id}, ${action.id}, ${scope.id}, ${target.id},
        ${severity.id}, ${message}, '{}', 'test-component', ${testData.createdBy}
      ) RETURNING id
    `);

    return (result as any[])[0]?.id;
  }

  /**
   * Create a complete test environment for integration tests
   */
  async createTestEnvironment(testName: string): Promise<TestEnvironment> {
    const testId = testName.toLowerCase().replace(/[^a-z0-9]/g, '-');
    const testData = await this.setupBasicTestData(testId);

    return {
      testId,
      testData,
      cleanup: () => this.cleanTestData(`test-${testId}`)
    };
  }
}

export interface TestDataIds {
  testId: string;
  createdBy: string;
  severities: Array<{ id: string; level: string; type: string }>;
  actors: Array<{ id: string; name: string }>;
  actions: Array<{ id: string; name: string }>;
  scopes: Array<{ id: string; name: string }>;
  targets: Array<{ id: string; name: string }>;
}

export interface TestEnvironment {
  testId: string;
  testData: TestDataIds;
  cleanup: () => Promise<void>;
}

// Helper function to create unique test IDs
export function createTestId(testName: string): string {
  const timestamp = Date.now().toString(36);
  const randomId = Math.random().toString(36).substring(2, 7);
  const cleanName = testName.toLowerCase().replace(/[^a-z0-9]/g, '').substring(0, 10);
  return `${cleanName}-${timestamp}-${randomId}`;
}
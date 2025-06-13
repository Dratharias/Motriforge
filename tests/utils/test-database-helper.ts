import { Database } from '~/database/connection';
import { sql } from 'drizzle-orm';

export class TestDatabaseHelper {
  private static instanceCount = 0;
  private readonly instanceId: string;

  constructor(private readonly db: Database) {
    TestDatabaseHelper.instanceCount++;
    this.instanceId = `helper-${TestDatabaseHelper.instanceCount}-${Date.now()}`;
  }

  /**
   * Insert a test log entry with specific timestamp - bypasses any default timestamp behavior
   */
  async insertTestLogEntryWithTimestamp(
    testData: TestDataIds,
    message: string,
    loggedAt: Date,
    severityType: string = 'info'
  ): Promise<string> {
    const severity = testData.severities.find(s => s.type === severityType);
    const actor = testData.actors.find(a => a.name === `${testData.testId}-user`);
    const action = testData.actions.find(a => a.name === `${testData.testId}-create`);
    const scope = testData.scopes.find(s => s.name === `${testData.testId}-domain`);
    const target = testData.targets.find(t => t.name === `${testData.testId}-resource`);

    if (!severity || !actor || !action || !scope || !target) {
      throw new Error(`Required test data not found. Looking for severity: ${severityType}`);
    }

    // First, insert the log entry with current timestamp
    const result = await this.db.execute(sql`
    INSERT INTO log_entry (
      event_actor_id, event_action_id, event_scope_id, event_target_id,
      severity_id, message, context, source_component, created_by
    ) VALUES (
      ${actor.id}, ${action.id}, ${scope.id}, ${target.id},
      ${severity.id}, ${message}, '{}', 'time-test-component', ${testData.createdBy}
    ) RETURNING id
  `);

    const insertedId = (result as any[])[0]?.id;

    if (!insertedId) {
      throw new Error('Failed to insert log entry');
    }

    // Then, update the logged_at field explicitly to bypass any triggers/defaults
    await this.db.execute(sql`
    UPDATE log_entry 
    SET logged_at = ${loggedAt.toISOString()}
    WHERE id = ${insertedId}
  `);

    // Verify the timestamp was set correctly
    const verification = await this.db.execute(sql`
    SELECT logged_at FROM log_entry WHERE id = ${insertedId}
  `);

    const actualTimestamp = (verification as any[])[0]?.logged_at;
    console.log(`Inserted log ${insertedId} with timestamp:`, {
      requested: loggedAt.toISOString(),
      actual: actualTimestamp,
      message
    });

    return insertedId;
  }

  /**
   * Create multiple test logs with specific timestamps for time range testing
   */
  async setupTimeRangeTestData(testData: TestDataIds): Promise<{
    oldLogId: string;
    recentLogId: string;
    futureLogId: string;
    baseTime: Date;
    oneHourAgo: Date;
    thirtyMinutesAgo: Date;
    tenMinutesInFuture: Date;
  }> {
    const baseTime = new Date();
    const oneHourAgo = new Date(baseTime.getTime() - 60 * 60 * 1000);
    const thirtyMinutesAgo = new Date(baseTime.getTime() - 30 * 60 * 1000);
    const tenMinutesInFuture = new Date(baseTime.getTime() + 10 * 60 * 1000);

    // Insert logs with specific timestamps
    const oldLogId = await this.insertTestLogEntryWithTimestamp(
      testData,
      'Old log outside time range',
      oneHourAgo,
      'info'
    );

    const recentLogId = await this.insertTestLogEntryWithTimestamp(
      testData,
      'Recent log within time range',
      thirtyMinutesAgo,
      'info'
    );

    const futureLogId = await this.insertTestLogEntryWithTimestamp(
      testData,
      'Future log outside time range',
      tenMinutesInFuture,
      'warn'
    );

    return {
      oldLogId,
      recentLogId,
      futureLogId,
      baseTime,
      oneHourAgo,
      thirtyMinutesAgo,
      tenMinutesInFuture
    };
  }

  /**
   * Clean test data with proper dependency order and transaction safety
   */
  async cleanTestData(createdBy: string = 'test'): Promise<void> {
    try {
      // Use a transaction to ensure atomicity
      await this.db.transaction(async (tx) => {
        // Step 1: Delete from log_entry first (has foreign keys to everything)
        await tx.execute(sql`DELETE FROM log_entry WHERE created_by LIKE ${createdBy + '%'}`);

        // Step 2: Delete from other dependent tables
        await tx.execute(sql`DELETE FROM event_log WHERE created_by LIKE ${createdBy + '%'}`);
        await tx.execute(sql`DELETE FROM audit_log WHERE created_by LIKE ${createdBy + '%'}`);
        await tx.execute(sql`DELETE FROM error_log WHERE created_by LIKE ${createdBy + '%'}`);

        // Step 3: Delete from reference tables (in any order now)
        await tx.execute(sql`DELETE FROM event_actor_type WHERE created_by LIKE ${createdBy + '%'}`);
        await tx.execute(sql`DELETE FROM event_action_type WHERE created_by LIKE ${createdBy + '%'}`);
        await tx.execute(sql`DELETE FROM event_scope_type WHERE created_by LIKE ${createdBy + '%'}`);
        await tx.execute(sql`DELETE FROM event_target_type WHERE created_by LIKE ${createdBy + '%'}`);

        // Step 4: Delete severity_classification LAST
        await tx.execute(sql`DELETE FROM severity_classification WHERE created_by LIKE ${createdBy + '%'}`);
      });
    } catch (error) {
      console.warn(`Test cleanup warning for ${createdBy}:`, error);
      // Continue - don't fail tests due to cleanup issues
    }
  }

  /**
   * Set up basic test data that many tests need with unique identifiers
   */
  async setupBasicTestData(testId: string): Promise<TestDataIds> {
    // Create a much shorter unique ID to fit database constraints
    const shortId = this.createShortId(testId);
    const createdBy = `test-${shortId}`;

    try {
      // Use a transaction to ensure atomicity
      return await this.db.transaction(async (tx) => {
        // Insert basic severity types with unique handling
        await tx.execute(sql`
          INSERT INTO severity_classification (level, type, requires_notification, priority_order, created_by)
          VALUES 
            ('low', 'debug', false, 1, ${createdBy}),
            ('medium', 'info', false, 4, ${createdBy}),
            ('high', 'warn', true, 7, ${createdBy}),
            ('highest', 'error', true, 12, ${createdBy}),
            ('critical', 'error', true, 13, ${createdBy}),
            ('high', 'audit', true, 15, ${createdBy})
          ON CONFLICT (level, type) DO UPDATE SET created_by = ${createdBy}
        `);

        // Insert basic actor types with shorter names
        await tx.execute(sql`
          INSERT INTO event_actor_type (name, display_name, description, created_by)
          VALUES 
            (${`${shortId}-user`}, 'Test User', 'Test user actor', ${createdBy}),
            (${`${shortId}-sys`}, 'Test System', 'Test system actor', ${createdBy}),
            (${`${shortId}-svc`}, 'Test Service', 'Test service actor', ${createdBy})
          ON CONFLICT (name) DO UPDATE SET created_by = ${createdBy}
        `);

        // Insert basic action types with shorter names
        await tx.execute(sql`
          INSERT INTO event_action_type (name, display_name, description, created_by)
          VALUES 
            (${`${shortId}-create`}, 'Test Create', 'Test create action', ${createdBy}),
            (${`${shortId}-login`}, 'Test Login', 'Test login action', ${createdBy}),
            (${`${shortId}-error`}, 'Test Error', 'Test error action', ${createdBy}),
            (${`${shortId}-update`}, 'Test Update', 'Test update action', ${createdBy})
          ON CONFLICT (name) DO UPDATE SET created_by = ${createdBy}
        `);

        // Insert basic scope types with shorter names
        await tx.execute(sql`
          INSERT INTO event_scope_type (name, display_name, description, created_by)
          VALUES 
            (${`${shortId}-domain`}, 'Test Domain', 'Test domain scope', ${createdBy}),
            (${`${shortId}-api`}, 'Test API', 'Test API scope', ${createdBy}),
            (${`${shortId}-sys`}, 'Test System', 'Test system scope', ${createdBy})
          ON CONFLICT (name) DO UPDATE SET created_by = ${createdBy}
        `);

        // Insert basic target types with shorter names
        await tx.execute(sql`
          INSERT INTO event_target_type (name, display_name, description, created_by)
          VALUES 
            (${`${shortId}-resource`}, 'Test Resource', 'Test resource target', ${createdBy}),
            (${`${shortId}-endpoint`}, 'Test Endpoint', 'Test endpoint target', ${createdBy}),
            (${`${shortId}-svc`}, 'Test Service', 'Test service target', ${createdBy})
          ON CONFLICT (name) DO UPDATE SET created_by = ${createdBy}
        `);

        // Get the IDs for use in tests
        const severities = await tx.execute(sql`
          SELECT id, level, type FROM severity_classification 
          WHERE created_by = ${createdBy}
          ORDER BY priority_order
        `);

        const actors = await tx.execute(sql`
          SELECT id, name FROM event_actor_type 
          WHERE created_by = ${createdBy}
          ORDER BY name
        `);

        const actions = await tx.execute(sql`
          SELECT id, name FROM event_action_type 
          WHERE created_by = ${createdBy}
          ORDER BY name
        `);

        const scopes = await tx.execute(sql`
          SELECT id, name FROM event_scope_type 
          WHERE created_by = ${createdBy}
          ORDER BY name
        `);

        const targets = await tx.execute(sql`
          SELECT id, name FROM event_target_type 
          WHERE created_by = ${createdBy}
          ORDER BY name
        `);

        return {
          testId: shortId,
          createdBy,
          severities: severities as any[],
          actors: actors as any[],
          actions: actions as any[],
          scopes: scopes as any[],
          targets: targets as any[]
        };
      });
    } catch (error) {
      console.error(`Failed to setup test data for ${shortId}:`, error);
      throw error;
    }
  }

  /**
   * Create a short ID that fits database constraints (max 20 chars for names)
   */
  private createShortId(testId: string): string {
    const timestamp = Date.now().toString(36).slice(-4); // Last 4 chars of timestamp
    const randomId = Math.random().toString(36).substring(2, 5); // 3 random chars
    const cleanName = testId.toLowerCase().replace(/[^a-z0-9]/g, '').substring(0, 6); // 6 chars max
    return `${cleanName}${timestamp}${randomId}`; // ~13 chars total, leaving room for suffixes
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
   * Clean ALL test data with proper locking to prevent race conditions
   */
  async cleanAllTestData(): Promise<void> {
    try {
      // Use a shorter timeout for the advisory lock
      const lockResult = await this.db.execute(sql`SELECT pg_try_advisory_lock(12345) as acquired`);
      const lockAcquired = (lockResult as any[])[0]?.acquired;
      
      if (!lockAcquired) {
        console.warn('Could not acquire advisory lock, skipping cleanup');
        return;
      }
      
      // Clean up in proper dependency order within a transaction
      await this.db.transaction(async (tx) => {
        const cleanupQueries = [
          `DELETE FROM log_entry WHERE created_by LIKE 'test%'`,
          `DELETE FROM event_log WHERE created_by LIKE 'test%'`,
          `DELETE FROM audit_log WHERE created_by LIKE 'test%'`,
          `DELETE FROM error_log WHERE created_by LIKE 'test%'`,
          `DELETE FROM event_actor_type WHERE created_by LIKE 'test%'`,
          `DELETE FROM event_action_type WHERE created_by LIKE 'test%'`,
          `DELETE FROM event_scope_type WHERE created_by LIKE 'test%'`,
          `DELETE FROM event_target_type WHERE created_by LIKE 'test%'`,
          `DELETE FROM severity_classification WHERE created_by LIKE 'test%'`
        ];

        for (const query of cleanupQueries) {
          await tx.execute(sql.raw(query));
        }
      });
    } catch (error) {
      console.warn('Global test cleanup warning:', error);
    } finally {
      // Always try to release the advisory lock, but don't fail if it's already released
      try {
        await this.db.execute(sql`SELECT pg_advisory_unlock(12345)`);
      } catch (unlockError) {
        // Log unlock errors for debugging, but do not fail the cleanup process
        console.warn('Failed to release advisory lock:', unlockError);
      }
    }
  }

  /**
   * Create a complete test environment for integration tests
   */
  async createTestEnvironment(testName: string): Promise<TestEnvironment> {
    const testId = testName.toLowerCase().replace(/[^a-z0-9]/g, '-');
    const testData = await this.setupBasicTestData(testId);

    return {
      testId: testData.testId,
      testData,
      cleanup: () => this.cleanTestData(testData.createdBy)
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

// Helper function to create unique test IDs with better isolation
export function createTestId(testName: string): string {
  const timestamp = Date.now().toString(36);
  const randomId = Math.random().toString(36).substring(2, 5); // Shorter random
  const processId = process.pid.toString(36).substring(0, 3); // Shorter process ID
  const cleanName = testName.toLowerCase().replace(/[^a-z0-9]/g, '').substring(0, 6); // Shorter name
  return `${cleanName}-${processId}-${timestamp.substring(-6)}-${randomId}`; // Max ~20 chars
}
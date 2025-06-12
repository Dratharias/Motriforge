import { sql } from 'drizzle-orm';
import { db } from '../backend/database/connection';

/**
 * Set up test database with required tables and data
 * This ensures tests have a consistent environment
 */
export async function setupTestDatabase() {
  console.log('Setting up test database...');

  try {
    // Create extensions
    await db.execute(sql`CREATE EXTENSION IF NOT EXISTS "pg_trgm"`);
    await db.execute(sql`CREATE EXTENSION IF NOT EXISTS "btree_gin"`);
    console.log('Extensions created');

    // Create enums
    await db.execute(sql`
      DO $$ BEGIN
        CREATE TYPE severity_level AS ENUM ('negligeable', 'lowest', 'low', 'medium', 'high', 'highest', 'critical');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    await db.execute(sql`
      DO $$ BEGIN
        CREATE TYPE severity_type AS ENUM ('debug', 'info', 'warn', 'error', 'audit', 'lifecycle');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    await db.execute(sql`
      DO $$ BEGIN
        CREATE TYPE event_status AS ENUM ('pending', 'processing', 'completed', 'failed', 'retrying');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    await db.execute(sql`
      DO $$ BEGIN
        CREATE TYPE entity_type AS ENUM ('user', 'institution', 'resource', 'system', 'service');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    await db.execute(sql`
      DO $$ BEGIN
        CREATE TYPE action AS ENUM ('create', 'read', 'update', 'delete', 'login', 'logout', 'access', 'modify');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);
    console.log('Enums created');

    // Create core tables
    await createCoreObservabilityTables();
    await createLogSearchTables();
    console.log('Tables created');

    // Create indexes
    await createPerformanceIndexes();
    console.log('Indexes created');

    // Create functions and triggers
    await createSearchFunctions();
    console.log('Functions and triggers created');

    // Seed basic data
    await seedBasicData();
    console.log('Basic data seeded');

    console.log('Test database setup complete');

  } catch (error) {
    console.error('Test database setup failed:', error);
    throw error;
  }
}

async function createCoreObservabilityTables() {
  // Severity classification table
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS severity_classification (
      id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
      level VARCHAR(20) NOT NULL,
      type VARCHAR(20) NOT NULL,
      requires_notification BOOLEAN NOT NULL DEFAULT false,
      priority_order INTEGER NOT NULL DEFAULT 1,
      created_by TEXT NOT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT now(),
      is_active BOOLEAN NOT NULL DEFAULT true,
      UNIQUE(level, type)
    )
  `);

  // Actor.Action.Scope.Target pattern tables
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS event_actor_type (
      id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
      name VARCHAR(50) NOT NULL UNIQUE,
      display_name VARCHAR(255) NOT NULL,
      description TEXT,
      created_by TEXT NOT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT now(),
      is_active BOOLEAN NOT NULL DEFAULT true
    )
  `);

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS event_action_type (
      id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
      name VARCHAR(50) NOT NULL UNIQUE,
      display_name VARCHAR(255) NOT NULL,
      description TEXT,
      created_by TEXT NOT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT now(),
      is_active BOOLEAN NOT NULL DEFAULT true
    )
  `);

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS event_scope_type (
      id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
      name VARCHAR(50) NOT NULL UNIQUE,
      display_name VARCHAR(255) NOT NULL,
      description TEXT,
      created_by TEXT NOT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT now(),
      is_active BOOLEAN NOT NULL DEFAULT true
    )
  `);

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS event_target_type (
      id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
      name VARCHAR(50) NOT NULL UNIQUE,
      display_name VARCHAR(255) NOT NULL,
      description TEXT,
      created_by TEXT NOT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT now(),
      is_active BOOLEAN NOT NULL DEFAULT true
    )
  `);

  // Main event log
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS event_log (
      id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
      event_actor_id TEXT NOT NULL REFERENCES event_actor_type(id),
      event_action_id TEXT NOT NULL REFERENCES event_action_type(id),
      event_scope_id TEXT NOT NULL REFERENCES event_scope_type(id),
      event_target_id TEXT NOT NULL REFERENCES event_target_type(id),
      severity_id TEXT NOT NULL REFERENCES severity_classification(id),
      user_id TEXT,
      session_id TEXT,
      trace_id TEXT,
      parent_event_id TEXT,
      event_data JSONB NOT NULL,
      context_data JSONB,
      ip_address INET,
      user_agent TEXT,
      status event_status NOT NULL DEFAULT 'completed',
      error_details TEXT,
      created_by TEXT NOT NULL,
      occurred_at TIMESTAMP NOT NULL DEFAULT now(),
      is_active BOOLEAN NOT NULL DEFAULT true
    )
  `);
}

async function createLogSearchTables() {
  // Enhanced log entry table with search capabilities
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS log_entry (
      id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
      event_actor_id TEXT NOT NULL REFERENCES event_actor_type(id),
      event_action_id TEXT NOT NULL REFERENCES event_action_type(id),
      event_scope_id TEXT NOT NULL REFERENCES event_scope_type(id),
      event_target_id TEXT NOT NULL REFERENCES event_target_type(id),
      severity_id TEXT NOT NULL REFERENCES severity_classification(id),
      message TEXT NOT NULL,
      context JSONB DEFAULT '{}',
      correlation_id TEXT,
      trace_id TEXT,
      parent_event_id TEXT REFERENCES log_entry(id),
      user_id TEXT,
      session_id TEXT,
      source_component TEXT NOT NULL,
      source_file TEXT,
      line_number INTEGER,
      stack_trace TEXT,
      ip_address INET,
      user_agent TEXT,
      search_vector TSVECTOR,
      created_by TEXT NOT NULL,
      logged_at TIMESTAMP NOT NULL DEFAULT now(),
      is_active BOOLEAN NOT NULL DEFAULT true
    )
  `);

  // Materialized view for log aggregation
  await db.execute(sql`
    CREATE MATERIALIZED VIEW IF NOT EXISTS log_summary AS
    SELECT 
      DATE_TRUNC('hour', logged_at) as hour,
      severity_id,
      source_component,
      COUNT(*) as log_count,
      COUNT(DISTINCT user_id) as unique_users,
      COUNT(DISTINCT session_id) as unique_sessions
    FROM log_entry 
    WHERE is_active = true
    GROUP BY DATE_TRUNC('hour', logged_at), severity_id, source_component
  `);
}

async function createPerformanceIndexes() {
  // Create indexes with error handling
  const indexes = [
    `CREATE INDEX IF NOT EXISTS idx_log_entry_logged_at ON log_entry(logged_at DESC)`,
    `CREATE INDEX IF NOT EXISTS idx_log_entry_severity ON log_entry(severity_id)`,
    `CREATE INDEX IF NOT EXISTS idx_log_entry_trace ON log_entry(trace_id) WHERE trace_id IS NOT NULL`,
    `CREATE INDEX IF NOT EXISTS idx_log_entry_correlation ON log_entry(correlation_id) WHERE correlation_id IS NOT NULL`,
    `CREATE INDEX IF NOT EXISTS idx_log_entry_user ON log_entry(user_id) WHERE user_id IS NOT NULL`,
    `CREATE INDEX IF NOT EXISTS idx_log_entry_session ON log_entry(session_id) WHERE session_id IS NOT NULL`,
    `CREATE INDEX IF NOT EXISTS idx_log_entry_source ON log_entry(source_component)`,
    `CREATE INDEX IF NOT EXISTS idx_log_entry_pattern ON log_entry(event_actor_id, event_action_id, event_scope_id, event_target_id)`,
    `CREATE INDEX IF NOT EXISTS idx_log_entry_context ON log_entry USING GIN((context))`,
    `CREATE INDEX IF NOT EXISTS idx_log_entry_time_severity ON log_entry(logged_at DESC, severity_id)`,
    `CREATE INDEX IF NOT EXISTS idx_log_entry_user_time ON log_entry(user_id, logged_at DESC) WHERE user_id IS NOT NULL`,
    `CREATE INDEX IF NOT EXISTS idx_log_entry_search ON log_entry USING GIN(search_vector)`,
    `CREATE INDEX IF NOT EXISTS idx_log_summary_hour ON log_summary(hour DESC)`,
    `CREATE INDEX IF NOT EXISTS idx_log_summary_severity ON log_summary(severity_id)`
  ];

  for (const indexSql of indexes) {
    try {
      await db.execute(sql.raw(indexSql));
    } catch (error) {
      console.warn(`Index creation warning: ${error}`);
    }
  }
}

async function createSearchFunctions() {
  // Create search vector update function
  await db.execute(sql`
    CREATE OR REPLACE FUNCTION log_entry_search_update() RETURNS TRIGGER AS $$
    BEGIN
      NEW.search_vector := 
        setweight(to_tsvector('english', coalesce(NEW.message, '')), 'A') ||
        setweight(to_tsvector('english', coalesce(NEW.source_component, '')), 'B') ||
        setweight(to_tsvector('english', coalesce(NEW.source_file, '')), 'C') ||
        setweight(to_tsvector('english', coalesce(NEW.context::text, '')), 'D');
      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;
  `);

  // Create trigger
  await db.execute(sql`
    DROP TRIGGER IF EXISTS log_entry_search_update_trigger ON log_entry;
    CREATE TRIGGER log_entry_search_update_trigger
      BEFORE INSERT OR UPDATE ON log_entry
      FOR EACH ROW EXECUTE FUNCTION log_entry_search_update();
  `);

  // Create search function
  await db.execute(sql`
    CREATE OR REPLACE FUNCTION search_logs(
      search_query TEXT,
      severity_filter TEXT[] DEFAULT NULL,
      time_from TIMESTAMP DEFAULT NULL,
      time_to TIMESTAMP DEFAULT NULL,
      user_filter TEXT DEFAULT NULL,
      limit_count INTEGER DEFAULT 100
    ) RETURNS TABLE(
      id TEXT,
      message TEXT,
      severity_type TEXT,
      severity_level TEXT,
      source_component TEXT,
      logged_at TIMESTAMP,
      rank REAL
    ) AS $$
    BEGIN
      RETURN QUERY
      SELECT 
        le.id,
        le.message,
        sc.type as severity_type,
        sc.level as severity_level,
        le.source_component,
        le.logged_at,
        ts_rank(le.search_vector, websearch_to_tsquery('english', search_query)) as rank
      FROM log_entry le
      JOIN severity_classification sc ON le.severity_id = sc.id
      WHERE 
        le.is_active = true
        AND le.search_vector @@ websearch_to_tsquery('english', search_query)
        AND (severity_filter IS NULL OR sc.type = ANY(severity_filter))
        AND (time_from IS NULL OR le.logged_at >= time_from)
        AND (time_to IS NULL OR le.logged_at <= time_to)
        AND (user_filter IS NULL OR le.user_id = user_filter)
      ORDER BY rank DESC, le.logged_at DESC
      LIMIT limit_count;
    END;
    $$ LANGUAGE plpgsql;
  `);

  // Create pattern analysis function
  await db.execute(sql`
    CREATE OR REPLACE FUNCTION analyze_log_patterns(
      hours_back INTEGER DEFAULT 24
    ) RETURNS TABLE(
      pattern TEXT,
      log_count BIGINT,
      error_count BIGINT,
      warn_count BIGINT,
      unique_users BIGINT
    ) AS $$
    BEGIN
      RETURN QUERY
      SELECT 
        CONCAT(eat.name, '.', eact.name, '.', est.name, '.', ett.name) as pattern,
        COUNT(*) as log_count,
        COUNT(CASE WHEN sc.type = 'error' THEN 1 END) as error_count,
        COUNT(CASE WHEN sc.type = 'warn' THEN 1 END) as warn_count,
        COUNT(DISTINCT le.user_id) as unique_users
      FROM log_entry le
      JOIN event_actor_type eat ON le.event_actor_id = eat.id
      JOIN event_action_type eact ON le.event_action_id = eact.id
      JOIN event_scope_type est ON le.event_scope_id = est.id
      JOIN event_target_type ett ON le.event_target_id = ett.id
      JOIN severity_classification sc ON le.severity_id = sc.id
      WHERE 
        le.is_active = true
        AND le.logged_at >= NOW() - (hours_back * INTERVAL '1 hour')
      GROUP BY eat.name, eact.name, est.name, ett.name
      ORDER BY log_count DESC;
    END;
    $$ LANGUAGE plpgsql;
  `);

  // Create refresh function for materialized view
  await db.execute(sql`
    CREATE OR REPLACE FUNCTION refresh_log_summary() RETURNS VOID AS $$
    BEGIN
      REFRESH MATERIALIZED VIEW CONCURRENTLY log_summary;
    END;
    $$ LANGUAGE plpgsql;
  `);
}

async function seedBasicData() {
  // Insert basic severity types
  const severityTypes = [
    { level: 'low', type: 'debug', requiresNotification: false, priorityOrder: 1 },
    { level: 'medium', type: 'debug', requiresNotification: false, priorityOrder: 2 },
    { level: 'low', type: 'info', requiresNotification: false, priorityOrder: 3 },
    { level: 'medium', type: 'info', requiresNotification: false, priorityOrder: 4 },
    { level: 'high', type: 'info', requiresNotification: true, priorityOrder: 5 },
    { level: 'medium', type: 'warn', requiresNotification: false, priorityOrder: 6 },
    { level: 'high', type: 'warn', requiresNotification: true, priorityOrder: 7 },
    { level: 'highest', type: 'warn', requiresNotification: true, priorityOrder: 8 },
    { level: 'low', type: 'error', requiresNotification: false, priorityOrder: 9 },
    { level: 'medium', type: 'error', requiresNotification: true, priorityOrder: 10 },
    { level: 'high', type: 'error', requiresNotification: true, priorityOrder: 11 },
    { level: 'highest', type: 'error', requiresNotification: true, priorityOrder: 12 },
    { level: 'critical', type: 'error', requiresNotification: true, priorityOrder: 13 },
    { level: 'medium', type: 'audit', requiresNotification: false, priorityOrder: 14 },
    { level: 'high', type: 'audit', requiresNotification: true, priorityOrder: 15 },
    { level: 'critical', type: 'audit', requiresNotification: true, priorityOrder: 16 },
    { level: 'low', type: 'lifecycle', requiresNotification: false, priorityOrder: 17 },
    { level: 'medium', type: 'lifecycle', requiresNotification: false, priorityOrder: 18 },
    { level: 'high', type: 'lifecycle', requiresNotification: true, priorityOrder: 19 }
  ];

  for (const severity of severityTypes) {
    await db.execute(sql`
      INSERT INTO severity_classification (level, type, requires_notification, priority_order, created_by)
      VALUES (${severity.level}, ${severity.type}, ${severity.requiresNotification}, ${severity.priorityOrder}, 'test-setup')
      ON CONFLICT (level, type) DO NOTHING
    `);
  }

  // Insert basic Actor.Action.Scope.Target types
  const actorTypes = [
    { name: 'user', displayName: 'User', description: 'End user performing actions' },
    { name: 'system', displayName: 'System', description: 'Automated system processes' },
    { name: 'service', displayName: 'Service', description: 'Microservice components' },
    { name: 'admin', displayName: 'Administrator', description: 'System administrator' },
    { name: 'api', displayName: 'API', description: 'External API or integration' }
  ];

  for (const actor of actorTypes) {
    await db.execute(sql`
      INSERT INTO event_actor_type (name, display_name, description, created_by)
      VALUES (${actor.name}, ${actor.displayName}, ${actor.description}, 'test-setup')
      ON CONFLICT (name) DO NOTHING
    `);
  }

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
    { name: 'complete', displayName: 'Complete', description: 'Successful completion of operations' }
  ];

  for (const action of actionTypes) {
    await db.execute(sql`
      INSERT INTO event_action_type (name, display_name, description, created_by)
      VALUES (${action.name}, ${action.displayName}, ${action.description}, 'test-setup')
      ON CONFLICT (name) DO NOTHING
    `);
  }

  const scopeTypes = [
    { name: 'system', displayName: 'System', description: 'System-wide scope' },
    { name: 'domain', displayName: 'Domain', description: 'Domain-specific scope' },
    { name: 'institution', displayName: 'Institution', description: 'Institution-level scope' },
    { name: 'user', displayName: 'User', description: 'User-specific scope' },
    { name: 'session', displayName: 'Session', description: 'Session-level scope' },
    { name: 'api', displayName: 'API', description: 'API operation scope' },
    { name: 'database', displayName: 'Database', description: 'Database operation scope' },
    { name: 'cache', displayName: 'Cache', description: 'Cache operation scope' }
  ];

  for (const scope of scopeTypes) {
    await db.execute(sql`
      INSERT INTO event_scope_type (name, display_name, description, created_by)
      VALUES (${scope.name}, ${scope.displayName}, ${scope.description}, 'test-setup')
      ON CONFLICT (name) DO NOTHING
    `);
  }

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
    { name: 'service', displayName: 'Service', description: 'Service instances' }
  ];

  for (const target of targetTypes) {
    await db.execute(sql`
      INSERT INTO event_target_type (name, display_name, description, created_by)
      VALUES (${target.name}, ${target.displayName}, ${target.description}, 'test-setup')
      ON CONFLICT (name) DO NOTHING
    `);
  }
}

/**
 * Clean up test database
 */
export async function cleanupTestDatabase() {
  console.log('Cleaning up test database...');

  try {
    // Drop tables in reverse dependency order
    await db.execute(sql`DROP MATERIALIZED VIEW IF EXISTS log_summary CASCADE`);
    await db.execute(sql`DROP TABLE IF EXISTS log_entry CASCADE`);
    await db.execute(sql`DROP TABLE IF EXISTS event_log CASCADE`);
    await db.execute(sql`DROP TABLE IF EXISTS event_target_type CASCADE`);
    await db.execute(sql`DROP TABLE IF EXISTS event_scope_type CASCADE`);
    await db.execute(sql`DROP TABLE IF EXISTS event_action_type CASCADE`);
    await db.execute(sql`DROP TABLE IF EXISTS event_actor_type CASCADE`);
    await db.execute(sql`DROP TABLE IF EXISTS severity_classification CASCADE`);

    // Drop functions
    await db.execute(sql`DROP FUNCTION IF EXISTS log_entry_search_update() CASCADE`);
    await db.execute(sql`DROP FUNCTION IF EXISTS search_logs(TEXT, TEXT[], TIMESTAMP, TIMESTAMP, TEXT, INTEGER) CASCADE`);
    await db.execute(sql`DROP FUNCTION IF EXISTS analyze_log_patterns(INTEGER) CASCADE`);
    await db.execute(sql`DROP FUNCTION IF EXISTS refresh_log_summary() CASCADE`);

    // Drop enums
    await db.execute(sql`DROP TYPE IF EXISTS action CASCADE`);
    await db.execute(sql`DROP TYPE IF EXISTS entity_type CASCADE`);
    await db.execute(sql`DROP TYPE IF EXISTS event_status CASCADE`);
    await db.execute(sql`DROP TYPE IF EXISTS severity_type CASCADE`);
    await db.execute(sql`DROP TYPE IF EXISTS severity_level CASCADE`);

    console.log('Test database cleanup complete');
  } catch (error) {
    console.warn('⚠️ Test database cleanup warning:', error);
  }
}
import { config } from 'dotenv';
import { seedDatabase } from '../backend/database/seed';
import { db } from '../backend/database/connection';
import { sql } from 'drizzle-orm';

// Load environment variables
config();

async function setupTestDatabase(): Promise<void> {
  console.log('🔧 Setting up test database...');
  
  try {
    // Check if DATABASE_URL is available
    if (!process.env.DATABASE_URL) {
      console.error('❌ DATABASE_URL environment variable is not set');
      console.log('💡 Make sure you have a .env file with DATABASE_URL configured');
      process.exit(1);
    }
    
    // Verify database connection
    await db.execute(sql`SELECT 1`);
    console.log('✅ Database connection verified');
    
    // Seed the database with base data
    console.log('🌱 Seeding database with base data...');
    await seedDatabase();
    
    console.log('✅ Test database setup complete');
  } catch (error) {
    console.error('❌ Test database setup failed:', error);
    throw error;
  }
}

async function cleanupTestDatabase(): Promise<void> {
  console.log('🧹 Cleaning up test database...');
  
  try {
    // Clean up test data only, not the schema or base seed data
    const cleanupQueries = [
      'DELETE FROM log_entry WHERE created_by LIKE \'test%\'',
      'DELETE FROM event_log WHERE created_by LIKE \'test%\'',
      'DELETE FROM audit_log WHERE created_by LIKE \'test%\'',
      'DELETE FROM error_log WHERE created_by LIKE \'test%\'',
      'DELETE FROM severity_classification WHERE created_by LIKE \'test%\'',
      'DELETE FROM event_actor_type WHERE created_by LIKE \'test%\'',
      'DELETE FROM event_action_type WHERE created_by LIKE \'test%\'',
      'DELETE FROM event_scope_type WHERE created_by LIKE \'test%\'',
      'DELETE FROM event_target_type WHERE created_by LIKE \'test%\''
    ];

    for (const query of cleanupQueries) {
      try {
        await db.execute(sql.raw(query));
      } catch (error) {
        console.warn(`⚠️  Cleanup warning: ${error instanceof Error ? error.message : String(error)}`);
      }
    }
    
    console.log('✅ Test database cleanup complete');
  } catch (error) {
    console.error('❌ Cleanup failed:', error);
    throw error;
  }
}

async function resetTestDatabase(): Promise<void> {
  console.log('🔄 Resetting test database...');
  await cleanupTestDatabase();
  await setupTestDatabase();
  console.log('✅ Test database reset complete');
}

async function main(): Promise<void> {
  const command = process.argv[2];

  try {
    switch (command) {
      case 'setup':
        await setupTestDatabase();
        break;

      case 'cleanup':
        await cleanupTestDatabase();
        break;

      case 'reset':
        await resetTestDatabase();
        break;

      default:
        console.log('Usage: tsx scripts/test-database-setup.ts [setup|cleanup|reset]');
        console.log('  setup   - Seed base data for tests');
        console.log('  cleanup - Clean test data');
        console.log('  reset   - Cleanup and setup');
        process.exit(1);
    }
  } catch (error) {
    console.error('❌ Database operation failed:', error);
    process.exit(1);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { setupTestDatabase, cleanupTestDatabase, resetTestDatabase };
import { DatabaseService } from '../database/DatabaseService';

/**
 * Run database migrations
 */
async function runMigrations(): Promise<void> {
  console.log('🔄 Starting database migrations...');
  
  try {
    const dbService = DatabaseService.getInstance();
    await dbService.initialize();
    
    console.log('✅ Database migrations completed successfully');
    
    // Get final health check
    const health = await dbService.healthCheck();
    console.log('📊 Database health:', health);
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  } finally {
    const dbService = DatabaseService.getInstance();
    await dbService.shutdown();
    process.exit(0);
  }
}

// Run migrations if this script is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runMigrations();
}


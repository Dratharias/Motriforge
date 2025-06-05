import { DatabaseService } from '../database/DatabaseService';

/**
 * Rollback the last migration
 */
async function rollbackMigration(): Promise<void> {
  console.log('🔄 Rolling back last migration...');
  
  try {
    const dbService = DatabaseService.getInstance();
    await dbService.initialize();
    
    const manager = dbService.getManager();
    const migrationRunner = (manager as any).migrationRunner;
    
    await migrationRunner.rollbackLastMigration();
    
    console.log('✅ Migration rollback completed successfully');
    
  } catch (error) {
    console.error('❌ Rollback failed:', error);
    process.exit(1);
  } finally {
    const dbService = DatabaseService.getInstance();
    await dbService.shutdown();
    process.exit(0);
  }
}

// Run rollback if this script is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  rollbackMigration();
}


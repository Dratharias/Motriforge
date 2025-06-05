import { Pool, QueryResult } from 'pg';
import { Migration } from './types/DatabaseTypes';
import { readdir, readFile } from 'fs/promises';
import { join } from 'path';

/**
 * Handles database schema migrations
 */
export class MigrationRunner {
  private readonly pool: Pool;
  private readonly migrationsPath: string;

  constructor(pool: Pool, migrationsPath = './src/database/migrations') {
    this.pool = pool;
    this.migrationsPath = migrationsPath;
  }

  /**
   * Run all pending migrations
   */
  async runPendingMigrations(): Promise<void> {
    try {
      await this.createMigrationTable();
      
      const appliedMigrations = await this.getAppliedMigrations();
      const availableMigrations = await this.getAvailableMigrations();
      
      const pendingMigrations = availableMigrations.filter(
        migration => !appliedMigrations.has(migration.version)
      );

      if (pendingMigrations.length === 0) {
        console.log('✅ All migrations are up to date');
        return;
      }

      console.log(`🔄 Running ${pendingMigrations.length} pending migration(s)`);

      for (const migration of pendingMigrations) {
        await this.executeMigration(migration);
      }

      console.log('✅ All migrations completed successfully');
    } catch (error) {
      console.error('❌ Migration failed:', error);
      throw error;
    }
  }

  /**
   * Create the migrations tracking table
   */
  private async createMigrationTable(): Promise<void> {
    const sql = `
      CREATE TABLE IF NOT EXISTS __migrations (
        id SERIAL PRIMARY KEY,
        version VARCHAR(255) NOT NULL UNIQUE,
        name VARCHAR(255) NOT NULL,
        executed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `;
    
    await this.pool.query(sql);
  }

  /**
   * Get list of applied migrations
   */
  private async getAppliedMigrations(): Promise<Set<string>> {
    const result: QueryResult<{ version: string }> = await this.pool.query(
      'SELECT version FROM __migrations ORDER BY executed_at'
    );
    
    return new Set(result.rows.map(row => row.version));
  }

  /**
   * Get list of available migration files
   */
  private async getAvailableMigrations(): Promise<readonly Migration[]> {
    try {
      const files = await readdir(this.migrationsPath);
      const migrationFiles = files
        .filter(file => file.endsWith('.sql'))
        .sort((a, b) => a.localeCompare(b)); // Ensure chronological order

      const migrations: Migration[] = [];
      
      for (const file of migrationFiles) {
        const [version, ...nameParts] = file.replace('.sql', '').split('_');
        const name = nameParts.join('_');
        const filePath = join(this.migrationsPath, file);
        const content = await readFile(filePath, 'utf-8');
        
        // Split on -- DOWN migration marker
        const [up, down] = content.split('-- DOWN MIGRATION');
        
        migrations.push({
          version,
          name,
          up: up.trim(),
          down: down?.trim() ?? '',
          timestamp: new Date(), // Could extract from filename
        });
      }
      
      return migrations;
    } catch (error) {
      console.error('❌ Error reading migration files:', error);
      return [];
    }
  }

  /**
   * Execute a single migration
   */
  private async executeMigration(migration: Migration): Promise<void> {
    const client = await this.pool.connect();
    
    try {
      await client.query('BEGIN');
      
      // Execute migration SQL
      await client.query(migration.up);
      
      // Record migration as applied
      await client.query(
        'INSERT INTO __migrations (version, name) VALUES ($1, $2)',
        [migration.version, migration.name]
      );
      
      await client.query('COMMIT');
      
      console.log(`✅ Applied migration: ${migration.version}_${migration.name}`);
    } catch (error) {
      await client.query('ROLLBACK');
      console.error(`❌ Failed to apply migration ${migration.version}:`, error);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Rollback the last migration
   */
  async rollbackLastMigration(): Promise<void> {
    const client = await this.pool.connect();
    
    try {
      // Get the last applied migration
      const result: QueryResult<{ version: string; name: string }> = await client.query(
        'SELECT version, name FROM __migrations ORDER BY executed_at DESC LIMIT 1'
      );
      
      if (result.rows.length === 0) {
        console.log('ℹ️ No migrations to rollback');
        return;
      }
      
      const lastMigration = result.rows[0];
      const availableMigrations = await this.getAvailableMigrations();
      const migration = availableMigrations.find(m => m.version === lastMigration.version);
      
      if (!migration?.down) {
        throw new Error(`No rollback script found for migration ${lastMigration.version}`);
      }
      
      await client.query('BEGIN');
      
      // Execute rollback SQL
      await client.query(migration.down);
      
      // Remove migration record
      await client.query(
        'DELETE FROM __migrations WHERE version = $1',
        [lastMigration.version]
      );
      
      await client.query('COMMIT');
      
      console.log(`✅ Rolled back migration: ${lastMigration.version}_${lastMigration.name}`);
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('❌ Rollback failed:', error);
      throw error;
    } finally {
      client.release();
    }
  }
}


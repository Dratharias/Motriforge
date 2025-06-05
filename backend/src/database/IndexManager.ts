import { Pool, QueryResult } from 'pg';

interface IndexStats {
  readonly indexName: string;
  readonly tableName: string;
  readonly schemaName: string;
  readonly indexSize: string;
  readonly indexScans: number;
  readonly tuplesFetched: number;
}

/**
 * Manages database indexes for optimal performance
 */
export class IndexManager {
  private readonly pool: Pool;

  constructor(pool: Pool) {
    this.pool = pool;
  }

  /**
   * Create all performance-critical indexes
   */
  async createPerformanceIndexes(): Promise<void> {
    console.log('🔄 Creating performance indexes...');
    
    const indexes = [
      // User indexes
      'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_email ON users(email)',
      'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_active ON users(is_active) WHERE is_active = true',
      'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_created_at ON users(created_at)',
      
      // Exercise indexes
      'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_exercises_name ON exercises USING GIN(to_tsvector(\'english\', name))',
      'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_exercises_difficulty ON exercises(difficulty_level_id)',
      'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_exercises_visibility ON exercises(visibility_id)',
      'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_exercises_active ON exercises(is_active) WHERE is_active = true',
      'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_exercises_created_by ON exercises(created_by)',
      
      // Exercise category relationships
      'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_exercise_category_exercise ON exercise_category(exercise_id)',
      'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_exercise_category_category ON exercise_category(category_id)',
      'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_exercise_category_primary ON exercise_category(exercise_id, is_primary) WHERE is_primary = true',
      
      // Exercise muscle targets
      'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_exercise_muscle_target_exercise ON exercise_muscle_target(exercise_id)',
      'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_exercise_muscle_target_muscle ON exercise_muscle_target(muscle_id)',
      'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_exercise_muscle_target_type ON exercise_muscle_target(target_type)',
      
      // Workout indexes
      'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_workouts_name ON workouts USING GIN(to_tsvector(\'english\', name))',
      'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_workouts_duration ON workouts(duration_seconds)',
      'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_workouts_difficulty ON workouts(difficulty_level_id)',
      'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_workouts_visibility ON workouts(visibility_id)',
      'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_workouts_created_by ON workouts(created_by)',
      'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_workouts_active ON workouts(is_active) WHERE is_active = true',
      
      // Workout set and instruction indexes
      'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_workout_set_workout ON workout_set(workout_id)',
      'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_workout_set_order ON workout_set(workout_id, order_index)',
      'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_exercise_instruction_set ON exercise_instruction(workout_set_id)',
      'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_exercise_instruction_exercise ON exercise_instruction(exercise_id)',
      'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_exercise_instruction_order ON exercise_instruction(workout_set_id, order_index)',
      
      // Program indexes
      'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_programs_name ON programs USING GIN(to_tsvector(\'english\', name))',
      'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_programs_difficulty ON programs(difficulty_level_id)',
      'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_programs_visibility ON programs(visibility_id)',
      'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_programs_created_by ON programs(created_by)',
      'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_programs_active ON programs(is_active) WHERE is_active = true',
      
      // Program schedule indexes
      'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_program_schedule_program ON program_schedule(program_id)',
      'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_schedule_workout_schedule ON schedule_workout(schedule_id)',
      'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_schedule_workout_day ON schedule_workout(schedule_id, day_number)',
      'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_schedule_workout_workout ON schedule_workout(workout_id)',
      
      // Media indexes
      'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_media_type ON media(media_type_id)',
      'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_media_visibility ON media(visibility_id)',
      'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_media_created_by ON media(created_by)',
      'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_media_active ON media(is_active) WHERE is_active = true',
      
      // Activity tracking indexes
      'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_activity_user_occurred ON activity(user_id, occurred_at)',
      'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_activity_type_occurred ON activity(activity_type_id, occurred_at)',
      'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_activity_user_type ON activity(user_id, activity_type_id)',
      
      // User progress indexes
      'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_user_workout_session_user ON user_workout_session(user_id)',
      'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_user_workout_session_workout ON user_workout_session(workout_id)',
      'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_user_workout_session_started ON user_workout_session(started_at)',
      'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_user_workout_session_status ON user_workout_session(status)',
      
      // User program enrollment indexes
      'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_user_program_enrollment_user ON user_program_enrollment(user_id)',
      'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_user_program_enrollment_program ON user_program_enrollment(program_id)',
      'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_user_program_enrollment_status ON user_program_enrollment(status)',
      'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_user_program_enrollment_start_date ON user_program_enrollment(start_date)',
      
      // Audit and performance indexes
      'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_audit_log_entity ON audit_log(entity_type, entity_id)',
      'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_audit_log_user_occurred ON audit_log(user_id, occurred_at)',
      'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_audit_log_action ON audit_log(action)',
      
      // System monitoring indexes
      'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_system_event_occurred ON system_event(occurred_at)',
      'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_system_event_type ON system_event(event_type_id)',
      'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_system_event_severity ON system_event(severity)',
    ];

    let createdCount = 0;
    const errors: string[] = [];

    for (const indexSql of indexes) {
      try {
        await this.pool.query(indexSql);
        createdCount++;
      } catch (error) {
        // Index might already exist, continue with others
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        if (!errorMessage.includes('already exists')) {
          errors.push(`Failed to create index: ${indexSql} - ${errorMessage}`);
        }
      }
    }

    if (errors.length > 0) {
      console.warn('⚠️  Some indexes failed to create:', errors);
    }

    console.log(`✅ Performance indexes created/verified (${createdCount}/${indexes.length})`);
  }

  /**
   * Analyze index usage and performance
   */
  async analyzeIndexUsage(): Promise<readonly IndexStats[]> {
    const sql = `
      SELECT 
        schemaname as schema_name,
        tablename as table_name,
        indexname as index_name,
        pg_size_pretty(pg_relation_size(indexname::regclass)) as index_size,
        idx_scan as index_scans,
        idx_tup_fetch as tuples_fetched
      FROM pg_stat_user_indexes 
      ORDER BY idx_scan DESC, pg_relation_size(indexname::regclass) DESC
    `;

    const result: QueryResult<IndexStats> = await this.pool.query(sql);
    return result.rows;
  }

  /**
   * Find unused indexes that can be safely dropped
   */
  async findUnusedIndexes(): Promise<readonly IndexStats[]> {
    const sql = `
      SELECT 
        schemaname as schema_name,
        tablename as table_name,
        indexname as index_name,
        pg_size_pretty(pg_relation_size(indexname::regclass)) as index_size,
        idx_scan as index_scans,
        idx_tup_fetch as tuples_fetched
      FROM pg_stat_user_indexes 
      WHERE idx_scan = 0 
        AND indexname NOT LIKE '%_pkey'  -- Exclude primary keys
        AND indexname NOT LIKE '%_unique%'  -- Exclude unique constraints
      ORDER BY pg_relation_size(indexname::regclass) DESC
    `;

    const result: QueryResult<IndexStats> = await this.pool.query(sql);
    return result.rows;
  }

  /**
   * Get database performance recommendations
   */
  async getPerformanceRecommendations(): Promise<{
    readonly unusedIndexes: readonly IndexStats[];
    readonly heavilyUsedTables: readonly string[];
    readonly slowQueries: readonly string[];
  }> {
    const [unusedIndexes, heavyTables, slowQueries] = await Promise.all([
      this.findUnusedIndexes(),
      this.getHeavilyUsedTables(),
      this.getSlowQueries(),
    ]);

    return {
      unusedIndexes,
      heavilyUsedTables: heavyTables,
      slowQueries,
    };
  }

  private async getHeavilyUsedTables(): Promise<readonly string[]> {
    const sql = `
      SELECT schemaname || '.' || tablename as table_name
      FROM pg_stat_user_tables 
      WHERE seq_scan > 1000 OR idx_scan > 10000
      ORDER BY (seq_scan + idx_scan) DESC
      LIMIT 10
    `;

    const result: QueryResult<{ table_name: string }> = await this.pool.query(sql);
    return result.rows.map(row => row.table_name);
  }

  private async getSlowQueries(): Promise<readonly string[]> {
    // This requires pg_stat_statements extension
    const sql = `
      SELECT query
      FROM pg_stat_statements 
      WHERE mean_exec_time > 1000  -- queries taking more than 1 second
      ORDER BY mean_exec_time DESC
      LIMIT 5
    `;

    try {
      const result: QueryResult<{ query: string }> = await this.pool.query(sql);
      return result.rows.map(row => row.query);
    } catch {
      // pg_stat_statements might not be available
      return [];
    }
  }
}


import { Database } from '~/database/connection';
import { sql } from 'drizzle-orm';

export interface LogSearchQuery {
  searchText?: string;
  severityTypes?: string[];
  severityLevels?: string[];
  timeFrom?: Date;
  timeTo?: Date;
  userId?: string;
  sessionId?: string;
  traceId?: string;
  correlationId?: string;
  sourceComponent?: string;
  pattern?: string;
  limit?: number;
  offset?: number;
}

export interface LogSearchResult {
  id: string;
  message: string;
  severityType: string;
  severityLevel: string;
  sourceComponent: string;
  sourceFile?: string;
  loggedAt: Date;
  rank?: number;
  context?: Record<string, any>;
  traceId?: string;
  correlationId?: string;
  userId?: string;
  pattern: string;
}

export interface LogPatternAnalysis {
  pattern: string;
  logCount: number;
  errorCount: number;
  warnCount: number;
  uniqueUsers: number;
}

export interface LogSummary {
  hour: Date;
  severityId: string;
  sourceComponent: string;
  logCount: number;
  uniqueUsers: number;
  uniqueSessions: number;
}

export class LogSearchService {
  constructor(private readonly db: Database) {}

  async searchLogs(query: LogSearchQuery): Promise<{ results: LogSearchResult[]; total: number; hasMore: boolean }> {
    const { limit = 100, offset = 0 } = query;
    
    // Build search conditions
    const conditions = this.buildConditions(query);
    
    const [results, count] = await Promise.all([
      this.executeSearchQuery(query, conditions, limit, offset),
      this.executeCountQuery(conditions)
    ]);

    const total = count?.[0]?.total ?? 0;

    return {
      results: results.map(this.mapToLogSearchResult),
      total,
      hasMore: offset + results.length < total,
    };
  }

  async analyzePatterns(hoursBack = 24): Promise<LogPatternAnalysis[]> {
    try {
      const results = await this.db.execute(sql`SELECT * FROM analyze_log_patterns(${hoursBack})`) as any[];
      return results.map(row => ({
        pattern: row.pattern,
        logCount: parseInt(row.log_count),
        errorCount: parseInt(row.error_count),
        warnCount: parseInt(row.warn_count),
        uniqueUsers: parseInt(row.unique_users)
      }));
    } catch (error) {
      console.warn('Pattern analysis function not available, falling back to basic query');
      return this.analyzePatternsFallback(hoursBack);
    }
  }

  async getLogSummary(hoursBack = 24): Promise<LogSummary[]> {
    try {
      const results = await this.db.execute(sql`
        SELECT * FROM log_summary 
        WHERE hour >= NOW() - INTERVAL '${sql.raw(hoursBack.toString())} hours'
        ORDER BY hour DESC
      `) as any[];

      return results.map(row => ({
        hour: new Date(row.hour),
        severityId: row.severity_id,
        sourceComponent: row.source_component,
        logCount: parseInt(row.log_count),
        uniqueUsers: parseInt(row.unique_users),
        uniqueSessions: parseInt(row.unique_sessions)
      }));
    } catch (error) {
      console.warn('Log summary view not available');
      return [];
    }
  }

  async getLogsByTrace(traceId: string): Promise<LogSearchResult[]> {
    return this.searchLogs({ traceId, limit: 1000 }).then(r => r.results);
  }

  async getChildLogs(parentEventId: string): Promise<LogSearchResult[]> {
    const results = await this.db.execute(sql`
      SELECT 
        le.id, le.message,
        sc.type as severity_type,
        sc.level as severity_level,
        le.source_component, le.source_file,
        le.logged_at, le.context,
        le.trace_id, le.correlation_id, le.user_id,
        CONCAT(eat.name, '.', eact.name, '.', est.name, '.', ett.name) as pattern,
        0 as rank
      FROM log_entry le
      ${this.buildJoins()}
      WHERE le.parent_event_id = ${parentEventId} AND le.is_active = true
      ORDER BY le.logged_at ASC
    `) as any[];

    return results.map(this.mapToLogSearchResult);
  }

  async getSuggestions(partialQuery: string, limit = 10): Promise<string[]> {
    try {
      const results = await this.db.execute(sql`
        SELECT DISTINCT word
        FROM ts_stat('SELECT search_vector FROM log_entry WHERE is_active = true')
        WHERE word ILIKE ${partialQuery + '%'}
        ORDER BY ndoc DESC, word
        LIMIT ${limit}
      `) as any[];

      return results.map(row => row.word);
    } catch (error) {
      console.warn('Search suggestions not available');
      return [];
    }
  }

  async getFilterOptions(): Promise<{ severityTypes: string[]; severityLevels: string[]; sourceComponents: string[]; patterns: string[] }> {
    const [severityTypes, severityLevels, sourceComponents, patterns] = await Promise.all([
      this.db.execute(sql`SELECT DISTINCT sc.type FROM severity_classification sc WHERE sc.is_active = true ORDER BY sc.type`),
      // FIXED: Include priority_order in SELECT when using it in ORDER BY
      this.db.execute(sql`
        SELECT DISTINCT sc.level, sc.priority_order 
        FROM severity_classification sc 
        WHERE sc.is_active = true AND sc.level IS NOT NULL 
        ORDER BY sc.priority_order
      `),
      this.db.execute(sql`SELECT DISTINCT le.source_component FROM log_entry le WHERE le.is_active = true ORDER BY le.source_component`),
      this.db.execute(sql`
        SELECT DISTINCT CONCAT(eat.name, '.', eact.name, '.', est.name, '.', ett.name) as pattern
        FROM log_entry le
        ${this.buildJoins()}
        WHERE le.is_active = true
        ORDER BY pattern
      `)
    ]) as any[][];

    return {
      severityTypes: (severityTypes ?? []).map(r => r.type),
      severityLevels: (severityLevels ?? []).map(r => r.level),
      sourceComponents: (sourceComponents ?? []).map(r => r.source_component),
      patterns: (patterns ?? []).map(r => r.pattern),
    };
  }

  async refreshSummary(): Promise<void> {
    try {
      await this.db.execute(sql`SELECT refresh_log_summary()`);
    } catch (error) {
      console.warn('refresh_log_summary function not available');
    }
  }

  private async executeSearchQuery(query: LogSearchQuery, conditions: any[], limit: number, offset: number): Promise<any[]> {
    const { searchText } = query;
    
    if (searchText && searchText.trim()) {
      // Full-text search query
      return this.db.execute(sql`
        SELECT 
          le.id, le.message,
          sc.type AS severity_type,
          sc.level AS severity_level,
          le.source_component, le.source_file,
          le.logged_at, le.context,
          le.trace_id, le.correlation_id, le.user_id,
          CONCAT(eat.name, '.', eact.name, '.', est.name, '.', ett.name) AS pattern,
          ts_rank(le.search_vector, websearch_to_tsquery('english', ${searchText})) AS rank
        FROM log_entry le
        ${this.buildJoins()}
        WHERE ${this.combineConditions([
          sql`le.search_vector @@ websearch_to_tsquery('english', ${searchText})`,
          ...conditions
        ])}
        ORDER BY rank DESC, le.logged_at DESC
        LIMIT ${limit} OFFSET ${offset}
      `) as Promise<any[]>;
    } else {
      // Regular query without search
      return this.db.execute(sql`
        SELECT 
          le.id, le.message,
          sc.type AS severity_type,
          sc.level AS severity_level,
          le.source_component, le.source_file,
          le.logged_at, le.context,
          le.trace_id, le.correlation_id, le.user_id,
          CONCAT(eat.name, '.', eact.name, '.', est.name, '.', ett.name) AS pattern,
          0 AS rank
        FROM log_entry le
        ${this.buildJoins()}
        ${conditions.length > 0 ? sql`WHERE ${this.combineConditions(conditions)}` : sql``}
        ORDER BY le.logged_at DESC
        LIMIT ${limit} OFFSET ${offset}
      `) as Promise<any[]>;
    }
  }

  private async executeCountQuery(conditions: any[]): Promise<any[]> {
    return this.db.execute(sql`
      SELECT COUNT(*)::int AS total
      FROM log_entry le
      ${this.buildJoins()}
      ${conditions.length > 0 ? sql`WHERE ${this.combineConditions(conditions)}` : sql``}
    `) as Promise<any[]>;
  }

  private buildJoins(): any {
    return sql`
      JOIN severity_classification sc ON le.severity_id = sc.id
      JOIN event_actor_type eat ON le.event_actor_id = eat.id
      JOIN event_action_type eact ON le.event_action_id = eact.id
      JOIN event_scope_type est ON le.event_scope_id = est.id
      JOIN event_target_type ett ON le.event_target_id = ett.id
    `;
  }

  private buildConditions(query: LogSearchQuery): any[] {
    const conditions: any[] = [sql`le.is_active = true`];
    
    const {
      severityTypes, severityLevels,
      timeFrom, timeTo, userId, sessionId,
      traceId, correlationId, sourceComponent, pattern
    } = query;

    // FIXED: Use IN operator instead of ANY() for better compatibility
    if (severityTypes?.length) {
      const typeList = severityTypes.map(t => `'${t.replace(/'/g, "''")}'`).join(',');
      conditions.push(sql.raw(`sc.type IN (${typeList})`));
    }
    if (severityLevels?.length) {
      const levelList = severityLevels.map(l => `'${l.replace(/'/g, "''")}'`).join(',');
      conditions.push(sql.raw(`sc.level IN (${levelList})`));
    }
    
    // FIXED: Handle Date objects properly by converting to ISO strings
    if (timeFrom) {
      conditions.push(sql`le.logged_at >= ${timeFrom.toISOString()}`);
    }
    if (timeTo) {
      conditions.push(sql`le.logged_at <= ${timeTo.toISOString()}`);
    }
    
    if (userId) conditions.push(sql`le.user_id = ${userId}`);
    if (sessionId) conditions.push(sql`le.session_id = ${sessionId}`);
    if (traceId) conditions.push(sql`le.trace_id = ${traceId}`);
    if (correlationId) conditions.push(sql`le.correlation_id = ${correlationId}`);
    if (sourceComponent) conditions.push(sql`le.source_component = ${sourceComponent}`);

    // Pattern conditions
    if (pattern) {
      const [actor, action, scope, target] = pattern.split('.');
      if (actor && actor !== '*') conditions.push(sql`eat.name = ${actor}`);
      if (action && action !== '*') conditions.push(sql`eact.name = ${action}`);
      if (scope && scope !== '*') conditions.push(sql`est.name = ${scope}`);
      if (target && target !== '*') conditions.push(sql`ett.name = ${target}`);
    }

    return conditions;
  }

  private combineConditions(conditions: any[]): any {
    if (conditions.length === 0) return sql`true`;
    if (conditions.length === 1) return conditions[0];
    return sql.join(conditions, sql` AND `);
  }

  private mapToLogSearchResult(row: any): LogSearchResult {
    return {
      id: row.id,
      message: row.message,
      severityType: row.severity_type,
      severityLevel: row.severity_level || 'medium',
      sourceComponent: row.source_component,
      sourceFile: row.source_file,
      loggedAt: new Date(row.logged_at),
      rank: parseFloat(row.rank ?? '0'),
      context: row.context ? (typeof row.context === 'string' ? JSON.parse(row.context) : row.context) : undefined,
      traceId: row.trace_id,
      correlationId: row.correlation_id,
      userId: row.user_id,
      pattern: row.pattern
    };
  }

  private async analyzePatternsFallback(hoursBack: number): Promise<LogPatternAnalysis[]> {
    const results = await this.db.execute(sql`
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
        AND le.logged_at >= NOW() - INTERVAL '${sql.raw(hoursBack.toString())} hours'
      GROUP BY eat.name, eact.name, est.name, ett.name
      ORDER BY log_count DESC
    `) as any[];

    return results.map(row => ({
      pattern: row.pattern,
      logCount: parseInt(row.log_count),
      errorCount: parseInt(row.error_count),
      warnCount: parseInt(row.warn_count),
      uniqueUsers: parseInt(row.unique_users)
    }));
  }
}
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
  constructor(private readonly db: Database) { }

  async searchLogs(query: LogSearchQuery): Promise<{ results: LogSearchResult[]; total: number; hasMore: boolean }> {
    const { limit = 100, offset = 0, searchText } = query;

    // Build search conditions
    const conditions = this.buildConditions(query);

    const [results, count] = await Promise.all([
      this.executeSearchQuery(query, conditions, limit, offset),
      this.executeCountQuery(conditions, searchText)
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
      console.warn('Pattern analysis function not available, falling back to basic query', error);
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
      console.error('Log summary view not available', error);
      throw error;
    }
  }

  async getLogsByTrace(traceId: string): Promise<LogSearchResult[]> {
    return this.searchLogs({ traceId, limit: 1000 }).then(r => r.results);
  }

  async getChildLogs(parentEventId: string): Promise<LogSearchResult[]> {
    const result = await this.db.execute(sql`
    SELECT 
      le.id, le.message,
      sc.type as severity_type,
      sc.level as severity_level,
      le.source_component, le.source_file,
      le.logged_at, le.context,
      le.trace_id, le.correlation_id, le.user_id,
      CONCAT(eat.name, '.', eact.name, '.', est.name, '.', ett.name) as pattern,
      0 as rank,
      EXTRACT(EPOCH FROM le.logged_at) * 1000 AS logged_at_ms
    FROM log_entry le
    ${this.buildJoins()}
    WHERE le.parent_event_id = ${parentEventId} AND le.is_active = true
    ORDER BY le.logged_at ASC
  `);

    return (result as any[]).map(this.mapToLogSearchResult);
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
      console.warn('Search suggestions not available', error);
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
      throw error;
    }
  }

  private async executeSearchQuery(query: LogSearchQuery, conditions: any[], limit: number, offset: number): Promise<any[]> {
    const { searchText } = query;

    if (searchText?.trim()) {
      // Try full-text search first
      try {
        const result = await this.db.execute(sql`
        SELECT 
          le.id, le.message,
          sc.type AS severity_type,
          sc.level AS severity_level,
          le.source_component, le.source_file,
          le.logged_at, le.context,
          le.trace_id, le.correlation_id, le.user_id,
          CONCAT(eat.name, '.', eact.name, '.', est.name, '.', ett.name) AS pattern,
          ts_rank(le.search_vector, websearch_to_tsquery('english', ${searchText})) AS rank,
          EXTRACT(EPOCH FROM le.logged_at) * 1000 AS logged_at_ms
        FROM log_entry le
        ${this.buildJoins()}
        WHERE ${this.combineConditions([
          sql`le.search_vector @@ websearch_to_tsquery('english', ${searchText})`,
          ...conditions
        ])}
        ORDER BY rank DESC, le.logged_at DESC
        LIMIT ${limit} OFFSET ${offset}
      `);
        return result as any[];
      } catch (error) {
        // If full-text search fails, fall back to LIKE search
        console.warn('Full-text search failed, using LIKE search:', error);
        const result = await this.db.execute(sql`
        SELECT 
          le.id, le.message,
          sc.type AS severity_type,
          sc.level AS severity_level,
          le.source_component, le.source_file,
          le.logged_at, le.context,
          le.trace_id, le.correlation_id, le.user_id,
          CONCAT(eat.name, '.', eact.name, '.', est.name, '.', ett.name) AS pattern,
          0 AS rank,
          EXTRACT(EPOCH FROM le.logged_at) * 1000 AS logged_at_ms
        FROM log_entry le
        ${this.buildJoins()}
        WHERE ${this.combineConditions([
          sql`le.message ILIKE ${'%' + searchText + '%'}`,
          ...conditions
        ])}
        ORDER BY le.logged_at DESC
        LIMIT ${limit} OFFSET ${offset}
      `);
        return result as any[];
      }
    } else {
      // Regular query without search
      const result = await this.db.execute(sql`
      SELECT 
        le.id, le.message,
        sc.type AS severity_type,
        sc.level AS severity_level,
        le.source_component, le.source_file,
        le.logged_at, le.context,
        le.trace_id, le.correlation_id, le.user_id,
        CONCAT(eat.name, '.', eact.name, '.', est.name, '.', ett.name) AS pattern,
        0 AS rank,
        EXTRACT(EPOCH FROM le.logged_at) * 1000 AS logged_at_ms
      FROM log_entry le
      ${this.buildJoins()}
      ${conditions.length > 0 ? sql`WHERE ${this.combineConditions(conditions)}` : sql``}
      ORDER BY le.logged_at DESC
      LIMIT ${limit} OFFSET ${offset}
    `);
      return result as any[];
    }
  }

  private async executeCountQuery(conditions: any[], searchText?: string): Promise<any[]> {
    if (searchText?.trim()) {
      // Try full-text search count first
      try {
        const result = await this.db.execute(sql`
        SELECT COUNT(*)::int AS total
        FROM log_entry le
        ${this.buildJoins()}
        WHERE ${this.combineConditions([
          sql`le.search_vector @@ websearch_to_tsquery('english', ${searchText})`,
          ...conditions
        ])}
      `);
        return result as any[];
      } catch (error) {
        console.warn('Full-text search count failed, using LIKE search count:', error);
        const result = await this.db.execute(sql`
        SELECT COUNT(*)::int AS total
        FROM log_entry le
        ${this.buildJoins()}
        WHERE ${this.combineConditions([
          sql`le.message ILIKE ${'%' + searchText + '%'}`,
          ...conditions
        ])}
      `);
        return result as any[];
      }
    } else {
      // Regular count query
      const result = await this.db.execute(sql`
      SELECT COUNT(*)::int AS total
      FROM log_entry le
      ${this.buildJoins()}
      ${conditions.length > 0 ? sql`WHERE ${this.combineConditions(conditions)}` : sql``}
    `);
      return result as any[];
    }
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

    conditions.push(
      ...this.buildSeverityConditions(query.severityTypes, query.severityLevels),
      ...this.buildTimeConditions(query.timeFrom, query.timeTo),
      ...this.buildUserSessionConditions(query.userId, query.sessionId),
      ...this.buildTraceCorrelationConditions(query.traceId, query.correlationId),
      ...this.buildSourceComponentCondition(query.sourceComponent),
      ...this.buildPatternConditions(query.pattern)
    );

    return conditions.filter(Boolean);
  }

  private buildSeverityConditions(severityTypes?: string[], severityLevels?: string[]): any[] {
    const conditions: any[] = [];
    if (severityTypes?.length) {
      if (severityTypes.length === 1) {
        conditions.push(sql`sc.type = ${severityTypes[0]}`);
      } else {
        const placeholders = severityTypes.map(type => sql`${type}`);
        const sqlTypes = sql.join(placeholders, sql`, `);
        conditions.push(sql`sc.type IN (${sqlTypes})`);
      }
    }
    if (severityLevels?.length) {
      if (severityLevels.length === 1) {
        conditions.push(sql`sc.level = ${severityLevels[0]}`);
      } else {
        const placeholders = severityLevels.map(level => sql`${level}`);
        const sqlLevels = sql.join(placeholders, sql`, `);
        conditions.push(sql`sc.level IN (${sqlLevels})`);
      }
    }
    return conditions;
  }

  private buildTimeConditions(timeFrom?: Date, timeTo?: Date): any[] {
    const conditions: any[] = [];
    if (timeFrom) {
      conditions.push(sql`le.logged_at >= ${timeFrom.toISOString()}`);
    }
    if (timeTo) {
      conditions.push(sql`le.logged_at <= ${timeTo.toISOString()}`);
    }
    return conditions;
  }

  private buildUserSessionConditions(userId?: string, sessionId?: string): any[] {
    const conditions: any[] = [];
    if (userId) conditions.push(sql`le.user_id = ${userId}`);
    if (sessionId) conditions.push(sql`le.session_id = ${sessionId}`);
    return conditions;
  }

  private buildTraceCorrelationConditions(traceId?: string, correlationId?: string): any[] {
    const conditions: any[] = [];
    if (traceId) conditions.push(sql`le.trace_id = ${traceId}`);
    if (correlationId) conditions.push(sql`le.correlation_id = ${correlationId}`);
    return conditions;
  }

  private buildSourceComponentCondition(sourceComponent?: string): any[] {
    return sourceComponent ? [sql`le.source_component = ${sourceComponent}`] : [];
  }

  private buildPatternConditions(pattern?: string): any[] {
    if (!pattern) return [];
    const [actor, action, scope, target] = pattern.split('.');
    const conditions: any[] = [];
    if (actor && actor !== '*') conditions.push(sql`eat.name = ${actor}`);
    if (action && action !== '*') conditions.push(sql`eact.name = ${action}`);
    if (scope && scope !== '*') conditions.push(sql`est.name = ${scope}`);
    if (target && target !== '*') conditions.push(sql`ett.name = ${target}`);
    return conditions;
  }

  private combineConditions(conditions: any[]): any {
    if (conditions.length === 0) return sql`true`;
    if (conditions.length === 1) return conditions[0];
    return sql.join(conditions, sql` AND `);
  }

  private mapToLogSearchResult(row: any): LogSearchResult {
    let context: Record<string, any> | undefined;
    if (row.context) {
      if (typeof row.context === 'string') {
        context = JSON.parse(row.context);
      } else {
        context = row.context;
      }
    } else {
      context = undefined;
    }

    return {
      id: row.id,
      message: row.message,
      severityType: row.severity_type,
      severityLevel: row.severity_level ?? 'medium',
      sourceComponent: row.source_component,
      sourceFile: row.source_file,
      // FIXED: Use epoch milliseconds to avoid timezone conversion issues
      loggedAt: new Date(parseFloat(row.logged_at_ms)),
      rank: parseFloat(row.rank ?? '0'),
      context: context ?? {},
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
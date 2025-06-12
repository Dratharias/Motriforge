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
    const whereClause = this.buildWhereClause(query);

    const [results, count] = await Promise.all([
      this.db.execute(this.buildSearchQuery(whereClause, query.searchText, limit, offset)) as Promise<any[]>,
      this.db.execute(this.buildCountQuery(whereClause)) as Promise<any[]>
    ]);

    const total = count?.[0]?.total ?? 0;

    return {
      results: results.map(this.mapToLogSearchResult),
      total,
      hasMore: offset + results.length < total,
    };
  }

  async analyzePatterns(hoursBack = 24): Promise<LogPatternAnalysis[]> {
    const results = await this.db.execute(sql`SELECT * FROM analyze_log_patterns(${hoursBack})`) as any[];
    return results.map(row => ({
      pattern: row.pattern,
      logCount: parseInt(row.log_count),
      errorCount: parseInt(row.error_count),
      warnCount: parseInt(row.warn_count),
      uniqueUsers: parseInt(row.unique_users)
    }));
  }

  async getLogSummary(hoursBack = 24): Promise<LogSummary[]> {
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
    const results = await this.db.execute(sql`
      SELECT DISTINCT word
      FROM ts_stat('SELECT search_vector FROM log_entry WHERE is_active = true')
      WHERE word ILIKE ${partialQuery + '%'}
      ORDER BY ndoc DESC, word
      LIMIT ${limit}
    `) as any[];

    return results.map(row => row.word);
  }

  async getFilterOptions(): Promise<{ severityTypes: string[]; severityLevels: string[]; sourceComponents: string[]; patterns: string[] }> {
    const [severityTypes, severityLevels, sourceComponents, patterns] = await Promise.all([
      this.db.execute(sql`SELECT DISTINCT sc.type FROM severity_classification sc WHERE sc.is_active = true ORDER BY sc.type`),
      this.db.execute(sql`SELECT DISTINCT sc.level FROM severity_classification sc WHERE sc.is_active = true AND sc.level IS NOT NULL ORDER BY sc.priority_order`),
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
    await this.db.execute(sql`SELECT refresh_log_summary()`);
  }

  private buildWhereClause(query: LogSearchQuery): any {
    const conditions = this.buildConditions(query);
    return conditions.length > 0 ? sql`WHERE `.append(sql.join(conditions, sql` AND `)) : sql``;
  }

  private buildSearchQuery(whereClause: any, searchText?: string, limit?: number, offset?: number): any {
    return sql`
      SELECT 
        le.id, le.message,
        sc.type AS severity_type,
        sc.level AS severity_level,
        le.source_component, le.source_file,
        le.logged_at, le.context,
        le.trace_id, le.correlation_id, le.user_id,
        CONCAT(eat.name, '.', eact.name, '.', est.name, '.', ett.name) AS pattern,
        ${searchText ? sql`ts_rank(le.search_vector, websearch_to_tsquery('english', ${searchText}))` : sql`0`} AS rank
      FROM log_entry le
      ${this.buildJoins()}
      ${whereClause}
      ORDER BY ${searchText ? sql`rank DESC,` : sql``} le.logged_at DESC
      LIMIT ${limit} OFFSET ${offset}
    `;
  }

  private buildCountQuery(whereClause: any): any {
    return sql`
      SELECT COUNT(*)::int AS total
      FROM log_entry le
      ${this.buildJoins()}
      ${whereClause}
    `;
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
    this.addMainConditions(conditions, query);
    this.addPatternConditions(conditions, query.pattern);
    return conditions;
  }

  private addMainConditions(conditions: any[], query: LogSearchQuery): void {
    const {
      searchText, severityTypes, severityLevels,
      timeFrom, timeTo, userId, sessionId,
      traceId, correlationId, sourceComponent
    } = query;

    if (searchText) conditions.push(sql`le.search_vector @@ websearch_to_tsquery('english', ${searchText})`);
    if (severityTypes?.length) conditions.push(sql`sc.type = ANY(${severityTypes})`);
    if (severityLevels?.length) conditions.push(sql`sc.level = ANY(${severityLevels})`);
    if (timeFrom) conditions.push(sql`le.logged_at >= ${timeFrom}`);
    if (timeTo) conditions.push(sql`le.logged_at <= ${timeTo}`);
    if (userId) conditions.push(sql`le.user_id = ${userId}`);
    if (sessionId) conditions.push(sql`le.session_id = ${sessionId}`);
    if (traceId) conditions.push(sql`le.trace_id = ${traceId}`);
    if (correlationId) conditions.push(sql`le.correlation_id = ${correlationId}`);
    if (sourceComponent) conditions.push(sql`le.source_component = ${sourceComponent}`);
  }

  private addPatternConditions(conditions: any[], pattern?: string): void {
    if (!pattern) return;
    const [actor, action, scope, target] = pattern.split('.');
    if (actor && actor !== '*') conditions.push(sql`eat.name = ${actor}`);
    if (action && action !== '*') conditions.push(sql`eact.name = ${action}`);
    if (scope && scope !== '*') conditions.push(sql`est.name = ${scope}`);
    if (target && target !== '*') conditions.push(sql`ett.name = ${target}`);
  }

  private mapToLogSearchResult(row: any): LogSearchResult {
    return {
      id: row.id,
      message: row.message,
      severityType: row.severity_type,
      severityLevel: row.severity_level,
      sourceComponent: row.source_component,
      sourceFile: row.source_file,
      loggedAt: new Date(row.logged_at),
      rank: parseFloat(row.rank ?? '0'),
      context: row.context ? JSON.parse(row.context) : undefined,
      traceId: row.trace_id,
      correlationId: row.correlation_id,
      userId: row.user_id,
      pattern: row.pattern
    };
  }
}

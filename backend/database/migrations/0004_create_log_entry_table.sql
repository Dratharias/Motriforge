-- Create log_entry table with full-text search capabilities
CREATE TABLE IF NOT EXISTS log_entry (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  
  -- Actor.Action.Scope.Target pattern
  event_actor_id TEXT NOT NULL REFERENCES event_actor_type(id),
  event_action_id TEXT NOT NULL REFERENCES event_action_type(id),
  event_scope_id TEXT NOT NULL REFERENCES event_scope_type(id),
  event_target_id TEXT NOT NULL REFERENCES event_target_type(id),
  
  -- Severity classification
  severity_id TEXT NOT NULL REFERENCES severity_classification(id),
  
  -- Core log data
  message TEXT NOT NULL,
  context JSONB DEFAULT '{}',
  
  -- Tracing and correlation
  correlation_id TEXT,
  trace_id TEXT,
  parent_event_id TEXT, -- Self-reference to log_entry(id)
  user_id TEXT,
  session_id TEXT,
  
  -- Source information
  source_component TEXT NOT NULL,
  source_file TEXT,
  line_number INTEGER,
  stack_trace TEXT,
  
  -- Request context
  ip_address INET,
  user_agent TEXT,
  
  -- Full-text search vector (populated by trigger)
  search_vector TSVECTOR,
  
  -- Metadata
  created_by TEXT NOT NULL,
  logged_at TIMESTAMP NOT NULL DEFAULT now(),
  is_active BOOLEAN NOT NULL DEFAULT true
);

-- Create performance indexes
CREATE INDEX IF NOT EXISTS idx_log_entry_logged_at ON log_entry(logged_at DESC);
CREATE INDEX IF NOT EXISTS idx_log_entry_trace ON log_entry(trace_id) WHERE trace_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_log_entry_correlation ON log_entry(correlation_id) WHERE correlation_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_log_entry_user ON log_entry(user_id) WHERE user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_log_entry_session ON log_entry(session_id) WHERE session_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_log_entry_source ON log_entry(source_component);
CREATE INDEX IF NOT EXISTS idx_log_entry_pattern ON log_entry(event_actor_id, event_action_id, event_scope_id, event_target_id);
CREATE INDEX IF NOT EXISTS idx_log_entry_context ON log_entry USING GIN(context);
CREATE INDEX IF NOT EXISTS idx_log_entry_time_severity ON log_entry(logged_at DESC, severity_id);
CREATE INDEX IF NOT EXISTS idx_log_entry_user_time ON log_entry(user_id, logged_at DESC) WHERE user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_log_entry_search ON log_entry USING GIN(search_vector);

-- Create search vector update function
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

-- Create trigger for search vector updates
DROP TRIGGER IF EXISTS log_entry_search_update_trigger ON log_entry;
CREATE TRIGGER log_entry_search_update_trigger
  BEFORE INSERT OR UPDATE ON log_entry
  FOR EACH ROW EXECUTE FUNCTION log_entry_search_update();

-- Create materialized view for log aggregation
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
GROUP BY DATE_TRUNC('hour', logged_at), severity_id, source_component;

-- Create indexes for materialized view
CREATE INDEX IF NOT EXISTS idx_log_summary_hour ON log_summary(hour DESC);
CREATE INDEX IF NOT EXISTS idx_log_summary_severity ON log_summary(severity_id);

-- Create search function for log queries
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

-- Create pattern analysis function
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

-- Create refresh function for materialized view
CREATE OR REPLACE FUNCTION refresh_log_summary() RETURNS VOID AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY log_summary;
EXCEPTION
  WHEN OTHERS THEN
    -- If concurrent refresh fails, do regular refresh
    REFRESH MATERIALIZED VIEW log_summary;
END;
$$ LANGUAGE plpgsql;
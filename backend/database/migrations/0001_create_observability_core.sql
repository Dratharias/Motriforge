-- Create base observability tables first
CREATE TABLE IF NOT EXISTS severity_classification (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  level VARCHAR(20),
  type VARCHAR(20) NOT NULL,
  requires_notification BOOLEAN NOT NULL DEFAULT false,
  priority_order INTEGER NOT NULL DEFAULT 1,
  created_by TEXT NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT now(),
  is_active BOOLEAN NOT NULL DEFAULT true,
  UNIQUE(level, type)
);

-- Actor.Action.Scope.Target pattern tables
CREATE TABLE IF NOT EXISTS event_actor_type (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  name VARCHAR(50) NOT NULL UNIQUE,
  display_name VARCHAR(255) NOT NULL,
  description TEXT,
  created_by TEXT NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT now(),
  is_active BOOLEAN NOT NULL DEFAULT true
);

CREATE TABLE IF NOT EXISTS event_action_type (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  name VARCHAR(50) NOT NULL UNIQUE,
  display_name VARCHAR(255) NOT NULL,
  description TEXT,
  created_by TEXT NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT now(),
  is_active BOOLEAN NOT NULL DEFAULT true
);

CREATE TABLE IF NOT EXISTS event_scope_type (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  name VARCHAR(50) NOT NULL UNIQUE,
  display_name VARCHAR(255) NOT NULL,
  description TEXT,
  created_by TEXT NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT now(),
  is_active BOOLEAN NOT NULL DEFAULT true
);

CREATE TABLE IF NOT EXISTS event_target_type (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  name VARCHAR(50) NOT NULL UNIQUE,
  display_name VARCHAR(255) NOT NULL,
  description TEXT,
  created_by TEXT NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT now(),
  is_active BOOLEAN NOT NULL DEFAULT true
);

-- Main event log table
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
  status TEXT NOT NULL DEFAULT 'completed' CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'retrying')),
  error_details TEXT,
  created_by TEXT NOT NULL,
  occurred_at TIMESTAMP NOT NULL DEFAULT now(),
  is_active BOOLEAN NOT NULL DEFAULT true
);

-- Audit and error log tables
CREATE TABLE IF NOT EXISTS audit_log (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  action TEXT NOT NULL,
  old_values JSONB,
  new_values JSONB,
  reason TEXT,
  ip_address INET,
  user_agent TEXT,
  created_by TEXT NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT now(),
  is_active BOOLEAN NOT NULL DEFAULT true
);

CREATE TABLE IF NOT EXISTS error_log (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  error_code TEXT,
  error_message TEXT NOT NULL,
  error_description TEXT,
  severity_id TEXT NOT NULL REFERENCES severity_classification(id),
  source_component TEXT NOT NULL,
  source_method TEXT,
  stack_trace TEXT,
  context_data JSONB,
  status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'acknowledged', 'resolved', 'ignored')),
  resolved_at TIMESTAMP,
  resolved_by TEXT,
  created_by TEXT NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT now(),
  is_active BOOLEAN NOT NULL DEFAULT true
);
-- Initial Observability Schema Migration
-- This migration sets up the core observability infrastructure following the Actor.Action.Scope.Target pattern

-- Enable extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "citext";

-- Create enums for type safety
CREATE TYPE severity_level AS ENUM ('negligeable', 'lowest', 'low', 'medium', 'high', 'highest', 'critical');
CREATE TYPE severity_type AS ENUM ('debug', 'info', 'warn', 'error', 'audit', 'lifecycle');
CREATE TYPE event_status AS ENUM ('pending', 'processing', 'completed', 'failed', 'retrying');
CREATE TYPE entity_type AS ENUM ('user', 'institution', 'resource', 'system', 'service');
CREATE TYPE action AS ENUM ('create', 'read', 'update', 'delete', 'login', 'logout', 'access', 'modify');

-- Core Observability Tables

-- Unified severity system
CREATE TABLE severity_type (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    level VARCHAR(20) NOT NULL,
    type VARCHAR(20) NOT NULL,
    requires_notification BOOLEAN NOT NULL DEFAULT false,
    priority_order INTEGER NOT NULL DEFAULT 1,
    created_by UUID NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT now(),
    is_active BOOLEAN NOT NULL DEFAULT true,
    UNIQUE(level, type)
);

-- Actor.Action.Scope.Target pattern tables
CREATE TABLE event_actor_type (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(50) NOT NULL UNIQUE,
    display_name VARCHAR(255) NOT NULL,
    description TEXT,
    created_by UUID NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT now(),
    is_active BOOLEAN NOT NULL DEFAULT true
);

CREATE TABLE event_action_type (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(50) NOT NULL UNIQUE,
    display_name VARCHAR(255) NOT NULL,
    description TEXT,
    created_by UUID NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT now(),
    is_active BOOLEAN NOT NULL DEFAULT true
);

CREATE TABLE event_scope_type (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(50) NOT NULL UNIQUE,
    display_name VARCHAR(255) NOT NULL,
    description TEXT,
    created_by UUID NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT now(),
    is_active BOOLEAN NOT NULL DEFAULT true
);

CREATE TABLE event_target_type (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(50) NOT NULL UNIQUE,
    display_name VARCHAR(255) NOT NULL,
    description TEXT,
    created_by UUID NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT now(),
    is_active BOOLEAN NOT NULL DEFAULT true
);

-- Main event log
CREATE TABLE event_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_actor_id UUID NOT NULL REFERENCES event_actor_type(id),
    event_action_id UUID NOT NULL REFERENCES event_action_type(id),
    event_scope_id UUID NOT NULL REFERENCES event_scope_type(id),
    event_target_id UUID NOT NULL REFERENCES event_target_type(id),
    severity_id UUID NOT NULL REFERENCES severity_type(id),
    user_id UUID,
    session_id UUID,
    trace_id UUID,
    parent_event_id UUID REFERENCES event_log(id),
    event_data JSONB NOT NULL,
    context_data JSONB,
    ip_address INET,
    user_agent TEXT,
    status event_status NOT NULL DEFAULT 'completed',
    error_details TEXT,
    created_by UUID NOT NULL,
    occurred_at TIMESTAMP NOT NULL DEFAULT now(),
    is_active BOOLEAN NOT NULL DEFAULT true
);

-- Audit trail
CREATE TABLE audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID,
    entity_type entity_type NOT NULL,
    entity_id UUID NOT NULL,
    action action NOT NULL,
    old_values JSONB,
    new_values JSONB,
    changed_fields JSONB,
    ip_address INET,
    user_agent TEXT,
    session_id UUID,
    reason TEXT,
    audit_batch_id UUID,
    created_by UUID NOT NULL,
    occurred_at TIMESTAMP NOT NULL DEFAULT now(),
    is_active BOOLEAN NOT NULL DEFAULT true
);

-- Error tracking
CREATE TABLE error_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    error_code VARCHAR(100) NOT NULL,
    error_message VARCHAR(500) NOT NULL,
    error_description TEXT,
    severity_id UUID NOT NULL REFERENCES severity_type(id),
    user_id UUID,
    source_component VARCHAR(100) NOT NULL,
    source_method VARCHAR(200),
    stack_trace TEXT,
    context_data JSONB,
    ip_address INET,
    user_agent TEXT,
    session_id UUID,
    status VARCHAR(50) NOT NULL DEFAULT 'new',
    resolved_at TIMESTAMP,
    resolved_by UUID,
    resolution_notes TEXT,
    created_by UUID NOT NULL,
    occurred_at TIMESTAMP NOT NULL DEFAULT now(),
    is_active BOOLEAN NOT NULL DEFAULT true
);

-- Data lifecycle tracking
CREATE TABLE data_lifecycle_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    entity_type entity_type NOT NULL,
    entity_id UUID NOT NULL,
    operation VARCHAR(50) NOT NULL,
    reason TEXT NOT NULL,
    policy_id UUID,
    executed_by UUID NOT NULL,
    executed_at TIMESTAMP NOT NULL DEFAULT now(),
    data_size_bytes INTEGER,
    affected_records INTEGER NOT NULL DEFAULT 1,
    operation_details TEXT,
    success BOOLEAN NOT NULL DEFAULT true,
    error_message TEXT,
    created_by UUID NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT now(),
    is_active BOOLEAN NOT NULL DEFAULT true
);

-- Cache performance tracking
CREATE TABLE cache_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cache_key VARCHAR(255) NOT NULL,
    operation VARCHAR(50) NOT NULL,
    strategy VARCHAR(50) NOT NULL,
    hit_rate SMALLINT,
    response_time_ms INTEGER,
    data_size_bytes INTEGER,
    ttl_seconds INTEGER,
    user_id UUID,
    session_id UUID,
    context_data JSONB,
    created_by UUID NOT NULL,
    occurred_at TIMESTAMP NOT NULL DEFAULT now(),
    is_active BOOLEAN NOT NULL DEFAULT true
);

-- Create indexes for performance
CREATE INDEX idx_event_log_user_id ON event_log(user_id);
CREATE INDEX idx_event_log_occurred_at ON event_log(occurred_at);
CREATE INDEX idx_event_log_severity_id ON event_log(severity_id);
CREATE INDEX idx_event_log_status ON event_log(status);
CREATE INDEX idx_event_log_trace_id ON event_log(trace_id);

CREATE INDEX idx_audit_log_user_id ON audit_log(user_id);
CREATE INDEX idx_audit_log_entity ON audit_log(entity_type, entity_id);
CREATE INDEX idx_audit_log_occurred_at ON audit_log(occurred_at);
CREATE INDEX idx_audit_log_action ON audit_log(action);

CREATE INDEX idx_error_log_severity_id ON error_log(severity_id);
CREATE INDEX idx_error_log_source_component ON error_log(source_component);
CREATE INDEX idx_error_log_occurred_at ON error_log(occurred_at);
CREATE INDEX idx_error_log_status ON error_log(status);

CREATE INDEX idx_data_lifecycle_log_entity ON data_lifecycle_log(entity_type, entity_id);
CREATE INDEX idx_data_lifecycle_log_executed_at ON data_lifecycle_log(executed_at);
CREATE INDEX idx_data_lifecycle_log_operation ON data_lifecycle_log(operation);

CREATE INDEX idx_cache_log_cache_key ON cache_log(cache_key);
CREATE INDEX idx_cache_log_operation ON cache_log(operation);
CREATE INDEX idx_cache_log_strategy ON cache_log(strategy);
CREATE INDEX idx_cache_log_occurred_at ON cache_log(occurred_at);

-- Insert initial severity types
INSERT INTO severity_type (level, type, requires_notification, priority_order, created_by) VALUES
-- Debug severities
('low', 'debug', false, 1, 'system'),
('medium', 'debug', false, 2, 'system'),

-- Info severities
('low', 'info', false, 3, 'system'),
('medium', 'info', false, 4, 'system'),
('high', 'info', true, 5, 'system'),

-- Warning severities
('medium', 'warn', false, 6, 'system'),
('high', 'warn', true, 7, 'system'),
('highest', 'warn', true, 8, 'system'),

-- Error severities
('low', 'error', false, 9, 'system'),
('medium', 'error', true, 10, 'system'),
('high', 'error', true, 11, 'system'),
('highest', 'error', true, 12, 'system'),
('critical', 'error', true, 13, 'system'),

-- Audit severities
('medium', 'audit', false, 14, 'system'),
('high', 'audit', true, 15, 'system'),
('critical', 'audit', true, 16, 'system'),

-- Lifecycle severities
('low', 'lifecycle', false, 17, 'system'),
('medium', 'lifecycle', false, 18, 'system'),
('high', 'lifecycle', true, 19, 'system');

-- Insert Actor.Action.Scope.Target types
INSERT INTO event_actor_type (name, display_name, description, created_by) VALUES
('user', 'User', 'End user performing actions', 'system'),
('system', 'System', 'Automated system processes', 'system'),
('service', 'Service', 'Microservice components', 'system'),
('admin', 'Administrator', 'System administrator', 'system'),
('api', 'API', 'External API or integration', 'system');

INSERT INTO event_action_type (name, display_name, description, created_by) VALUES
('create', 'Create', 'Creating new resources', 'system'),
('read', 'Read', 'Reading or accessing resources', 'system'),
('update', 'Update', 'Updating existing resources', 'system'),
('delete', 'Delete', 'Deleting resources', 'system'),
('login', 'Login', 'User authentication', 'system'),
('logout', 'Logout', 'User session termination', 'system'),
('access', 'Access', 'Accessing protected resources', 'system'),
('modify', 'Modify', 'Modifying configurations or settings', 'system'),
('error', 'Error', 'Error conditions or failures', 'system'),
('complete', 'Complete', 'Successful completion of operations', 'system');

INSERT INTO event_scope_type (name, display_name, description, created_by) VALUES
('system', 'System', 'System-wide scope', 'system'),
('domain', 'Domain', 'Domain-specific scope', 'system'),
('institution', 'Institution', 'Institution-level scope', 'system'),
('user', 'User', 'User-specific scope', 'system'),
('session', 'Session', 'Session-level scope', 'system'),
('api', 'API', 'API operation scope', 'system'),
('database', 'Database', 'Database operation scope', 'system'),
('cache', 'Cache', 'Cache operation scope', 'system');

INSERT INTO event_target_type (name, display_name, description, created_by) VALUES
('user', 'User', 'User entities', 'system'),
('institution', 'Institution', 'Institution entities', 'system'),
('resource', 'Resource', 'General resources', 'system'),
('database', 'Database', 'Database entities', 'system'),
('cache', 'Cache', 'Cache entries', 'system'),
('session', 'Session', 'User sessions', 'system'),
('api', 'API', 'API endpoints', 'system'),
('file', 'File', 'File resources', 'system'),
('configuration', 'Configuration', 'System configurations', 'system'),
('service', 'Service', 'Service instances', 'system');
# Core "Audit" Definition & Event Tracking

**Section:** Audit & Events
**Subsection:** Core "Audit" Definition & Event Tracking

## Diagram

```mermaid
erDiagram
  %%=== Layer 1: Core Audit & Event Tracking ===%%
  %%— HIGH-VOLUME: Partitioned by occurred_at for performance —
  AUDIT_LOG {
    UUID id PK                         "NOT NULL; UNIQUE"
    UUID user_id FK                    "NULLABLE; references USER.id; NULL for system events"
    ENUM entity_type                   "NOT NULL; CHECK (entity_type IN ('USER', 'WORKOUT', 'EXERCISE', 'PROGRAM', 'INSTITUTION', 'PAYMENT', 'SUBSCRIPTION', 'MEDIA', 'EQUIPMENT', 'ROLE', 'PERMISSION'))"
    UUID entity_id                     "NOT NULL; record ID being audited"
    ENUM action                        "NOT NULL; CHECK (action IN ('CREATE', 'UPDATE', 'DELETE', 'VIEW', 'EXPORT', 'SHARE', 'ARCHIVE', 'RESTORE', 'LOGIN', 'LOGOUT'))"
    JSONB old_values                   "NULLABLE; before state for UPDATE/DELETE"
    JSONB new_values                   "NULLABLE; after state for CREATE/UPDATE"
    JSONB changed_fields               "NULLABLE; array of changed field names for efficiency"
    INET ip_address                    "NULLABLE; proper IP address type (supports IPv4/IPv6)"
    TEXT user_agent                    "NULLABLE; CHECK (LENGTH(user_agent) <= 1000)"
    UUID session_id                    "NULLABLE; for session correlation and grouping"
    TEXT reason                        "NULLABLE; CHECK (LENGTH(reason) <= 500); user-provided reason for change"
    UUID audit_batch_id FK             "NULLABLE; references AUDIT_BATCH.id; for batch operations"
    UUID created_by_user_id FK         "NOT NULL; references USER.id"
    TIMESTAMP occurred_at              "NOT NULL; DEFAULT now()"
    UNIQUE id_occurred_at              "(id, occurred_at); Required for partitioning"
    INDEX idx_audit_entity             "(entity_type, entity_id, occurred_at DESC)"
    INDEX idx_audit_user_time          "(user_id, occurred_at DESC) WHERE user_id IS NOT NULL"
    INDEX idx_audit_session            "(session_id, occurred_at DESC) WHERE session_id IS NOT NULL"
  }
  %%— PARTITION BY RANGE (occurred_at) MONTHLY —
  %%— audit_log_2024_01, audit_log_2024_02, etc. —
  
  %%— HIGH-VOLUME: Partitioned by occurred_at for performance —
  SYSTEM_EVENT {
    UUID id PK                         "NOT NULL; UNIQUE"
    UUID event_type_id FK              "NOT NULL; references EVENT_TYPE.id"
    UUID user_id FK                    "NULLABLE; references USER.id; NULL for system-only events"
    UUID resource_id                   "NULLABLE; related resource UUID"
    ENUM resource_type                 "NULLABLE; CHECK (resource_type IN ('WORKOUT', 'PROGRAM', 'EXERCISE', 'INSTITUTION', 'USER', 'PAYMENT', 'SUBSCRIPTION', 'MEDIA', 'EQUIPMENT'))"
    JSONB event_data                   "NOT NULL; event-specific payload with schema validation"
    ENUM severity                      "NOT NULL; CHECK (severity IN ('INFO', 'WARNING', 'ERROR', 'CRITICAL'))"
    INET ip_address                    "NULLABLE; proper IP address type"
    TEXT user_agent                    "NULLABLE; CHECK (LENGTH(user_agent) <= 1000)"
    UUID trace_id                      "NULLABLE; for distributed tracing correlation"
    UUID session_id                    "NULLABLE; for session correlation"
    UUID parent_event_id FK            "NULLABLE; references SYSTEM_EVENT.id; for event chains"
    UUID created_by_user_id FK         "NOT NULL; references USER.id"
    TIMESTAMP occurred_at              "NOT NULL; DEFAULT now()"
    UNIQUE id_occurred_at              "(id, occurred_at); Required for partitioning"
    INDEX idx_event_type_time          "(event_type_id, occurred_at DESC)"
    INDEX idx_event_severity_time      "(severity, occurred_at DESC) WHERE severity IN ('ERROR', 'CRITICAL')"
    INDEX idx_event_trace              "(trace_id, occurred_at DESC) WHERE trace_id IS NOT NULL"
    INDEX idx_event_user_time          "(user_id, occurred_at DESC) WHERE user_id IS NOT NULL"
  }
  %%— PARTITION BY RANGE (occurred_at) DAILY —
  %%— system_event_2024_01_01, system_event_2024_01_02, etc. —
  
  EVENT_TYPE {
    UUID id PK                         "NOT NULL; UNIQUE"
    ENUM name                          "NOT NULL; UNIQUE; CHECK (name IN ('LOGIN', 'LOGOUT', 'PASSWORD_RESET', 'SUBSCRIPTION_CHANGE', 'WORKOUT_COMPLETED', 'EXERCISE_ADDED', 'PROGRAM_STARTED', 'PAYMENT_PROCESSED', 'ERROR_OCCURRED', 'PERFORMANCE_ALERT', 'SECURITY_BREACH', 'DATA_EXPORT'))"
    VARCHAR(255) display_name          "NOT NULL"
    TEXT description                   "NOT NULL"
    ENUM category                      "NOT NULL; CHECK (category IN ('SECURITY', 'BUSINESS', 'SYSTEM', 'INTEGRATION', 'PERFORMANCE', 'USER_ACTION', 'COMPLIANCE'))"
    BOOLEAN requires_retention         "NOT NULL; DEFAULT true"
    SMALLINT retention_days            "NOT NULL; DEFAULT 90; CHECK (retention_days > 0 AND retention_days <= 2555)"
    BOOLEAN is_sensitive               "NOT NULL; DEFAULT false; contains PII or sensitive data"
    BOOLEAN requires_immediate_alert   "NOT NULL; DEFAULT false"
    JSONB event_schema                 "NULLABLE; JSON schema for event_data validation"
    UUID created_by_user_id FK         "NOT NULL; references USER.id"
    UUID updated_by_user_id FK         "NULLABLE; references USER.id"
    TIMESTAMP created_at               "NOT NULL; DEFAULT now()"
    TIMESTAMP updated_at               "NOT NULL; DEFAULT now()"
    BOOLEAN is_active                  "NOT NULL; DEFAULT true"
  }
  
  %%— Audit Configuration for fine-grained control —
  AUDIT_CONFIGURATION {
    UUID id PK                         "NOT NULL; UNIQUE"
    ENUM entity_type                   "NOT NULL; CHECK (entity_type IN ('USER', 'WORKOUT', 'EXERCISE', 'PROGRAM', 'INSTITUTION', 'PAYMENT', 'SUBSCRIPTION', 'MEDIA', 'EQUIPMENT', 'ROLE', 'PERMISSION'))"
    ENUM action                        "NOT NULL; CHECK (action IN ('CREATE', 'UPDATE', 'DELETE', 'VIEW', 'EXPORT', 'SHARE', 'ARCHIVE', 'RESTORE', 'LOGIN', 'LOGOUT'))"
    BOOLEAN is_enabled                 "NOT NULL; DEFAULT true"
    BOOLEAN track_old_values           "NOT NULL; DEFAULT true"
    BOOLEAN track_new_values           "NOT NULL; DEFAULT true"
    BOOLEAN track_field_changes        "NOT NULL; DEFAULT true"
    JSONB excluded_fields              "NULLABLE; array of field names to exclude from tracking"
    JSONB sensitive_fields             "NULLABLE; fields requiring additional encryption"
    SMALLINT retention_days            "NOT NULL; DEFAULT 2555; CHECK (retention_days > 0 AND retention_days <= 3650); ~7-10 years max"
    BOOLEAN requires_approval          "NOT NULL; DEFAULT false; for sensitive operations"
    UUID created_by_user_id FK         "NOT NULL; references USER.id"
    UUID updated_by_user_id FK         "NULLABLE; references USER.id"
    TIMESTAMP created_at               "NOT NULL; DEFAULT now()"
    TIMESTAMP updated_at               "NOT NULL; DEFAULT now()"
    BOOLEAN is_active                  "NOT NULL; DEFAULT true"
    UNIQUE entity_action_config        "(entity_type, action); Business constraint: one config per entity-action pair"
  }
  
  %%— Session tracking for correlation —
  AUDIT_SESSION {
    UUID session_id PK                 "NOT NULL; UNIQUE"
    UUID user_id FK                    "NULLABLE; references USER.id; NULL for anonymous sessions"
    INET ip_address                    "NOT NULL"
    TEXT user_agent                    "NOT NULL; CHECK (LENGTH(user_agent) <= 1000)"
    JSONB session_metadata             "NULLABLE; browser info, device type, geolocation, etc."
    VARCHAR(100) session_source        "NULLABLE; WEB, MOBILE_APP, API, SYSTEM"
    TIMESTAMP session_started          "NOT NULL; DEFAULT now()"
    TIMESTAMP session_ended            "NULLABLE"
    TIMESTAMP last_activity            "NOT NULL; DEFAULT now()"
    BOOLEAN is_active                  "NOT NULL; DEFAULT true"
    BOOLEAN is_suspicious              "NOT NULL; DEFAULT false; flagged by security rules"
    INDEX idx_session_user_time        "(user_id, session_started DESC) WHERE user_id IS NOT NULL"
    INDEX idx_session_ip_time          "(ip_address, session_started DESC)"
    INDEX idx_session_suspicious       "(is_suspicious, session_started DESC) WHERE is_suspicious = true"
  }
  
  %%— Batch operations tracking with metadata —
  AUDIT_BATCH {
    UUID id PK                         "NOT NULL; UNIQUE"
    UUID initiated_by_user_id FK       "NOT NULL; references USER.id"
    ENUM batch_type                    "NOT NULL; CHECK (batch_type IN ('BULK_UPDATE', 'BULK_DELETE', 'BULK_EXPORT', 'MIGRATION', 'SYSTEM_MAINTENANCE', 'DATA_IMPORT', 'CLEANUP'))"
    VARCHAR(255) batch_name            "NOT NULL; descriptive name for the batch operation"
    TEXT batch_description             "NOT NULL"
    JSONB batch_parameters             "NULLABLE; operation parameters and configuration"
    INT total_operations               "NOT NULL; DEFAULT 0; CHECK (total_operations >= 0)"
    INT successful_operations          "NOT NULL; DEFAULT 0; CHECK (successful_operations >= 0)"
    INT failed_operations              "NOT NULL; DEFAULT 0; CHECK (failed_operations >= 0)"
    INT skipped_operations             "NOT NULL; DEFAULT 0; CHECK (skipped_operations >= 0)"
    TIMESTAMP batch_started            "NOT NULL; DEFAULT now()"
    TIMESTAMP batch_completed          "NULLABLE"
    ENUM batch_status                  "NOT NULL; DEFAULT 'RUNNING'; CHECK (batch_status IN ('RUNNING', 'COMPLETED', 'FAILED', 'CANCELLED', 'PAUSED'))"
    TEXT failure_reason                "NULLABLE; reason if batch failed"
    DECIMAL progress_percentage        "NOT NULL; DEFAULT 0.0; CHECK (progress_percentage >= 0.0 AND progress_percentage <= 100.0)"
    UUID created_by_user_id FK         "NOT NULL; references USER.id"
    TIMESTAMP created_at               "NOT NULL; DEFAULT now()"
    BOOLEAN is_active                  "NOT NULL; DEFAULT true"
    CHECK operations_consistency       "(total_operations = successful_operations + failed_operations + skipped_operations)"
  }
  
  AUDIT_BATCH_OPERATION {
    UUID id PK                         "NOT NULL; UNIQUE"
    UUID audit_batch_id FK             "NOT NULL; references AUDIT_BATCH.id"
    UUID audit_log_id FK               "NOT NULL; references AUDIT_LOG.id"
    SMALLINT operation_sequence        "NOT NULL; CHECK (operation_sequence > 0); order within batch"
    ENUM operation_status              "NOT NULL; CHECK (operation_status IN ('PENDING', 'SUCCESS', 'FAILED', 'SKIPPED', 'RETRYING'))"
    TEXT error_message                 "NULLABLE; detailed error if operation failed"
    JSONB operation_metadata           "NULLABLE; operation-specific data"
    SMALLINT retry_count               "NOT NULL; DEFAULT 0; CHECK (retry_count >= 0)"
    TIMESTAMP processed_at             "NOT NULL; DEFAULT now()"
    UNIQUE batch_sequence              "(audit_batch_id, operation_sequence); Business constraint: unique sequence per batch"
    INDEX idx_batch_op_status          "(audit_batch_id, operation_status, operation_sequence)"
  }
  
  %%— Data retention policy management —
  AUDIT_RETENTION_RULE {
    UUID id PK                         "NOT NULL; UNIQUE"
    UUID audit_configuration_id FK     "NOT NULL; references AUDIT_CONFIGURATION.id"
    ENUM retention_action              "NOT NULL; CHECK (retention_action IN ('ARCHIVE', 'DELETE', 'COMPRESS', 'ANONYMIZE'))"
    SMALLINT trigger_after_days        "NOT NULL; CHECK (trigger_after_days > 0)"
    JSONB retention_criteria           "NULLABLE; additional criteria for retention"
    BOOLEAN is_enabled                 "NOT NULL; DEFAULT true"
    UUID created_by_user_id FK         "NOT NULL; references USER.id"
    UUID updated_by_user_id FK         "NULLABLE; references USER.id"
    TIMESTAMP created_at               "NOT NULL; DEFAULT now()"
    TIMESTAMP updated_at               "NOT NULL; DEFAULT now()"
    BOOLEAN is_active                  "NOT NULL; DEFAULT true"
  }
  
  %%— Relationships in Layer 1 —
  AUDIT_LOG }o--|| USER               : "performed_by_user"
  AUDIT_LOG }|--|| USER               : "created_by_user"
  AUDIT_LOG }o--|| AUDIT_SESSION      : "session_context"
  AUDIT_LOG }o--|| AUDIT_BATCH        : "batch_operation"
  
  SYSTEM_EVENT }o--|| USER            : "relates_to_user"
  SYSTEM_EVENT }|--|| EVENT_TYPE      : "event_type_lookup"
  SYSTEM_EVENT }|--|| USER            : "created_by_user"
  SYSTEM_EVENT }o--|| AUDIT_SESSION   : "session_context"
  SYSTEM_EVENT }o--|| SYSTEM_EVENT    : "parent_event"
  
  EVENT_TYPE }|--|| USER              : "created_by_user"
  EVENT_TYPE }o--|| USER              : "updated_by_user"
  
  AUDIT_CONFIGURATION }|--|| USER     : "created_by_user"
  AUDIT_CONFIGURATION }o--|| USER     : "updated_by_user"
  AUDIT_CONFIGURATION ||--o{ AUDIT_RETENTION_RULE : "retention_rules"
  
  AUDIT_SESSION }o--|| USER           : "user_session"
  
  AUDIT_BATCH }|--|| USER             : "initiated_by_user"
  AUDIT_BATCH }|--|| USER             : "created_by_user"
  AUDIT_BATCH ||--o{ AUDIT_BATCH_OPERATION : "contains_operations"
  AUDIT_BATCH_OPERATION }|--|| AUDIT_LOG : "references_audit_entry"
  
  AUDIT_RETENTION_RULE }|--|| USER    : "created_by_user"
  AUDIT_RETENTION_RULE }o--|| USER    : "updated_by_user"
```

## Notes

This diagram represents the core "audit" definition & event tracking structure and relationships within the audit & events domain.

---
*Generated from diagram extraction script*

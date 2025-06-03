# Core "Audit" Definition & Event Tracking

**Section:** Audit & Events
**Subsection:** Core "Audit" Definition & Event Tracking

## Diagram

```mermaid
erDiagram
  %%=== Layer 1: Core Audit & Event Tracking - FIXED ===%%
  %%— HIGH-VOLUME: Partitioned by occurred_at for performance —
  AUDIT_LOG {
    UUID id PK                         "NOT NULL; UNIQUE"
    UUID user_id FK                    "NULLABLE; references USER.id; NULL for system events"
    ENUM entity_type                   "NOT NULL; CHECK (entity_type IN ('USER', 'WORKOUT', 'EXERCISE', 'PROGRAM', 'INSTITUTION', 'PAYMENT', 'SUBSCRIPTION', 'MEDIA', 'EQUIPMENT'))"
    UUID entity_id                     "NOT NULL; record ID"
    ENUM action                        "NOT NULL; CHECK (action IN ('CREATE', 'UPDATE', 'DELETE', 'VIEW', 'EXPORT', 'SHARE', 'ARCHIVE', 'RESTORE'))"
    JSONB old_values                   "NULLABLE; before state"
    JSONB new_values                   "NULLABLE; after state"
    JSONB changed_fields               "NULLABLE; list of changed field names"
    INET ip_address                    "NULLABLE; proper IP address type"
    TEXT user_agent                    "NULLABLE; CHECK (LENGTH(user_agent) <= 1000)"
    UUID session_id                    "NULLABLE; for session grouping"
    TEXT reason                        "NULLABLE; CHECK (LENGTH(reason) <= 500); user-provided reason for change"
    UUID created_by_user_id FK         "NOT NULL; references USER.id"
    TIMESTAMP occurred_at              "NOT NULL; DEFAULT now()"
    UNIQUE(id, occurred_at)            "Required for partitioning"
  } 
  %%— PARTITION BY RANGE (occurred_at) —
  %%— Monthly partitions: audit_log_2024_01, audit_log_2024_02, etc.
  
  %%— HIGH-VOLUME: Partitioned by occurred_at for performance —
  SYSTEM_EVENT {
    UUID id PK                         "NOT NULL; UNIQUE"
    UUID event_type_id FK              "NOT NULL; references EVENT_TYPE.id"
    UUID user_id FK                    "NULLABLE; references USER.id"
    UUID resource_id                   "NULLABLE; related resource"
    ENUM resource_type                 "NULLABLE; CHECK (resource_type IN ('WORKOUT', 'PROGRAM', 'EXERCISE', 'INSTITUTION', 'USER', 'PAYMENT', 'SUBSCRIPTION'))"
    JSONB event_data                   "NOT NULL; event-specific payload"
    ENUM severity                      "NOT NULL; CHECK (severity IN ('INFO', 'WARNING', 'ERROR', 'CRITICAL'))"
    INET ip_address                    "NULLABLE; proper IP address type"
    TEXT user_agent                    "NULLABLE; CHECK (LENGTH(user_agent) <= 1000)"
    UUID trace_id                      "NULLABLE; for distributed tracing"
    UUID session_id                    "NULLABLE; for session correlation"
    UUID created_by_user_id FK         "NOT NULL; references USER.id"
    TIMESTAMP occurred_at              "NOT NULL; DEFAULT now()"
    UNIQUE(id, occurred_at)            "Required for partitioning"
  }
  %%— PARTITION BY RANGE (occurred_at) —
  %%— Daily partitions: system_event_2024_01_01, system_event_2024_01_02, etc.
  
  EVENT_TYPE {
    UUID id PK                         "NOT NULL; UNIQUE"
    ENUM name                          "NOT NULL; UNIQUE; CHECK (name IN ('LOGIN', 'LOGOUT', 'PASSWORD_RESET', 'SUBSCRIPTION_CHANGE', 'WORKOUT_COMPLETED', 'EXERCISE_ADDED', 'PROGRAM_STARTED', 'PAYMENT_PROCESSED', 'ERROR_OCCURRED', 'PERFORMANCE_ALERT'))"
    TEXT description                   "NOT NULL"
    ENUM category                      "NOT NULL; CHECK (category IN ('SECURITY', 'BUSINESS', 'SYSTEM', 'INTEGRATION', 'PERFORMANCE', 'USER_ACTION'))"
    BOOLEAN requires_retention         "NOT NULL; DEFAULT true"
    SMALLINT retention_days            "NOT NULL; DEFAULT 90; CHECK (retention_days > 0)"
    BOOLEAN is_sensitive               "NOT NULL; DEFAULT false; contains PII or sensitive data"
    BOOLEAN requires_immediate_alert   "NOT NULL; DEFAULT false"
    UUID created_by_user_id FK         "NOT NULL; references USER.id"
    UUID updated_by_user_id FK         "NULLABLE; references USER.id"
    TIMESTAMP created_at               "NOT NULL; DEFAULT now()"
    TIMESTAMP updated_at               "NOT NULL; DEFAULT now()"
    BOOLEAN is_active                  "NOT NULL; DEFAULT true"
  }
  
  %%— Audit Configuration for fine-grained control —
  AUDIT_CONFIGURATION {
    UUID id PK                         "NOT NULL; UNIQUE"
    ENUM entity_type                   "NOT NULL; CHECK (entity_type IN ('USER', 'WORKOUT', 'EXERCISE', 'PROGRAM', 'INSTITUTION', 'PAYMENT', 'SUBSCRIPTION', 'MEDIA', 'EQUIPMENT'))"
    ENUM action                        "NOT NULL; CHECK (action IN ('CREATE', 'UPDATE', 'DELETE', 'VIEW', 'EXPORT', 'SHARE', 'ARCHIVE', 'RESTORE'))"
    BOOLEAN is_enabled                 "NOT NULL; DEFAULT true"
    BOOLEAN track_old_values           "NOT NULL; DEFAULT true"
    BOOLEAN track_new_values           "NOT NULL; DEFAULT true"
    BOOLEAN track_field_changes        "NOT NULL; DEFAULT true"
    JSONB excluded_fields              "NULLABLE; fields to exclude from tracking"
    SMALLINT retention_days            "NOT NULL; DEFAULT 2555; CHECK (retention_days > 0); ~7 years"
    UUID created_by_user_id FK         "NOT NULL; references USER.id"
    UUID updated_by_user_id FK         "NULLABLE; references USER.id"
    TIMESTAMP created_at               "NOT NULL; DEFAULT now()"
    TIMESTAMP updated_at               "NOT NULL; DEFAULT now()"
    BOOLEAN is_active                  "NOT NULL; DEFAULT true"
    UNIQUE(entity_type, action)        "Business constraint: one config per entity-action pair"
  }
  
  %%— Session tracking for correlation —
  AUDIT_SESSION {
    UUID session_id PK                 "NOT NULL; UNIQUE"
    UUID user_id FK                    "NULLABLE; references USER.id; NULL for anonymous sessions"
    INET ip_address                    "NOT NULL"
    TEXT user_agent                    "NOT NULL; CHECK (LENGTH(user_agent) <= 1000)"
    JSONB session_metadata             "NULLABLE; browser info, device type, etc."
    TIMESTAMP session_started          "NOT NULL; DEFAULT now()"
    TIMESTAMP session_ended            "NULLABLE"
    TIMESTAMP last_activity            "NOT NULL; DEFAULT now()"
    BOOLEAN is_active                  "NOT NULL; DEFAULT true"
  }
  
  %%— Batch operations tracking —
  AUDIT_BATCH {
    UUID id PK                         "NOT NULL; UNIQUE"
    UUID initiated_by_user_id FK       "NOT NULL; references USER.id"
    ENUM batch_type                    "NOT NULL; CHECK (batch_type IN ('BULK_UPDATE', 'BULK_DELETE', 'BULK_EXPORT', 'MIGRATION', 'SYSTEM_MAINTENANCE'))"
    TEXT batch_description             "NOT NULL"
    JSONB batch_parameters             "NULLABLE; operation parameters"
    INT total_operations               "NOT NULL; DEFAULT 0; CHECK (total_operations >= 0)"
    INT successful_operations          "NOT NULL; DEFAULT 0; CHECK (successful_operations >= 0)"
    INT failed_operations              "NOT NULL; DEFAULT 0; CHECK (failed_operations >= 0)"
    TIMESTAMP batch_started            "NOT NULL; DEFAULT now()"
    TIMESTAMP batch_completed          "NULLABLE"
    ENUM batch_status                  "NOT NULL; DEFAULT 'RUNNING'; CHECK (batch_status IN ('RUNNING', 'COMPLETED', 'FAILED', 'CANCELLED'))"
    UUID created_by_user_id FK         "NOT NULL; references USER.id"
    TIMESTAMP created_at               "NOT NULL; DEFAULT now()"
    BOOLEAN is_active                  "NOT NULL; DEFAULT true"
  }
  
  AUDIT_BATCH_OPERATION {
    UUID id PK                         "NOT NULL; UNIQUE"
    UUID audit_batch_id FK             "NOT NULL; references AUDIT_BATCH.id"
    UUID audit_log_id FK               "NOT NULL; references AUDIT_LOG.id"
    SMALLINT operation_sequence        "NOT NULL; CHECK (operation_sequence > 0); order within batch"
    ENUM operation_status              "NOT NULL; CHECK (operation_status IN ('PENDING', 'SUCCESS', 'FAILED', 'SKIPPED'))"
    TEXT error_message                 "NULLABLE; if operation failed"
    TIMESTAMP processed_at             "NOT NULL; DEFAULT now()"
    UNIQUE(audit_batch_id, operation_sequence) "Business constraint: unique sequence per batch"
  }
  
  %%— Relationships in Layer 1 —
  AUDIT_LOG }o--|| USER               : "performed by user"
  AUDIT_LOG }|--|| USER               : "created_by_user"
  AUDIT_LOG }o--|| AUDIT_SESSION      : "session context"
  
  SYSTEM_EVENT }o--|| USER            : "relates to user"
  SYSTEM_EVENT }|--|| EVENT_TYPE      : "event type lookup"
  SYSTEM_EVENT }|--|| USER            : "created_by_user"
  SYSTEM_EVENT }o--|| AUDIT_SESSION   : "session context"
  
  EVENT_TYPE }|--|| USER              : "created_by_user"
  EVENT_TYPE }o--|| USER              : "updated_by_user"
  
  AUDIT_CONFIGURATION }|--|| USER     : "created_by_user"
  AUDIT_CONFIGURATION }o--|| USER     : "updated_by_user"
  
  AUDIT_SESSION }o--|| USER           : "user session"
  
  AUDIT_BATCH }|--|| USER             : "initiated_by_user"
  AUDIT_BATCH }|--|| USER             : "created_by_user"
  AUDIT_BATCH ||--o{ AUDIT_BATCH_OPERATION : "contains operations"
  AUDIT_BATCH_OPERATION }|--|| AUDIT_LOG : "references audit entry"

```

## Notes

This diagram represents the core "audit" definition & event tracking structure and relationships within the audit & events domain.

---
*Generated from diagram extraction script*

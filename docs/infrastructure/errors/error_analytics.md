# Error Analytics & Monitoring

```mermaid
erDiagram
    ERROR_FREQUENCY {
        UUID error_id PK FK "NOT NULL"
        DATE frequency_date PK "NOT NULL"
        SMALLINT occurrence_count "NOT NULL DEFAULT 0"
        SMALLINT unique_users_affected "NOT NULL DEFAULT 0"
        SMALLINT unique_sessions_affected "NOT NULL DEFAULT 0"
        TIMESTAMP first_occurrence "NOT NULL"
        TIMESTAMP last_occurrence "NOT NULL"
        TIMESTAMP calculated_at "NOT NULL DEFAULT now()"
    }
    ERROR_TREND {
        UUID id PK
        UUID error_type_id FK "NOT NULL"
        DATE trend_date "NOT NULL"
        SMALLINT total_errors "NOT NULL DEFAULT 0"
        SMALLINT new_errors "NOT NULL DEFAULT 0"
        SMALLINT resolved_errors "NOT NULL DEFAULT 0"
        DECIMAL resolution_time_avg_hours "NOT NULL DEFAULT 0"
        DECIMAL trend_direction "NOT NULL"
        TIMESTAMP calculated_at "NOT NULL DEFAULT now()"
    }
    ERROR_ALERT {
        UUID id PK
        VARCHAR(100) alert_name "NOT NULL"
        TEXT alert_description "NULLABLE LENGTH 1000"
        UUID error_type_id FK "NULLABLE"
        UUID severity_level_id FK "NULLABLE"
        SMALLINT threshold_count "NOT NULL"
        SMALLINT threshold_time_minutes "NOT NULL"
        JSONB alert_recipients "NOT NULL"
        BOOLEAN is_active "NOT NULL DEFAULT true"
        TIMESTAMP last_triggered "NULLABLE"
        UUID created_by FK "NOT NULL"
        TIMESTAMP created_at "NOT NULL DEFAULT now()"
    }
    ERROR_ALERT_TRIGGER {
        UUID id PK
        UUID error_alert_id FK "NOT NULL"
        SMALLINT trigger_count "NOT NULL"
        JSONB trigger_errors "NOT NULL"
        BOOLEAN alert_sent "NOT NULL DEFAULT false"
        TIMESTAMP triggered_at "NOT NULL DEFAULT now()"
        TIMESTAMP alert_sent_at "NULLABLE"
    }
    ERROR_EXPORT {
        UUID id PK
        UUID requested_by FK "NOT NULL"
        DATE export_start_date "NOT NULL"
        DATE export_end_date "NOT NULL"
        JSONB export_filters "NULLABLE"
        ENUM export_format "NOT NULL"
        ENUM export_scope "NOT NULL"
        VARCHAR(500) export_url "NULLABLE"
        ENUM export_status "NOT NULL"
        TIMESTAMP requested_at "NOT NULL DEFAULT now()"
        TIMESTAMP completed_at "NULLABLE"
        TIMESTAMP expires_at "NULLABLE"
    }
    ERROR ||--o{ ERROR_FREQUENCY : "frequency_tracking"
    ERROR_TYPE ||--o{ ERROR_TREND : "trend_analysis"
    ERROR_TYPE ||--o{ ERROR_ALERT : "alerts"
    SEVERITY_LEVEL ||--o{ ERROR_ALERT : "severity_alerts"
    ERROR_ALERT ||--o{ ERROR_ALERT_TRIGGER : "triggers"
    USER ||--o{ ERROR_EXPORT : "exports"
```
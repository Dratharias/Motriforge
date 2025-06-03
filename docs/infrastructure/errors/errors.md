# Error Handling & Monitoring
```mermaid
erDiagram
    ERROR_TYPE {
        UUID id PK
        VARCHAR(50) name "NOT NULL UNIQUE"
        VARCHAR(255) display_name "NOT NULL"
        TEXT description "NOT NULL LENGTH 1000"
        ENUM category "NOT NULL"
        BOOLEAN requires_immediate_attention "NOT NULL DEFAULT false"
        BOOLEAN is_user_facing "NOT NULL DEFAULT false"
        SMALLINT default_retention_days "NOT NULL DEFAULT 90"
        UUID created_by FK "NOT NULL"
        TIMESTAMP created_at "NOT NULL DEFAULT now()"
        BOOLEAN is_active "NOT NULL DEFAULT true"
    }
    SEVERITY_LEVEL {
        UUID id PK
        VARCHAR(50) name "NOT NULL UNIQUE"
        TEXT description "NOT NULL LENGTH 500"
        VARCHAR(7) color_code "NOT NULL"
        BOOLEAN requires_notification "NOT NULL DEFAULT false"
        BOOLEAN requires_escalation "NOT NULL DEFAULT false"
        SMALLINT escalation_minutes "NULLABLE"
        UUID created_by FK "NOT NULL"
        TIMESTAMP created_at "NOT NULL DEFAULT now()"
        BOOLEAN is_active "NOT NULL DEFAULT true"
    }
    ERROR_STATUS {
        UUID id PK
        VARCHAR(50) name "NOT NULL UNIQUE"
        TEXT description "NULLABLE LENGTH 500"
        BOOLEAN is_final_status "NOT NULL DEFAULT false"
        BOOLEAN requires_action "NOT NULL DEFAULT true"
        UUID created_by FK "NOT NULL"
        TIMESTAMP created_at "NOT NULL DEFAULT now()"
        BOOLEAN is_active "NOT NULL DEFAULT true"
    }
    ERROR {
        UUID id PK
        VARCHAR(100) error_code "NOT NULL"
        VARCHAR(500) error_message "NOT NULL"
        TEXT error_description "NULLABLE LENGTH 2000"
        UUID error_type_id FK "NOT NULL"
        UUID severity_level_id FK "NOT NULL"
        UUID user_id FK "NULLABLE"
        VARCHAR(100) source_component "NOT NULL"
        VARCHAR(200) source_method "NULLABLE"
        TEXT stack_trace "NULLABLE LENGTH 10000"
        JSONB context_data "NULLABLE"
        INET ip_address "NULLABLE"
        TEXT user_agent "NULLABLE LENGTH 1000"
        UUID session_id "NULLABLE"
        UUID error_status_id FK "NOT NULL"
        UUID visibility_id FK "NOT NULL"
        UUID created_by FK "NOT NULL"
        TIMESTAMP occurred_at "NOT NULL DEFAULT now()"
        TIMESTAMP updated_at "NOT NULL DEFAULT now()"
        BOOLEAN is_active "NOT NULL DEFAULT true"
    }
    ERROR_CATEGORY {
        UUID error_id PK FK "NOT NULL"
        UUID category_id PK FK "NOT NULL"
        UUID created_by FK "NOT NULL"
        TIMESTAMP created_at "NOT NULL DEFAULT now()"
        BOOLEAN is_active "NOT NULL DEFAULT true"
    }
    ERROR_TAG {
        UUID error_id PK FK "NOT NULL"
        UUID tag_id PK FK "NOT NULL"
        UUID created_by FK "NOT NULL"
        TIMESTAMP created_at "NOT NULL DEFAULT now()"
        BOOLEAN is_active "NOT NULL DEFAULT true"
    }
    ERROR }|--|| ERROR_TYPE : "type"
    ERROR }|--|| SEVERITY_LEVEL : "severity"
    ERROR }|--|| ERROR_STATUS : "status"
    ERROR }|--|| VISIBILITY : "visibility"
    ERROR }|--|| USER : "user_context"
    ERROR ||--o{ ERROR_CATEGORY : "categories"
    ERROR ||--o{ ERROR_TAG : "tags"
    ERROR_CATEGORY }|--|| CATEGORY : "category"
    ERROR_TAG }|--|| TAG : "tag"
```


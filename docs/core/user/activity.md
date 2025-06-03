# Activity Tracking
```mermaid
erDiagram
    ACTIVITY_TYPE {
        UUID id PK
        VARCHAR(50) name "NOT NULL UNIQUE"
        VARCHAR(255) display_name "NOT NULL"
        TEXT description "NULLABLE LENGTH 500"
        BOOLEAN is_trackable "NOT NULL DEFAULT true"
        BOOLEAN requires_resource "NOT NULL DEFAULT false"
        BOOLEAN generates_notification "NOT NULL DEFAULT false"
        UUID created_by FK "NOT NULL"
        TIMESTAMP created_at "NOT NULL DEFAULT now()"
        BOOLEAN is_active "NOT NULL DEFAULT true"
    }
    ACTIVITY {
        UUID id PK
        UUID user_id FK "NOT NULL"
        UUID activity_type_id FK "NOT NULL"
        VARCHAR(255) title "NOT NULL"
        TEXT description "NULLABLE LENGTH 2000"
        JSONB metadata "NULLABLE"
        TIMESTAMP occurred_at "NOT NULL"
        BOOLEAN is_system_generated "NOT NULL DEFAULT false"
        UUID visibility_id FK "NOT NULL"
        UUID created_by FK "NOT NULL"
        TIMESTAMP created_at "NOT NULL DEFAULT now()"
        BOOLEAN is_active "NOT NULL DEFAULT true"
    }
    ACTIVITY_RESOURCE {
        UUID id PK
        UUID activity_id FK "NOT NULL"
        UUID resource_id "NOT NULL"
        ENUM resource_type "NOT NULL"
        ENUM interaction_type "NOT NULL"
        UUID created_by FK "NOT NULL"
        TIMESTAMP created_at "NOT NULL DEFAULT now()"
        BOOLEAN is_active "NOT NULL DEFAULT true"
    }
    ACTIVITY_PARTICIPANT {
        UUID activity_id PK FK "NOT NULL"
        UUID user_id PK FK "NOT NULL"
        ENUM participation_type "NOT NULL"
        TIMESTAMP joined_at "NOT NULL DEFAULT now()"
        TEXT notes "NULLABLE LENGTH 2000"
        UUID created_by FK "NOT NULL"
        TIMESTAMP created_at "NOT NULL DEFAULT now()"
        BOOLEAN is_active "NOT NULL DEFAULT true"
    }
    ACTIVITY_INSTITUTION {
        UUID activity_id PK FK "NOT NULL"
        UUID institution_id PK FK "NOT NULL"
        ENUM involvement_type "NOT NULL"
        UUID created_by FK "NOT NULL"
        TIMESTAMP created_at "NOT NULL DEFAULT now()"
        BOOLEAN is_active "NOT NULL DEFAULT true"
    }
    ACTIVITY_METRIC {
        UUID id PK
        UUID activity_id FK "NOT NULL"
        UUID metric_id FK "NOT NULL"
        DECIMAL value "NOT NULL"
        DECIMAL previous_value "NULLABLE"
        TIMESTAMP measured_at "NOT NULL"
        UUID created_by FK "NOT NULL"
        TIMESTAMP created_at "NOT NULL DEFAULT now()"
        BOOLEAN is_active "NOT NULL DEFAULT true"
    }
    ACTIVITY_STREAK {
        UUID id PK
        UUID user_id FK "NOT NULL"
        UUID activity_type_id FK "NOT NULL"
        SMALLINT current_count "NOT NULL DEFAULT 0"
        SMALLINT best_count "NOT NULL DEFAULT 0"
        DATE last_activity_date "NULLABLE"
        DATE streak_started_date "NULLABLE"
        UUID created_by FK "NOT NULL"
        TIMESTAMP created_at "NOT NULL DEFAULT now()"
        BOOLEAN is_active "NOT NULL DEFAULT true"
    }
    USER ||--o{ ACTIVITY : "activities"
    USER ||--o{ ACTIVITY_STREAK : "streaks"
    ACTIVITY }|--|| ACTIVITY_TYPE : "type"
    ACTIVITY }|--|| VISIBILITY : "visibility"
    ACTIVITY ||--o{ ACTIVITY_RESOURCE : "resources"
    ACTIVITY ||--o{ ACTIVITY_PARTICIPANT : "participants"
    ACTIVITY ||--o{ ACTIVITY_INSTITUTION : "institutions"
    ACTIVITY ||--o{ ACTIVITY_METRIC : "metrics"
    ACTIVITY_PARTICIPANT }|--|| USER : "participant"
    ACTIVITY_INSTITUTION }|--|| INSTITUTION : "institution"
    ACTIVITY_METRIC }|--|| METRIC : "metric"
    ACTIVITY_STREAK }|--|| ACTIVITY_TYPE : "activity_type"
```


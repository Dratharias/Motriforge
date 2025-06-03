# Activity Extensions

```mermaid
erDiagram
    ACTIVITY_SESSION {
        UUID id PK
        UUID user_id FK "NOT NULL"
        TIMESTAMP session_start "NOT NULL"
        TIMESTAMP session_end "NULLABLE"
        SMALLINT activity_count "NOT NULL DEFAULT 0"
        JSONB session_metadata "NULLABLE"
        UUID created_by FK "NOT NULL"
        TIMESTAMP created_at "NOT NULL DEFAULT now()"
        BOOLEAN is_active "NOT NULL DEFAULT true"
    }
    ACTIVITY_SESSION_ACTIVITY {
        UUID session_id PK FK "NOT NULL"
        UUID activity_id PK FK "NOT NULL"
        SMALLINT sequence_order "NOT NULL"
        UUID created_by FK "NOT NULL"
        TIMESTAMP created_at "NOT NULL DEFAULT now()"
        BOOLEAN is_active "NOT NULL DEFAULT true"
    }
    ACTIVITY_DIGEST {
        UUID id PK
        UUID user_id FK "NOT NULL"
        DATE digest_date "NOT NULL"
        ENUM digest_period "NOT NULL"
        SMALLINT total_activities "NOT NULL DEFAULT 0"
        JSONB activity_summary "NOT NULL"
        JSONB achievements "NULLABLE"
        TIMESTAMP calculated_at "NOT NULL DEFAULT now()"
        UUID created_by FK "NOT NULL"
        TIMESTAMP created_at "NOT NULL DEFAULT now()"
        BOOLEAN is_active "NOT NULL DEFAULT true"
    }
    USER ||--o{ ACTIVITY_SESSION : "sessions"
    USER ||--o{ ACTIVITY_DIGEST : "digests"
    ACTIVITY_SESSION ||--o{ ACTIVITY_SESSION_ACTIVITY : "activities"
    ACTIVITY_SESSION_ACTIVITY }|--|| ACTIVITY : "activity"
```


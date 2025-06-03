# User Progress Tracking
```mermaid
erDiagram
    PROGRAM {
        UUID id PK
        VARCHAR(100) name "NOT NULL UNIQUE"
        TEXT description "NOT NULL LENGTH 2000"
        UUID difficulty_level_id FK "NOT NULL"
        TEXT notes "NULLABLE LENGTH 2000"
        UUID visibility_id FK "NOT NULL"
        UUID created_by FK "NOT NULL"
        TIMESTAMP created_at "NOT NULL DEFAULT now()"
        TIMESTAMP updated_at "NOT NULL DEFAULT now()"
        BOOLEAN is_active "NOT NULL DEFAULT true"
    }
    PROGRAM_CATEGORY {
        UUID program_id PK FK "NOT NULL"
        UUID category_id PK FK "NOT NULL"
        BOOLEAN is_primary "NOT NULL DEFAULT false"
        UUID created_by FK "NOT NULL"
        TIMESTAMP created_at "NOT NULL DEFAULT now()"
        BOOLEAN is_active "NOT NULL DEFAULT true"
    }
    PROGRAM_TAG {
        UUID program_id PK FK "NOT NULL"
        UUID tag_id PK FK "NOT NULL"
        UUID created_by FK "NOT NULL"
        TIMESTAMP created_at "NOT NULL DEFAULT now()"
        BOOLEAN is_active "NOT NULL DEFAULT true"
    }
    PROGRAM_SCHEDULE {
        UUID id PK
        UUID program_id FK "NOT NULL"
        SMALLINT length_days "NOT NULL"
        SMALLINT rest_days_per_week "NOT NULL DEFAULT 1"
        TEXT notes "NULLABLE LENGTH 2000"
        UUID created_by FK "NOT NULL"
        TIMESTAMP created_at "NOT NULL DEFAULT now()"
        BOOLEAN is_active "NOT NULL DEFAULT true"
    }
    SCHEDULE_WORKOUT {
        UUID id PK
        UUID schedule_id FK "NOT NULL"
        UUID workout_id FK "NOT NULL"
        SMALLINT day_number "NOT NULL"
        SMALLINT order_index "NOT NULL DEFAULT 0"
        BOOLEAN is_optional "NOT NULL DEFAULT false"
        TEXT notes "NULLABLE LENGTH 1000"
        UUID created_by FK "NOT NULL"
        TIMESTAMP created_at "NOT NULL DEFAULT now()"
        BOOLEAN is_active "NOT NULL DEFAULT true"
    }
    PROGRAM_PHASE {
        UUID id PK
        UUID program_id FK "NOT NULL"
        VARCHAR(100) name "NOT NULL"
        TEXT description "NULLABLE LENGTH 1000"
        SMALLINT start_day "NOT NULL"
        SMALLINT end_day "NOT NULL"
        SMALLINT order_index "NOT NULL"
        UUID created_by FK "NOT NULL"
        TIMESTAMP created_at "NOT NULL DEFAULT now()"
        BOOLEAN is_active "NOT NULL DEFAULT true"
    }
    PROGRAM ||--o{ PROGRAM_CATEGORY : "categories"
    PROGRAM ||--o{ PROGRAM_TAG : "tags"
    PROGRAM ||--o{ PROGRAM_SCHEDULE : "schedule"
    PROGRAM ||--o{ PROGRAM_PHASE : "phases"
    PROGRAM_SCHEDULE ||--o{ SCHEDULE_WORKOUT : "workouts"
    PROGRAM_CATEGORY }|--|| CATEGORY : "category"
    PROGRAM_TAG }|--|| TAG : "tag"
    SCHEDULE_WORKOUT }|--|| WORKOUT : "workout"
    PROGRAM }|--|| DIFFICULTY_LEVEL : "difficulty"
    PROGRAM }|--|| VISIBILITY : "visibility"
```


# Coaching & Training Services

```mermaid
erDiagram
    TRAINER_PROFILE {
        UUID id PK
        UUID user_id FK "NOT NULL UNIQUE"
        VARCHAR(255) specializations "NULLABLE"
        TEXT bio "NULLABLE LENGTH 2000"
        DECIMAL hourly_rate "NULLABLE"
        VARCHAR(3) currency "NULLABLE"
        JSONB certifications "NULLABLE"
        BOOLEAN is_independent "NOT NULL DEFAULT true"
        BOOLEAN accepts_new_clients "NOT NULL DEFAULT true"
        UUID visibility_id FK "NOT NULL"
        UUID created_by FK "NOT NULL"
        TIMESTAMP created_at "NOT NULL DEFAULT now()"
        TIMESTAMP updated_at "NOT NULL DEFAULT now()"
        BOOLEAN is_active "NOT NULL DEFAULT true"
    }
    TRAINER_CATEGORY {
        UUID trainer_id PK FK "NOT NULL"
        UUID category_id PK FK "NOT NULL"
        BOOLEAN is_primary "NOT NULL DEFAULT false"
        UUID created_by FK "NOT NULL"
        TIMESTAMP created_at "NOT NULL DEFAULT now()"
        BOOLEAN is_active "NOT NULL DEFAULT true"
    }
    TRAINER_TAG {
        UUID trainer_id PK FK "NOT NULL"
        UUID tag_id PK FK "NOT NULL"
        UUID created_by FK "NOT NULL"
        TIMESTAMP created_at "NOT NULL DEFAULT now()"
        BOOLEAN is_active "NOT NULL DEFAULT true"
    }
    CLIENT_TRAINER_RELATIONSHIP {
        UUID id PK
        UUID client_id FK "NOT NULL"
        UUID trainer_id FK "NOT NULL"
        ENUM status "NOT NULL DEFAULT 'ACTIVE'"
        ENUM relationship_type "NOT NULL"
        DATE started_at "NOT NULL DEFAULT CURRENT_DATE"
        DATE ended_at "NULLABLE"
        TEXT notes "NULLABLE LENGTH 2000"
        UUID created_by FK "NOT NULL"
        TIMESTAMP created_at "NOT NULL DEFAULT now()"
        BOOLEAN is_active "NOT NULL DEFAULT true"
    }
    TRAINING_SESSION {
        UUID id PK
        UUID client_trainer_relationship_id FK "NOT NULL"
        VARCHAR(255) title "NOT NULL"
        TEXT description "NULLABLE LENGTH 2000"
        TIMESTAMP scheduled_at "NOT NULL"
        TIMESTAMP started_at "NULLABLE"
        TIMESTAMP completed_at "NULLABLE"
        ENUM session_type "NOT NULL"
        ENUM status "NOT NULL DEFAULT 'SCHEDULED'"
        TEXT trainer_notes "NULLABLE LENGTH 2000"
        TEXT client_feedback "NULLABLE LENGTH 2000"
        SMALLINT rating "NULLABLE"
        UUID created_by FK "NOT NULL"
        TIMESTAMP created_at "NOT NULL DEFAULT now()"
        BOOLEAN is_active "NOT NULL DEFAULT true"
    }
    TRAINING_PLAN {
        UUID id PK
        UUID client_trainer_relationship_id FK "NOT NULL"
        VARCHAR(255) name "NOT NULL"
        TEXT description "NULLABLE LENGTH 2000"
        UUID program_id FK "NULLABLE"
        DATE start_date "NOT NULL"
        DATE end_date "NULLABLE"
        ENUM status "NOT NULL DEFAULT 'ACTIVE'"
        TEXT goals "NULLABLE LENGTH 2000"
        UUID created_by FK "NOT NULL"
        TIMESTAMP created_at "NOT NULL DEFAULT now()"
        BOOLEAN is_active "NOT NULL DEFAULT true"
    }
    USER ||--o{ TRAINER_PROFILE : "trainer_profile"
    TRAINER_PROFILE ||--o{ TRAINER_CATEGORY : "categories"
    TRAINER_PROFILE ||--o{ TRAINER_TAG : "tags"
    TRAINER_PROFILE ||--o{ CLIENT_TRAINER_RELATIONSHIP : "clients"
    USER ||--o{ CLIENT_TRAINER_RELATIONSHIP : "trainers"
    CLIENT_TRAINER_RELATIONSHIP ||--o{ TRAINING_SESSION : "sessions"
    CLIENT_TRAINER_RELATIONSHIP ||--o{ TRAINING_PLAN : "plans"
    TRAINING_PLAN }|--|| PROGRAM : "program"
    TRAINER_CATEGORY }|--|| CATEGORY : "category"
    TRAINER_TAG }|--|| TAG : "tag"
    TRAINER_PROFILE }|--|| VISIBILITY : "visibility"
```
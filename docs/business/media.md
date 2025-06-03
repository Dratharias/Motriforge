# Media Management
```mermaid
erDiagram
    MEDIA_TYPE {
        UUID id PK
        VARCHAR(50) name "NOT NULL UNIQUE"
        TEXT description "NULLABLE LENGTH 500"
        JSONB allowed_mime_types "NOT NULL"
        BIGINT max_file_size_bytes "NOT NULL"
        UUID created_by FK "NOT NULL"
        TIMESTAMP created_at "NOT NULL DEFAULT now()"
        BOOLEAN is_active "NOT NULL DEFAULT true"
    }
    MEDIA {
        UUID id PK
        VARCHAR(255) filename "NOT NULL"
        TEXT url "NOT NULL UNIQUE"
        UUID media_type_id FK "NOT NULL"
        VARCHAR(100) mime_type "NOT NULL"
        BIGINT file_size_bytes "NOT NULL"
        VARCHAR(64) file_hash "NULLABLE"
        UUID visibility_id FK "NOT NULL"
        UUID created_by FK "NOT NULL"
        TIMESTAMP created_at "NOT NULL DEFAULT now()"
        TIMESTAMP updated_at "NOT NULL DEFAULT now()"
        BOOLEAN is_active "NOT NULL DEFAULT true"
    }
    MEDIA_TAG {
        UUID media_id PK FK "NOT NULL"
        UUID tag_id PK FK "NOT NULL"
        UUID created_by FK "NOT NULL"
        TIMESTAMP created_at "NOT NULL DEFAULT now()"
        BOOLEAN is_active "NOT NULL DEFAULT true"
    }
    MEDIA_METADATA {
        UUID id PK
        UUID media_id FK "NOT NULL UNIQUE"
        JSONB metadata "NOT NULL"
        SMALLINT width_pixels "NULLABLE"
        SMALLINT height_pixels "NULLABLE"
        SMALLINT duration_seconds "NULLABLE"
        UUID created_by FK "NOT NULL"
        TIMESTAMP created_at "NOT NULL DEFAULT now()"
        BOOLEAN is_active "NOT NULL DEFAULT true"
    }
    EXERCISE_MEDIA {
        UUID exercise_id PK FK "NOT NULL"
        UUID media_id PK FK "NOT NULL"
        ENUM purpose "NOT NULL"
        SMALLINT order_index "NOT NULL DEFAULT 0"
        UUID created_by FK "NOT NULL"
        TIMESTAMP created_at "NOT NULL DEFAULT now()"
        BOOLEAN is_active "NOT NULL DEFAULT true"
    }
    WORKOUT_MEDIA {
        UUID workout_id PK FK "NOT NULL"
        UUID media_id PK FK "NOT NULL"
        ENUM purpose "NOT NULL"
        SMALLINT order_index "NOT NULL DEFAULT 0"
        UUID created_by FK "NOT NULL"
        TIMESTAMP created_at "NOT NULL DEFAULT now()"
        BOOLEAN is_active "NOT NULL DEFAULT true"
    }
    PROGRAM_MEDIA {
        UUID program_id PK FK "NOT NULL"
        UUID media_id PK FK "NOT NULL"
        ENUM purpose "NOT NULL"
        SMALLINT order_index "NOT NULL DEFAULT 0"
        UUID created_by FK "NOT NULL"
        TIMESTAMP created_at "NOT NULL DEFAULT now()"
        BOOLEAN is_active "NOT NULL DEFAULT true"
    }
    EQUIPMENT_MEDIA {
        UUID equipment_id PK FK "NOT NULL"
        UUID media_id PK FK "NOT NULL"
        ENUM purpose "NOT NULL"
        SMALLINT order_index "NOT NULL DEFAULT 0"
        UUID created_by FK "NOT NULL"
        TIMESTAMP created_at "NOT NULL DEFAULT now()"
        BOOLEAN is_active "NOT NULL DEFAULT true"
    }
    MEDIA }|--|| MEDIA_TYPE : "type"
    MEDIA ||--o{ MEDIA_TAG : "tags"
    MEDIA ||--o{ MEDIA_METADATA : "metadata"
    MEDIA ||--o{ EXERCISE_MEDIA : "exercises"
    MEDIA ||--o{ WORKOUT_MEDIA : "workouts"
    MEDIA ||--o{ PROGRAM_MEDIA : "programs"
    MEDIA ||--o{ EQUIPMENT_MEDIA : "equipment"
    MEDIA_TAG }|--|| TAG : "tag"
    EXERCISE_MEDIA }|--|| EXERCISE : "exercise"
    WORKOUT_MEDIA }|--|| WORKOUT : "workout"
    PROGRAM_MEDIA }|--|| PROGRAM : "program"
    EQUIPMENT_MEDIA }|--|| EQUIPMENT : "equipment"
    MEDIA }|--|| VISIBILITY : "visibility"
```


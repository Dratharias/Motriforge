# Workout Management
```mermaid
erDiagram
    WORKOUT {
        UUID id PK
        VARCHAR(100) name "NOT NULL UNIQUE"
        SMALLINT duration_seconds "NOT NULL"
        UUID difficulty_level_id FK "NOT NULL"
        TEXT notes "NULLABLE LENGTH 2000"
        UUID visibility_id FK "NOT NULL"
        UUID created_by FK "NOT NULL"
        TIMESTAMP created_at "NOT NULL DEFAULT now()"
        TIMESTAMP updated_at "NOT NULL DEFAULT now()"
        BOOLEAN is_active "NOT NULL DEFAULT true"
    }
    WORKOUT_CATEGORY {
        UUID workout_id PK FK "NOT NULL"
        UUID category_id PK FK "NOT NULL"
        BOOLEAN is_primary "NOT NULL DEFAULT false"
        UUID created_by FK "NOT NULL"
        TIMESTAMP created_at "NOT NULL DEFAULT now()"
        BOOLEAN is_active "NOT NULL DEFAULT true"
    }
    WORKOUT_TAG {
        UUID workout_id PK FK "NOT NULL"
        UUID tag_id PK FK "NOT NULL"
        UUID created_by FK "NOT NULL"
        TIMESTAMP created_at "NOT NULL DEFAULT now()"
        BOOLEAN is_active "NOT NULL DEFAULT true"
    }
    WORKOUT_MUSCLE_TARGET {
        UUID id PK
        UUID workout_id FK "NOT NULL"
        UUID muscle_id FK "NOT NULL"
        ENUM target_type "NOT NULL"
        SMALLINT intensity "NOT NULL"
        UUID created_by FK "NOT NULL"
        TIMESTAMP created_at "NOT NULL DEFAULT now()"
        BOOLEAN is_active "NOT NULL DEFAULT true"
    }
    WORKOUT_SET {
        UUID id PK
        UUID workout_id FK "NOT NULL"
        VARCHAR(100) name "NOT NULL"
        SMALLINT rest_seconds "NOT NULL DEFAULT 0"
        UUID target_muscle_id FK "NOT NULL"
        SMALLINT order_index "NOT NULL"
        UUID created_by FK "NOT NULL"
        TIMESTAMP created_at "NOT NULL DEFAULT now()"
        BOOLEAN is_active "NOT NULL DEFAULT true"
    }
    EXERCISE_INSTRUCTION {
        UUID id PK
        UUID workout_set_id FK "NOT NULL"
        UUID exercise_id FK "NOT NULL"
        SMALLINT sets_count "NOT NULL DEFAULT 1"
        SMALLINT reps_count "NULLABLE"
        DECIMAL weight_kg "NULLABLE"
        SMALLINT duration_seconds "NULLABLE"
        SMALLINT rest_seconds "NOT NULL DEFAULT 0"
        SMALLINT order_index "NOT NULL"
        TEXT custom_instructions "NULLABLE LENGTH 1000"
        UUID created_by FK "NOT NULL"
        TIMESTAMP created_at "NOT NULL DEFAULT now()"
        BOOLEAN is_active "NOT NULL DEFAULT true"
    }
    TEMPO_TYPE {
        UUID id PK
        VARCHAR(50) name "NOT NULL UNIQUE"
        SMALLINT default_duration "NULLABLE"
        TEXT description "NULLABLE LENGTH 500"
        UUID created_by FK "NOT NULL"
        TIMESTAMP created_at "NOT NULL DEFAULT now()"
        BOOLEAN is_active "NOT NULL DEFAULT true"
    }
    TEMPO {
        UUID id PK
        UUID instruction_id FK "NOT NULL"
        UUID tempo_type_id FK "NOT NULL"
        SMALLINT duration_seconds "NOT NULL"
        SMALLINT order_index "NOT NULL"
        UUID created_by FK "NOT NULL"
        TIMESTAMP created_at "NOT NULL DEFAULT now()"
        BOOLEAN is_active "NOT NULL DEFAULT true"
    }
    WORKOUT ||--o{ WORKOUT_CATEGORY : "categories"
    WORKOUT ||--o{ WORKOUT_TAG : "tags"
    WORKOUT ||--o{ WORKOUT_MUSCLE_TARGET : "muscle_targets"
    WORKOUT ||--o{ WORKOUT_SET : "sets"
    WORKOUT_SET ||--o{ EXERCISE_INSTRUCTION : "instructions"
    EXERCISE_INSTRUCTION ||--o{ TEMPO : "tempo"
    WORKOUT_CATEGORY }|--|| CATEGORY : "category"
    WORKOUT_TAG }|--|| TAG : "tag"
    WORKOUT_MUSCLE_TARGET }|--|| MUSCLE : "muscle"
    WORKOUT_SET }|--|| MUSCLE : "target_muscle"
    EXERCISE_INSTRUCTION }|--|| EXERCISE : "exercise"
    TEMPO }|--|| TEMPO_TYPE : "tempo_type"
    WORKOUT }|--|| DIFFICULTY_LEVEL : "difficulty"
    WORKOUT }|--|| VISIBILITY : "visibility"
```


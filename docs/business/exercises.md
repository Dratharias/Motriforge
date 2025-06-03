# Exercise Core Definition
```mermaid
erDiagram
    EXERCISE {
        UUID id PK
        VARCHAR(100) name "NOT NULL UNIQUE"
        VARCHAR(500) description "NOT NULL"
        TEXT instructions "NOT NULL LENGTH 5000"
        TEXT notes "NULLABLE LENGTH 2000"
        UUID difficulty_level_id FK "NOT NULL"
        UUID visibility_id FK "NOT NULL"
        UUID created_by FK "NOT NULL"
        TIMESTAMP created_at "NOT NULL DEFAULT now()"
        TIMESTAMP updated_at "NOT NULL DEFAULT now()"
        BOOLEAN is_active "NOT NULL DEFAULT true"
    }
    EXERCISE_CATEGORY {
        UUID exercise_id PK FK "NOT NULL"
        UUID category_id PK FK "NOT NULL"
        BOOLEAN is_primary "NOT NULL DEFAULT false"
        UUID created_by FK "NOT NULL"
        TIMESTAMP created_at "NOT NULL DEFAULT now()"
        BOOLEAN is_active "NOT NULL DEFAULT true"
    }
    EXERCISE_TAG {
        UUID exercise_id PK FK "NOT NULL"
        UUID tag_id PK FK "NOT NULL"
        UUID created_by FK "NOT NULL"
        TIMESTAMP created_at "NOT NULL DEFAULT now()"
        BOOLEAN is_active "NOT NULL DEFAULT true"
    }
    EXERCISE_MUSCLE_TARGET {
        UUID id PK
        UUID exercise_id FK "NOT NULL"
        UUID muscle_id FK "NOT NULL"
        ENUM target_type "NOT NULL"
        SMALLINT intensity "NOT NULL"
        UUID created_by FK "NOT NULL"
        TIMESTAMP created_at "NOT NULL DEFAULT now()"
        BOOLEAN is_active "NOT NULL DEFAULT true"
    }
    EXERCISE ||--o{ EXERCISE_CATEGORY : "categories"
    EXERCISE ||--o{ EXERCISE_TAG : "tags"
    EXERCISE ||--o{ EXERCISE_MUSCLE_TARGET : "targets"
    EXERCISE_CATEGORY }|--|| CATEGORY : "category"
    EXERCISE_TAG }|--|| TAG : "tag"
    EXERCISE_MUSCLE_TARGET }|--|| MUSCLE : "muscle"
    EXERCISE }|--|| DIFFICULTY_LEVEL : "difficulty"
    EXERCISE }|--|| VISIBILITY : "visibility"
```


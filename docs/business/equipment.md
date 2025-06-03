# Equipment Management
```mermaid
erDiagram
    EQUIPMENT {
        UUID id PK
        VARCHAR(100) name "NOT NULL UNIQUE"
        TEXT description "NULLABLE LENGTH 2000"
        VARCHAR(100) manufacturer "NULLABLE"
        VARCHAR(100) model "NULLABLE"
        UUID visibility_id FK "NOT NULL"
        UUID created_by FK "NOT NULL"
        TIMESTAMP created_at "NOT NULL DEFAULT now()"
        TIMESTAMP updated_at "NOT NULL DEFAULT now()"
        BOOLEAN is_active "NOT NULL DEFAULT true"
    }
    EQUIPMENT_CATEGORY {
        UUID equipment_id PK FK "NOT NULL"
        UUID category_id PK FK "NOT NULL"
        BOOLEAN is_primary "NOT NULL DEFAULT false"
        UUID created_by FK "NOT NULL"
        TIMESTAMP created_at "NOT NULL DEFAULT now()"
        BOOLEAN is_active "NOT NULL DEFAULT true"
    }
    EQUIPMENT_TAG {
        UUID equipment_id PK FK "NOT NULL"
        UUID tag_id PK FK "NOT NULL"
        UUID created_by FK "NOT NULL"
        TIMESTAMP created_at "NOT NULL DEFAULT now()"
        BOOLEAN is_active "NOT NULL DEFAULT true"
    }
    EXERCISE_EQUIPMENT {
        UUID exercise_id PK FK "NOT NULL"
        UUID equipment_id PK FK "NOT NULL"
        BOOLEAN is_required "NOT NULL DEFAULT true"
        TEXT usage_notes "NULLABLE LENGTH 500"
        UUID created_by FK "NOT NULL"
        TIMESTAMP created_at "NOT NULL DEFAULT now()"
        BOOLEAN is_active "NOT NULL DEFAULT true"
    }
    EQUIPMENT ||--o{ EQUIPMENT_CATEGORY : "categories"
    EQUIPMENT ||--o{ EQUIPMENT_TAG : "tags"
    EQUIPMENT ||--o{ EXERCISE_EQUIPMENT : "exercises"
    EQUIPMENT_CATEGORY }|--|| CATEGORY : "category"
    EQUIPMENT_TAG }|--|| TAG : "tag"
    EXERCISE_EQUIPMENT }|--|| EXERCISE : "exercise"
    EQUIPMENT }|--|| VISIBILITY : "visibility"
```


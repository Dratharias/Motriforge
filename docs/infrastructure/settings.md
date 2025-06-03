# Settings Management
```mermaid
erDiagram
    SETTING {
        UUID id PK
        VARCHAR(100) setting_key "NOT NULL UNIQUE"
        VARCHAR(255) display_name "NOT NULL"
        TEXT description "NULLABLE LENGTH 1000"
        ENUM scope "NOT NULL"
        ENUM data_type "NOT NULL"
        JSONB default_value "NOT NULL"
        JSONB validation_rules "NULLABLE"
        BOOLEAN is_required "NOT NULL DEFAULT false"
        BOOLEAN is_sensitive "NOT NULL DEFAULT false"
        BOOLEAN is_user_configurable "NOT NULL DEFAULT true"
        UUID created_by FK "NOT NULL"
        TIMESTAMP created_at "NOT NULL DEFAULT now()"
        BOOLEAN is_active "NOT NULL DEFAULT true"
    }
    USER_SETTING {
        UUID user_id PK FK "NOT NULL"
        UUID setting_id PK FK "NOT NULL"
        JSONB value "NOT NULL"
        BOOLEAN is_default "NOT NULL DEFAULT false"
        UUID created_by FK "NOT NULL"
        TIMESTAMP created_at "NOT NULL DEFAULT now()"
        BOOLEAN is_active "NOT NULL DEFAULT true"
    }
    SYSTEM_SETTING {
        UUID id PK
        UUID setting_id FK "NOT NULL UNIQUE"
        JSONB value "NOT NULL"
        UUID set_by FK "NOT NULL"
        TEXT change_reason "NULLABLE LENGTH 500"
        TIMESTAMP set_at "NOT NULL DEFAULT now()"
        UUID created_by FK "NOT NULL"
        TIMESTAMP created_at "NOT NULL DEFAULT now()"
        BOOLEAN is_active "NOT NULL DEFAULT true"
    }
    INSTITUTION_SETTING {
        UUID id PK
        UUID institution_id FK "NOT NULL"
        UUID setting_id FK "NOT NULL"
        JSONB value "NOT NULL"
        BOOLEAN overrides_system "NOT NULL DEFAULT false"
        UUID set_by FK "NOT NULL"
        TIMESTAMP set_at "NOT NULL DEFAULT now()"
        UUID created_by FK "NOT NULL"
        TIMESTAMP created_at "NOT NULL DEFAULT now()"
        BOOLEAN is_active "NOT NULL DEFAULT true"
    }
    SETTING_CATEGORY {
        UUID setting_id PK FK "NOT NULL"
        UUID category_id PK FK "NOT NULL"
        UUID created_by FK "NOT NULL"
        TIMESTAMP created_at "NOT NULL DEFAULT now()"
        BOOLEAN is_active "NOT NULL DEFAULT true"
    }
    SETTING_TAG {
        UUID setting_id PK FK "NOT NULL"
        UUID tag_id PK FK "NOT NULL"
        UUID created_by FK "NOT NULL"
        TIMESTAMP created_at "NOT NULL DEFAULT now()"
        BOOLEAN is_active "NOT NULL DEFAULT true"
    }
    SETTING ||--o{ USER_SETTING : "user_values"
    SETTING ||--o{ SYSTEM_SETTING : "system_value"
    SETTING ||--o{ INSTITUTION_SETTING : "institution_values"
    SETTING ||--o{ SETTING_CATEGORY : "categories"
    SETTING ||--o{ SETTING_TAG : "tags"
    USER ||--o{ USER_SETTING : "settings"
    INSTITUTION ||--o{ INSTITUTION_SETTING : "settings"
    SYSTEM_SETTING }|--|| USER : "set_by"
    INSTITUTION_SETTING }|--|| USER : "set_by"
    SETTING_CATEGORY }|--|| CATEGORY : "category"
    SETTING_TAG }|--|| TAG : "tag"
```


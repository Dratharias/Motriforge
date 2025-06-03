# Institution Management
```mermaid
erDiagram
    INSTITUTION {
        UUID id PK
        VARCHAR(255) name "NOT NULL"
        VARCHAR(100) short_name "NULLABLE"
        TEXT description "NULLABLE LENGTH 2000"
        ENUM type "NOT NULL"
        JSONB contact_info "NULLABLE"
        UUID visibility_id FK "NOT NULL"
        UUID created_by FK "NOT NULL"
        TIMESTAMP created_at "NOT NULL DEFAULT now()"
        TIMESTAMP updated_at "NOT NULL DEFAULT now()"
        BOOLEAN is_active "NOT NULL DEFAULT true"
    }
    INSTITUTION_CATEGORY {
        UUID institution_id PK FK "NOT NULL"
        UUID category_id PK FK "NOT NULL"
        BOOLEAN is_primary "NOT NULL DEFAULT false"
        UUID created_by FK "NOT NULL"
        TIMESTAMP created_at "NOT NULL DEFAULT now()"
        BOOLEAN is_active "NOT NULL DEFAULT true"
    }
    INSTITUTION_TAG {
        UUID institution_id PK FK "NOT NULL"
        UUID tag_id PK FK "NOT NULL"
        UUID created_by FK "NOT NULL"
        TIMESTAMP created_at "NOT NULL DEFAULT now()"
        BOOLEAN is_active "NOT NULL DEFAULT true"
    }
    INSTITUTION ||--o{ INSTITUTION_CATEGORY : "categories"
    INSTITUTION ||--o{ INSTITUTION_TAG : "tags"
    INSTITUTION_CATEGORY }|--|| CATEGORY : "category"
    INSTITUTION_TAG }|--|| TAG : "tag"
    INSTITUTION }|--|| VISIBILITY : "visibility"
```


# Favorite Management
```mermaid
erDiagram
    FAVORITE {
        UUID id PK
        UUID user_id FK "NOT NULL"
        UUID resource_id "NOT NULL"
        ENUM resource_type "NOT NULL"
        TEXT notes "NULLABLE LENGTH 2000"
        TIMESTAMP favorited_at "NOT NULL DEFAULT now()"
        TIMESTAMP last_accessed "NULLABLE"
        SMALLINT access_count "NOT NULL DEFAULT 0"
        BOOLEAN is_pinned "NOT NULL DEFAULT false"
        SMALLINT priority_order "NOT NULL DEFAULT 0"
        UUID visibility_id FK "NOT NULL"
        UUID created_by FK "NOT NULL"
        TIMESTAMP created_at "NOT NULL DEFAULT now()"
        BOOLEAN is_active "NOT NULL DEFAULT true"
    }
    FAVORITE_CATEGORY {
        UUID favorite_id PK FK "NOT NULL"
        UUID category_id PK FK "NOT NULL"
        BOOLEAN is_primary "NOT NULL DEFAULT false"
        UUID created_by FK "NOT NULL"
        TIMESTAMP created_at "NOT NULL DEFAULT now()"
        BOOLEAN is_active "NOT NULL DEFAULT true"
    }
    FAVORITE_TAG {
        UUID favorite_id PK FK "NOT NULL"
        UUID tag_id PK FK "NOT NULL"
        BOOLEAN is_auto_generated "NOT NULL DEFAULT false"
        UUID created_by FK "NOT NULL"
        TIMESTAMP created_at "NOT NULL DEFAULT now()"
        BOOLEAN is_active "NOT NULL DEFAULT true"
    }
    FAVORITE_COLLECTION {
        UUID id PK
        UUID user_id FK "NOT NULL"
        VARCHAR(100) name "NOT NULL"
        TEXT description "NULLABLE LENGTH 1000"
        BOOLEAN is_public "NOT NULL DEFAULT false"
        BOOLEAN is_system_generated "NOT NULL DEFAULT false"
        BOOLEAN is_smart_collection "NOT NULL DEFAULT false"
        JSONB smart_collection_rules "NULLABLE"
        SMALLINT sort_order "NOT NULL DEFAULT 0"
        VARCHAR(7) color_code "NULLABLE"
        UUID visibility_id FK "NOT NULL"
        UUID created_by FK "NOT NULL"
        TIMESTAMP created_at "NOT NULL DEFAULT now()"
        BOOLEAN is_active "NOT NULL DEFAULT true"
    }
    FAVORITE_COLLECTION_ITEM {
        UUID collection_id PK FK "NOT NULL"
        UUID favorite_id PK FK "NOT NULL"
        SMALLINT item_order "NOT NULL DEFAULT 0"
        TEXT notes "NULLABLE LENGTH 500"
        BOOLEAN is_featured "NOT NULL DEFAULT false"
        UUID created_by FK "NOT NULL"
        TIMESTAMP created_at "NOT NULL DEFAULT now()"
        BOOLEAN is_active "NOT NULL DEFAULT true"
    }
    FAVORITE_SHARE {
        UUID id PK
        UUID favorite_id FK "NULLABLE"
        UUID collection_id FK "NULLABLE"
        UUID shared_by FK "NOT NULL"
        UUID shared_with FK "NULLABLE"
        UUID institution_id FK "NULLABLE"
        TEXT message "NULLABLE LENGTH 2000"
        VARCHAR(255) share_token "NOT NULL UNIQUE"
        TIMESTAMP shared_at "NOT NULL DEFAULT now()"
        TIMESTAMP expires_at "NULLABLE"
        UUID created_by FK "NOT NULL"
        TIMESTAMP created_at "NOT NULL DEFAULT now()"
        BOOLEAN is_active "NOT NULL DEFAULT true"
    }
    FAVORITE_RECOMMENDATION {
        UUID id PK
        UUID user_id FK "NOT NULL"
        UUID resource_id "NOT NULL"
        ENUM resource_type "NOT NULL"
        DECIMAL recommendation_score "NOT NULL"
        ENUM reason "NOT NULL"
        TEXT explanation "NULLABLE LENGTH 1000"
        JSONB metadata "NULLABLE"
        BOOLEAN is_dismissed "NOT NULL DEFAULT false"
        TIMESTAMP recommended_at "NOT NULL DEFAULT now()"
        TIMESTAMP expires_at "NOT NULL"
        UUID created_by FK "NOT NULL"
        TIMESTAMP created_at "NOT NULL DEFAULT now()"
        BOOLEAN is_active "NOT NULL DEFAULT true"
    }
    USER ||--o{ FAVORITE : "favorites"
    USER ||--o{ FAVORITE_COLLECTION : "collections"
    USER ||--o{ FAVORITE_RECOMMENDATION : "recommendations"
    FAVORITE ||--o{ FAVORITE_CATEGORY : "categories"
    FAVORITE ||--o{ FAVORITE_TAG : "tags"
    FAVORITE ||--o{ FAVORITE_SHARE : "shares"
    FAVORITE_COLLECTION ||--o{ FAVORITE_COLLECTION_ITEM : "items"
    FAVORITE_COLLECTION ||--o{ FAVORITE_SHARE : "collection_shares"
    FAVORITE_CATEGORY }|--|| CATEGORY : "category"
    FAVORITE_TAG }|--|| TAG : "tag"
    FAVORITE_COLLECTION_ITEM }|--|| FAVORITE : "favorite"
    FAVORITE_SHARE }|--|| USER : "shared_by"
    FAVORITE_SHARE }|--|| USER : "shared_with"
    FAVORITE_SHARE }|--|| INSTITUTION : "institution"
    FAVORITE }|--|| VISIBILITY : "visibility"
    FAVORITE_COLLECTION }|--|| VISIBILITY : "visibility"
```


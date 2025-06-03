# Rating & Review System
```mermaid
erDiagram
    RATING_STATUS {
        UUID id PK
        VARCHAR(50) name "NOT NULL UNIQUE"
        TEXT description "NULLABLE LENGTH 500"
        BOOLEAN requires_moderation "NOT NULL DEFAULT false"
        BOOLEAN is_visible "NOT NULL DEFAULT true"
        UUID created_by FK "NOT NULL"
        TIMESTAMP created_at "NOT NULL DEFAULT now()"
        BOOLEAN is_active "NOT NULL DEFAULT true"
    }
    RATING {
        UUID id PK
        UUID user_id FK "NOT NULL"
        UUID resource_id "NOT NULL"
        ENUM resource_type "NOT NULL"
        SMALLINT rating_value "NOT NULL"
        TEXT review_text "NULLABLE LENGTH 2000"
        BOOLEAN is_verified "NOT NULL DEFAULT false"
        BOOLEAN is_featured "NOT NULL DEFAULT false"
        UUID status_id FK "NOT NULL"
        UUID visibility_id FK "NOT NULL"
        UUID created_by FK "NOT NULL"
        TIMESTAMP created_at "NOT NULL DEFAULT now()"
        TIMESTAMP updated_at "NOT NULL DEFAULT now()"
        BOOLEAN is_active "NOT NULL DEFAULT true"
    }
    RATING_CATEGORY {
        UUID rating_id PK FK "NOT NULL"
        UUID category_id PK FK "NOT NULL"
        UUID created_by FK "NOT NULL"
        TIMESTAMP created_at "NOT NULL DEFAULT now()"
        BOOLEAN is_active "NOT NULL DEFAULT true"
    }
    RATING_TAG {
        UUID rating_id PK FK "NOT NULL"
        UUID tag_id PK FK "NOT NULL"
        UUID created_by FK "NOT NULL"
        TIMESTAMP created_at "NOT NULL DEFAULT now()"
        BOOLEAN is_active "NOT NULL DEFAULT true"
    }
    RATING_HELPFUL_VOTE {
        UUID rating_id PK FK "NOT NULL"
        UUID user_id PK FK "NOT NULL"
        BOOLEAN is_helpful "NOT NULL"
        UUID created_by FK "NOT NULL"
        TIMESTAMP created_at "NOT NULL DEFAULT now()"
        BOOLEAN is_active "NOT NULL DEFAULT true"
    }
    RATING_CRITERIA {
        UUID id PK
        UUID rating_id FK "NOT NULL"
        VARCHAR(50) criteria_name "NOT NULL"
        SMALLINT score "NOT NULL"
        TEXT notes "NULLABLE LENGTH 500"
        UUID created_by FK "NOT NULL"
        TIMESTAMP created_at "NOT NULL DEFAULT now()"
        BOOLEAN is_active "NOT NULL DEFAULT true"
    }
    RATING_ANALYTICS_SUMMARY {
        UUID resource_id PK
        ENUM resource_type PK
        DECIMAL average_rating "NOT NULL"
        SMALLINT total_ratings "NOT NULL DEFAULT 0"
        SMALLINT five_star_count "NOT NULL DEFAULT 0"
        SMALLINT four_star_count "NOT NULL DEFAULT 0"
        SMALLINT three_star_count "NOT NULL DEFAULT 0"
        SMALLINT two_star_count "NOT NULL DEFAULT 0"
        SMALLINT one_star_count "NOT NULL DEFAULT 0"
        SMALLINT verified_count "NOT NULL DEFAULT 0"
        DECIMAL verified_average "NOT NULL DEFAULT 0"
        TIMESTAMP last_calculated "NOT NULL DEFAULT now()"
    }
    USER ||--o{ RATING : "ratings"
    RATING ||--o{ RATING_CATEGORY : "categories"
    RATING ||--o{ RATING_TAG : "tags"
    RATING ||--o{ RATING_HELPFUL_VOTE : "votes"
    RATING ||--o{ RATING_CRITERIA : "criteria"
    RATING }|--|| RATING_STATUS : "status"
    RATING }|--|| VISIBILITY : "visibility"
    RATING_CATEGORY }|--|| CATEGORY : "category"
    RATING_TAG }|--|| TAG : "tag"
    RATING_HELPFUL_VOTE }|--|| USER : "voter"
```


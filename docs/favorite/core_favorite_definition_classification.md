# Core "Favorite" Definition & Classification
**Section:** Favorite
**Subsection:** Core "Favorite" Definition & Classification

## Diagram
```mermaid
erDiagram
  %%=== Layer 1: Core Favorite & Classification ===%%
  FAVORITE {
    UUID id PK                         "NOT NULL; UNIQUE"
    UUID user_id FK                    "NOT NULL; references USER.id"
    TEXT notes                         "NULLABLE; CHECK (LENGTH(notes) <= 2000); personal notes about why it's favorited"
    TIMESTAMP favorited_at             "NOT NULL; DEFAULT now()"
    TIMESTAMP last_accessed_at         "NULLABLE; when last viewed/used"
    INT access_count                   "NOT NULL; DEFAULT 0; CHECK (access_count >= 0)"
    BOOLEAN is_pinned                  "NOT NULL; DEFAULT false; pinned favorites show first"
    SMALLINT priority_order            "NOT NULL; DEFAULT 0; CHECK (priority_order >= 0); for user-defined ordering"
    UUID created_by_user_id FK         "NOT NULL; references USER.id"
    UUID updated_by_user_id FK         "NULLABLE; references USER.id"
    TIMESTAMP created_at               "NOT NULL; DEFAULT now()"
    TIMESTAMP updated_at               "NOT NULL; DEFAULT now()"
    BOOLEAN is_active                  "NOT NULL; DEFAULT true"
    UUID visibility_id FK              "NOT NULL; references VISIBILITY.id"
    INDEX idx_favorite_user_pinned     "(user_id, is_pinned DESC, priority_order ASC)"
    INDEX idx_favorite_user_accessed   "(user_id, last_accessed_at DESC NULLS LAST)"
    INDEX idx_favorite_user_created    "(user_id, favorited_at DESC)"
  }
  
  %%— Consolidated polymorphic resource relationship —
  FAVORITE_RESOURCE {
    UUID id PK                         "NOT NULL; UNIQUE"
    UUID favorite_id FK                "NOT NULL; references FAVORITE.id"
    UUID resource_id                   "NOT NULL; the ID of the favorited resource"
    ENUM resource_type                 "NOT NULL; CHECK (resource_type IN ('WORKOUT', 'EXERCISE', 'PROGRAM', 'EQUIPMENT', 'MEDIA', 'INSTITUTION', 'USER', 'COLLECTION'))"
    JSONB resource_snapshot            "NULLABLE; cached resource data for performance"
    BOOLEAN is_resource_valid          "NOT NULL; DEFAULT true; tracks if resource still exists"
    TIMESTAMP last_validated           "NOT NULL; DEFAULT now()"
    UUID created_by_user_id FK         "NOT NULL; references USER.id"
    UUID updated_by_user_id FK         "NULLABLE; references USER.id"
    TIMESTAMP created_at               "NOT NULL; DEFAULT now()"
    TIMESTAMP updated_at               "NOT NULL; DEFAULT now()"
    BOOLEAN is_active                  "NOT NULL; DEFAULT true"
    UNIQUE favorite_resource_unique    "(favorite_id, resource_id, resource_type); Business constraint: one favorite per resource per user"
    INDEX idx_favorite_resource_type   "(resource_type, resource_id, is_resource_valid)"
    INDEX idx_favorite_resource_valid  "(is_resource_valid, last_validated) WHERE is_resource_valid = false"
  }
  
  %%— Classification —
  FAVORITE_CATEGORY {
    UUID id PK                         "NOT NULL; UNIQUE"
    UUID favorite_id FK                "NOT NULL; references FAVORITE.id"
    UUID category_id FK                "NOT NULL; references CATEGORY.id"
    BOOLEAN is_primary_category        "NOT NULL; DEFAULT false"
    UUID created_by_user_id FK         "NOT NULL; references USER.id"
    UUID updated_by_user_id FK         "NULLABLE; references USER.id"
    TIMESTAMP created_at               "NOT NULL; DEFAULT now()"
    TIMESTAMP updated_at               "NOT NULL; DEFAULT now()"
    BOOLEAN is_active                  "NOT NULL; DEFAULT true"
    UNIQUE favorite_category_combo     "(favorite_id, category_id); Business constraint: one category assignment per favorite"
    INDEX idx_favorite_cat_primary     "(favorite_id, is_primary_category) WHERE is_primary_category = true"
  }
  
  FAVORITE_TAG {
    UUID id PK                         "NOT NULL; UNIQUE"
    UUID favorite_id FK                "NOT NULL; references FAVORITE.id"
    UUID tag_id FK                     "NOT NULL; references TAG.id"
    BOOLEAN is_auto_generated          "NOT NULL; DEFAULT false; system-generated vs user-added"
    UUID created_by_user_id FK         "NOT NULL; references USER.id"
    UUID updated_by_user_id FK         "NULLABLE; references USER.id"
    TIMESTAMP created_at               "NOT NULL; DEFAULT now()"
    TIMESTAMP updated_at               "NOT NULL; DEFAULT now()"
    BOOLEAN is_active                  "NOT NULL; DEFAULT true"
    UNIQUE favorite_tag_combo          "(favorite_id, tag_id); Business constraint: one tag assignment per favorite"
    INDEX idx_favorite_tag_auto        "(is_auto_generated, created_at DESC)"
  }
  
  %%— Enhanced Collections & Sharing —
  FAVORITE_COLLECTION {
    UUID id PK                         "NOT NULL; UNIQUE"
    UUID user_id FK                    "NOT NULL; references USER.id"
    VARCHAR(100) name                  "NOT NULL; CHECK (LENGTH(name) >= 1)"
    TEXT description                   "NULLABLE; CHECK (LENGTH(description) <= 1000)"
    BOOLEAN is_public                  "NOT NULL; DEFAULT false"
    BOOLEAN is_system_generated        "NOT NULL; DEFAULT false; for auto-collections like 'Recently Added'"
    BOOLEAN is_smart_collection        "NOT NULL; DEFAULT false; dynamically populated based on rules"
    JSONB smart_collection_rules       "NULLABLE; rules for smart collections"
    SMALLINT sort_order                "NOT NULL; DEFAULT 0; CHECK (sort_order >= 0)"
    VARCHAR(7) color_code              "NULLABLE; CHECK (color_code ~ '^#[0-9A-Fa-f]{6}$'); hex color for UI"
    UUID created_by_user_id FK         "NOT NULL; references USER.id"
    UUID updated_by_user_id FK         "NULLABLE; references USER.id"
    TIMESTAMP created_at               "NOT NULL; DEFAULT now()"
    TIMESTAMP updated_at               "NOT NULL; DEFAULT now()"
    UUID visibility_id FK              "NOT NULL; references VISIBILITY.id"
    BOOLEAN is_active                  "NOT NULL; DEFAULT true"
    UNIQUE user_collection_name        "(user_id, name); Business constraint: unique collection names per user"
    INDEX idx_collection_user_public   "(user_id, is_public, sort_order ASC)"
    INDEX idx_collection_smart         "(is_smart_collection, updated_at DESC) WHERE is_smart_collection = true"
  }
  
  FAVORITE_COLLECTION_ITEM {
    UUID id PK                         "NOT NULL; UNIQUE"
    UUID collection_id FK              "NOT NULL; references FAVORITE_COLLECTION.id"
    UUID favorite_id FK                "NOT NULL; references FAVORITE.id"
    SMALLINT item_order                "NOT NULL; DEFAULT 0; CHECK (item_order >= 0)"
    TEXT collection_notes              "NULLABLE; CHECK (LENGTH(collection_notes) <= 500); notes specific to this collection"
    BOOLEAN is_featured                "NOT NULL; DEFAULT false; highlighted items in collection"
    UUID created_by_user_id FK         "NOT NULL; references USER.id"
    UUID updated_by_user_id FK         "NULLABLE; references USER.id"
    TIMESTAMP added_at                 "NOT NULL; DEFAULT now()"
    TIMESTAMP created_at               "NOT NULL; DEFAULT now()"
    TIMESTAMP updated_at               "NOT NULL; DEFAULT now()"
    BOOLEAN is_active                  "NOT NULL; DEFAULT true"
    UNIQUE collection_favorite_combo   "(collection_id, favorite_id); Business constraint: favorite can only be in collection once"
    INDEX idx_collection_item_order    "(collection_id, item_order ASC, added_at DESC)"
    INDEX idx_collection_item_featured "(collection_id, is_featured DESC) WHERE is_featured = true"
  }
  
  %%— Collection Sharing and Collaboration —
  FAVORITE_COLLECTION_SHARE {
    UUID id PK                         "NOT NULL; UNIQUE"
    UUID collection_id FK              "NOT NULL; references FAVORITE_COLLECTION.id"
    UUID shared_by_user_id FK          "NOT NULL; references USER.id"
    UUID shared_with_user_id FK        "NULLABLE; references USER.id; NULL for public shares"
    UUID institution_id FK             "NULLABLE; references INSTITUTION.id; institution-wide share"
    ENUM share_type                    "NOT NULL; CHECK (share_type IN ('VIEW_ONLY', 'COLLABORATIVE', 'COPY_ALLOWED', 'FORK_ALLOWED'))"
    VARCHAR(255) share_token           "NOT NULL; UNIQUE; secure sharing token"
    TEXT share_message                 "NULLABLE; CHECK (LENGTH(share_message) <= 500)"
    TIMESTAMP shared_at                "NOT NULL; DEFAULT now()"
    TIMESTAMP expires_at               "NULLABLE"
    TIMESTAMP last_accessed_at         "NULLABLE"
    INT access_count                   "NOT NULL; DEFAULT 0; CHECK (access_count >= 0)"
    UUID created_by_user_id FK         "NOT NULL; references USER.id"
    UUID updated_by_user_id FK         "NULLABLE; references USER.id"
    TIMESTAMP created_at               "NOT NULL; DEFAULT now()"
    TIMESTAMP updated_at               "NOT NULL; DEFAULT now()"
    BOOLEAN is_active                  "NOT NULL; DEFAULT true"
    INDEX idx_collection_share_token   "(share_token) WHERE is_active = true"
    INDEX idx_collection_share_user    "(shared_with_user_id, shared_at DESC) WHERE shared_with_user_id IS NOT NULL"
    INDEX idx_collection_share_public  "(share_type, shared_at DESC) WHERE shared_with_user_id IS NULL"
    CHECK share_expiry_order           "(expires_at IS NULL OR shared_at < expires_at)"
  }
  
  %%— Smart Recommendations Engine —
  FAVORITE_RECOMMENDATION {
    UUID id PK                         "NOT NULL; UNIQUE"
    UUID user_id FK                    "NOT NULL; references USER.id"
    UUID resource_id                   "NOT NULL; same as FAVORITE_RESOURCE.resource_id"
    ENUM resource_type                 "NOT NULL; same as FAVORITE_RESOURCE.resource_type"
    FLOAT recommendation_score         "NOT NULL; CHECK (recommendation_score >= 0.0 AND recommendation_score <= 1.0)"
    ENUM recommendation_reason         "NOT NULL; CHECK (recommendation_reason IN ('SIMILAR_USERS', 'CONTENT_BASED', 'COLLABORATIVE', 'TRENDING', 'CATEGORY_MATCH', 'TAG_SIMILARITY', 'USAGE_PATTERN'))"
    TEXT recommendation_explanation    "NULLABLE; human-readable explanation"
    JSONB recommendation_metadata      "NULLABLE; algorithm-specific data"
    BOOLEAN is_dismissed               "NOT NULL; DEFAULT false"
    BOOLEAN was_favorited              "NOT NULL; DEFAULT false; did user act on recommendation"
    TIMESTAMP recommended_at           "NOT NULL; DEFAULT now()"
    TIMESTAMP dismissed_at             "NULLABLE"
    TIMESTAMP expires_at               "NOT NULL; DEFAULT (now() + interval '30 days')"
    UUID created_by_user_id FK         "NOT NULL; references USER.id"
    TIMESTAMP created_at               "NOT NULL; DEFAULT now()"
    UNIQUE user_resource_recommendation "(user_id, resource_id, resource_type); Business constraint: one recommendation per resource per user"
    INDEX idx_recommendation_user_score "(user_id, recommendation_score DESC, recommended_at DESC) WHERE is_dismissed = false AND expires_at > now()"
    INDEX idx_recommendation_reason    "(recommendation_reason, recommended_at DESC)"
    CHECK recommendation_dates         "(dismissed_at IS NULL OR recommended_at <= dismissed_at)"
  }
  
  %%— Analytics & Usage Tracking —
  FAVORITE_ANALYTICS_SUMMARY {
    UUID resource_id PK                "NOT NULL; the resource being tracked"
    ENUM resource_type PK              "NOT NULL; CHECK (resource_type IN ('WORKOUT', 'EXERCISE', 'PROGRAM', 'EQUIPMENT', 'MEDIA', 'INSTITUTION', 'USER', 'COLLECTION'))"
    INT total_favorites                "NOT NULL; DEFAULT 0; CHECK (total_favorites >= 0)"
    INT weekly_favorites_added         "NOT NULL; DEFAULT 0; CHECK (weekly_favorites_added >= 0)"
    INT weekly_favorites_removed       "NOT NULL; DEFAULT 0; CHECK (weekly_favorites_removed >= 0)"
    INT monthly_active_users           "NOT NULL; DEFAULT 0; CHECK (monthly_active_users >= 0); users who accessed this favorite"
    DECIMAL trending_score             "NOT NULL; DEFAULT 0.0; CHECK (trending_score >= 0.0); calculated trending metric"
    DECIMAL engagement_score           "NOT NULL; DEFAULT 0.0; CHECK (engagement_score >= 0.0 AND engagement_score <= 1.0); engagement metric"
    TIMESTAMP last_calculated          "NOT NULL; DEFAULT now()"
    UNIQUE resource_analytics_key      "(resource_id, resource_type); Business constraint: one summary per resource"
    INDEX idx_analytics_trending       "(trending_score DESC, last_calculated DESC)"
    INDEX idx_analytics_engagement     "(engagement_score DESC, last_calculated DESC)"
  }
  
  %%— Resource Validation and Health —
  FAVORITE_RESOURCE_HEALTH {
    UUID id PK                         "NOT NULL; UNIQUE"
    UUID favorite_resource_id FK       "NOT NULL; references FAVORITE_RESOURCE.id; UNIQUE"
    BOOLEAN resource_exists            "NOT NULL; DEFAULT true"
    BOOLEAN resource_accessible        "NOT NULL; DEFAULT true"
    BOOLEAN metadata_current           "NOT NULL; DEFAULT true"
    TIMESTAMP last_health_check        "NOT NULL; DEFAULT now()"
    TIMESTAMP next_health_check        "NOT NULL; DEFAULT (now() + interval '24 hours')"
    TEXT health_check_error            "NULLABLE; error message if health check failed"
    JSONB health_check_metadata        "NULLABLE; detailed health check results"
    INT consecutive_failures           "NOT NULL; DEFAULT 0; CHECK (consecutive_failures >= 0)"
    UUID created_by_user_id FK         "NOT NULL; references USER.id"
    UUID updated_by_user_id FK         "NULLABLE; references USER.id"
    TIMESTAMP created_at               "NOT NULL; DEFAULT now()"
    TIMESTAMP updated_at               "NOT NULL; DEFAULT now()"
    BOOLEAN is_active                  "NOT NULL; DEFAULT true"
    INDEX idx_health_check_schedule    "(next_health_check ASC) WHERE is_active = true"
    INDEX idx_health_failures          "(consecutive_failures DESC, last_health_check DESC) WHERE consecutive_failures > 0"
  }
  
  %%— Relationships —
  USER ||--o{ FAVORITE                : "creates_favorites"
  FAVORITE ||--|| FAVORITE_RESOURCE   : "references_resource"
  FAVORITE_RESOURCE ||--o{ FAVORITE_RESOURCE_HEALTH : "health_monitoring"
  FAVORITE ||--o{ FAVORITE_CATEGORY   : "categorized_by"
  FAVORITE ||--o{ FAVORITE_TAG        : "tagged_with"
  FAVORITE_CATEGORY }|--|| CATEGORY   : "category_lookup"
  FAVORITE_TAG }|--|| TAG             : "tag_lookup"
  
  %%— Collection relationships
  USER ||--o{ FAVORITE_COLLECTION     : "owns_collections"
  FAVORITE_COLLECTION ||--o{ FAVORITE_COLLECTION_ITEM : "contains_items"
  FAVORITE_COLLECTION_ITEM }|--|| FAVORITE : "favorite_lookup"
  FAVORITE_COLLECTION ||--o{ FAVORITE_COLLECTION_SHARE : "can_be_shared"
  FAVORITE_COLLECTION_SHARE }|--|| USER : "shared_by_user"
  FAVORITE_COLLECTION_SHARE }o--|| USER : "shared_with_user"
  FAVORITE_COLLECTION_SHARE }o--|| INSTITUTION : "shared_with_institution"
  
  %%— Recommendation relationships
  USER ||--o{ FAVORITE_RECOMMENDATION : "receives_recommendations"
  
  %%— Standardized audit relationships
  FAVORITE }|--|| USER                : "created_by_user"
  FAVORITE }o--|| USER                : "updated_by_user"
  FAVORITE_RESOURCE }|--|| USER       : "created_by_user"
  FAVORITE_RESOURCE }o--|| USER       : "updated_by_user"
  FAVORITE_CATEGORY }|--|| USER       : "created_by_user"
  FAVORITE_CATEGORY }o--|| USER       : "updated_by_user"
  FAVORITE_TAG }|--|| USER            : "created_by_user"
  FAVORITE_TAG }o--|| USER            : "updated_by_user"
  FAVORITE_COLLECTION }|--|| USER     : "created_by_user"
  FAVORITE_COLLECTION }o--|| USER     : "updated_by_user"
  FAVORITE_COLLECTION_ITEM }|--|| USER : "created_by_user"
  FAVORITE_COLLECTION_ITEM }o--|| USER : "updated_by_user"
  FAVORITE_COLLECTION_SHARE }|--|| USER : "created_by_user"
  FAVORITE_COLLECTION_SHARE }o--|| USER : "updated_by_user"
  FAVORITE_RECOMMENDATION }|--|| USER : "created_by_user"
  FAVORITE_RESOURCE_HEALTH }|--|| USER : "created_by_user"
  FAVORITE_RESOURCE_HEALTH }o--|| USER : "updated_by_user"
  
  %%— Visibility relationships
  FAVORITE }|--|| VISIBILITY          : "visibility_control"
  FAVORITE_COLLECTION }|--|| VISIBILITY : "collection_visibility"
  
  %%— Note: External resource relationships maintained via resource_id + resource_type pattern
  %%— Virtual relationships enforced by application logic:
  %%— WORKOUT ||--o{ FAVORITE_RESOURCE : "can_be_favorited (resource_type='WORKOUT')"
  %%— EXERCISE ||--o{ FAVORITE_RESOURCE : "can_be_favorited (resource_type='EXERCISE')"
  %%— PROGRAM ||--o{ FAVORITE_RESOURCE : "can_be_favorited (resource_type='PROGRAM')"
  %%— EQUIPMENT ||--o{ FAVORITE_RESOURCE : "can_be_favorited (resource_type='EQUIPMENT')"
  %%— MEDIA ||--o{ FAVORITE_RESOURCE : "can_be_favorited (resource_type='MEDIA')"
  %%— INSTITUTION ||--o{ FAVORITE_RESOURCE : "can_be_favorited (resource_type='INSTITUTION')"
  %%— USER ||--o{ FAVORITE_RESOURCE : "can_be_favorited (resource_type='USER')"
```

## Notes
This diagram represents the core "favorite" definition & classification structure and relationships within the favorite domain.

---
*Generated from diagram extraction script*
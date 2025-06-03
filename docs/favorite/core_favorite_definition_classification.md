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
    TEXT notes                         "NULLABLE; personal notes about why it's favorited"
    TIMESTAMP favorited_at             "NOT NULL; DEFAULT now()"
    TIMESTAMP last_accessed_at         "NULLABLE; when last viewed/used"
    INT access_count                   "NOT NULL; DEFAULT 0; CHECK (access_count >= 0)"
    UUID created_by_user_id FK         "NOT NULL; references USER.id"
    UUID updated_by_user_id FK         "NULLABLE; references USER.id"
    TIMESTAMP created_at               "NOT NULL; DEFAULT now()"
    TIMESTAMP updated_at               "NOT NULL; DEFAULT now()"
    BOOLEAN is_active                  "NOT NULL; DEFAULT true"
    UUID visibility_id FK              "NOT NULL; references VISIBILITY.id"
  }
  
  %%— Consolidated polymorphic resource relationship —
  FAVORITE_RESOURCE {
    UUID id PK                         "NOT NULL; UNIQUE"
    UUID favorite_id FK                "NOT NULL; references FAVORITE.id"
    UUID resource_id                   "NOT NULL; the ID of the favorited resource"
    ENUM resource_type                 "NOT NULL; CHECK (resource_type IN ('WORKOUT', 'EXERCISE', 'PROGRAM', 'EQUIPMENT', 'MEDIA', 'INSTITUTION'))"
    UUID created_by_user_id FK         "NOT NULL; references USER.id"
    UUID updated_by_user_id FK         "NULLABLE; references USER.id"
    TIMESTAMP created_at               "NOT NULL; DEFAULT now()"
    TIMESTAMP updated_at               "NOT NULL; DEFAULT now()"
    BOOLEAN is_active                  "NOT NULL; DEFAULT true"
    UNIQUE(favorite_id, resource_id, resource_type) "Business constraint: one favorite per resource per user"
  }
  
  %%— Classification —
  FAVORITE_CATEGORY {
    UUID favorite_id PK,FK             "NOT NULL; references FAVORITE.id"
    UUID category_id PK,FK             "NOT NULL; references CATEGORY.id"
    UUID created_by_user_id FK         "NOT NULL; references USER.id"
    UUID updated_by_user_id FK         "NULLABLE; references USER.id"
    TIMESTAMP created_at               "NOT NULL; DEFAULT now()"
    TIMESTAMP updated_at               "NOT NULL; DEFAULT now()"
    BOOLEAN is_active                  "NOT NULL; DEFAULT true"
  }
  
  FAVORITE_TAG {
    UUID favorite_id PK,FK             "NOT NULL; references FAVORITE.id"
    UUID tag_id PK,FK                  "NOT NULL; references TAG.id"
    UUID created_by_user_id FK         "NOT NULL; references USER.id"
    UUID updated_by_user_id FK         "NULLABLE; references USER.id"
    TIMESTAMP created_at               "NOT NULL; DEFAULT now()"
    TIMESTAMP updated_at               "NOT NULL; DEFAULT now()"
    BOOLEAN is_active                  "NOT NULL; DEFAULT true"
  }
  
  %%— Resource-specific metadata for type-specific fields —
  FAVORITE_RESOURCE_METADATA {
    UUID favorite_resource_id PK,FK   "NOT NULL; references FAVORITE_RESOURCE.id"
    JSONB metadata                     "NOT NULL; resource-type specific data"
    TIMESTAMP last_validated           "NOT NULL; DEFAULT now()"
    BOOLEAN is_valid                   "NOT NULL; DEFAULT true; tracks if resource still exists"
  }
  
  %%— Collections & Sharing (Layer 2 preview) —
  FAVORITE_COLLECTION {
    UUID id PK                         "NOT NULL; UNIQUE"
    UUID user_id FK                    "NOT NULL; references USER.id"
    VARCHAR(100) name                  "NOT NULL"
    TEXT description                   "NULLABLE"
    BOOLEAN is_public                  "NOT NULL; DEFAULT false"
    BOOLEAN is_system_generated        "NOT NULL; DEFAULT false; for auto-collections"
    SMALLINT sort_order                "NOT NULL; DEFAULT 0; CHECK (sort_order >= 0)"
    UUID created_by_user_id FK         "NOT NULL; references USER.id"
    UUID updated_by_user_id FK         "NULLABLE; references USER.id"
    TIMESTAMP created_at               "NOT NULL; DEFAULT now()"
    TIMESTAMP updated_at               "NOT NULL; DEFAULT now()"
    UUID visibility_id FK              "NOT NULL; references VISIBILITY.id"
    BOOLEAN is_active                  "NOT NULL; DEFAULT true"
    UNIQUE(user_id, name)              "Business constraint: unique collection names per user"
  }
  
  FAVORITE_COLLECTION_ITEM {
    UUID id PK                         "NOT NULL; UNIQUE"
    UUID collection_id FK              "NOT NULL; references FAVORITE_COLLECTION.id"
    UUID favorite_id FK                "NOT NULL; references FAVORITE.id"
    SMALLINT item_order                "NOT NULL; DEFAULT 0; CHECK (item_order >= 0)"
    TEXT collection_notes              "NULLABLE; notes specific to this collection"
    UUID created_by_user_id FK         "NOT NULL; references USER.id"
    UUID updated_by_user_id FK         "NULLABLE; references USER.id"
    TIMESTAMP added_at                 "NOT NULL; DEFAULT now()"
    TIMESTAMP created_at               "NOT NULL; DEFAULT now()"
    TIMESTAMP updated_at               "NOT NULL; DEFAULT now()"
    BOOLEAN is_active                  "NOT NULL; DEFAULT true"
    UNIQUE(collection_id, favorite_id) "Business constraint: favorite can only be in collection once"
  }
  
  %%— Analytics & Usage Tracking (Layer 3 preview) —
  FAVORITE_ANALYTICS_SUMMARY {
    UUID resource_id PK                "NOT NULL; the resource being tracked"
    ENUM resource_type PK              "NOT NULL; CHECK (resource_type IN ('WORKOUT', 'EXERCISE', 'PROGRAM', 'EQUIPMENT', 'MEDIA', 'INSTITUTION'))"
    INT total_favorites                "NOT NULL; DEFAULT 0; CHECK (total_favorites >= 0)"
    INT weekly_favorites_added         "NOT NULL; DEFAULT 0; CHECK (weekly_favorites_added >= 0)"
    INT weekly_favorites_removed       "NOT NULL; DEFAULT 0; CHECK (weekly_favorites_removed >= 0)"
    DECIMAL trending_score             "NOT NULL; DEFAULT 0.0; CHECK (trending_score >= 0.0)"
    TIMESTAMP last_calculated          "NOT NULL; DEFAULT now()"
    UNIQUE(resource_id, resource_type) "Business constraint: one summary per resource"
  }
  
  %%— Relationships —
  USER ||--o{ FAVORITE                : "creates favorites"
  FAVORITE ||--|| FAVORITE_RESOURCE   : "references resource"
  FAVORITE_RESOURCE ||--o{ FAVORITE_RESOURCE_METADATA : "metadata"
  FAVORITE ||--o{ FAVORITE_CATEGORY   : "categorized by"
  FAVORITE ||--o{ FAVORITE_TAG        : "tagged with"
  FAVORITE_CATEGORY }|--|| CATEGORY   : "category lookup"
  FAVORITE_TAG }|--|| TAG             : "tag lookup"
  
  %%— Collection relationships
  USER ||--o{ FAVORITE_COLLECTION     : "owns collections"
  FAVORITE_COLLECTION ||--o{ FAVORITE_COLLECTION_ITEM : "contains items"
  FAVORITE_COLLECTION_ITEM }|--|| FAVORITE : "favorite lookup"
  
  %%— Note: These external relationships are maintained via resource_id + resource_type pattern
  %%— Example virtual relationships (enforced by application logic):
  %%— WORKOUT ||--o{ FAVORITE_RESOURCE : "can be favorited (resource_type='WORKOUT')"
  %%— EXERCISE ||--o{ FAVORITE_RESOURCE : "can be favorited (resource_type='EXERCISE')"
  %%— PROGRAM ||--o{ FAVORITE_RESOURCE : "can be favorited (resource_type='PROGRAM')"
  %%— EQUIPMENT ||--o{ FAVORITE_RESOURCE : "can be favorited (resource_type='EQUIPMENT')"
  %%— MEDIA ||--o{ FAVORITE_RESOURCE : "can be favorited (resource_type='MEDIA')"
  %%— INSTITUTION ||--o{ FAVORITE_RESOURCE : "can be favorited (resource_type='INSTITUTION')"
```

## Notes
This diagram represents the core "favorite" definition & classification structure and relationships within the favorite domain.

---
*Generated from diagram extraction script*
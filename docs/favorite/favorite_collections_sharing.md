# Favorite Collections & Sharing

**Section:** Favorite
**Subsection:** Favorite Collections & Sharing

## Diagram

```mermaid
erDiagram
  %%=== Layer 2: Favorite Collections & Sharing ===%%

  FAVORITE_COLLECTION {
    UUID id PK                         "NOT NULL; UNIQUE"
    UUID user_id FK                    "NOT NULL; references USER.id"
    VARCHAR(100) name                  "NOT NULL"
    TEXT description                   "NULLABLE"
    BOOLEAN is_public                  "NOT NULL; DEFAULT false"
    BOOLEAN is_system_generated        "NOT NULL; DEFAULT false; for auto-collections"
    INT sort_order                     "NOT NULL; DEFAULT 0"
    TIMESTAMP created_at               "NOT NULL; DEFAULT now()"
    TIMESTAMP updated_at               "NOT NULL"
    UUID visibility_id FK              "NOT NULL; references VISIBILITY.id"
  }

  FAVORITE_COLLECTION_ITEM {
    UUID id PK                         "NOT NULL; UNIQUE"
    UUID collection_id FK              "NOT NULL; references FAVORITE_COLLECTION.id"
    UUID favorite_id FK                "NOT NULL; references FAVORITE.id"
    INT item_order                     "NOT NULL; DEFAULT 0"
    TEXT collection_notes              "NULLABLE; notes specific to this collection"
    TIMESTAMP added_at                 "NOT NULL; DEFAULT now()"
  }

  FAVORITE_SHARE {
    UUID id PK                         "NOT NULL; UNIQUE"
    UUID favorite_id FK                "NULLABLE; references FAVORITE.id"
    UUID collection_id FK              "NULLABLE; references FAVORITE_COLLECTION.id"
    UUID shared_by FK                  "NOT NULL; references USER.id"
    UUID shared_with FK                "NULLABLE; references USER.id; NULL = public share"
    UUID institution_id FK             "NULLABLE; references INSTITUTION.id"
    TEXT share_message                 "NULLABLE"
    UUID share_token                   "NOT NULL; UNIQUE"
    TIMESTAMP shared_at                "NOT NULL; DEFAULT now()"
    TIMESTAMP expires_at               "NULLABLE"
    BOOLEAN is_active                  "NOT NULL; DEFAULT true"
  }

  FAVORITE_RECOMMENDATION {
    UUID id PK                         "NOT NULL; UNIQUE"
    UUID user_id FK                    "NOT NULL; references USER.id"
    UUID resource_id                   "NOT NULL; same as FAVORITE.resource_id"
    ENUM resource_type                 "NOT NULL; same as FAVORITE.resource_type"
    FLOAT recommendation_score         "NOT NULL; 0.0 to 1.0"
    TEXT recommendation_reason         "NULLABLE; why this is recommended"
    BOOLEAN is_dismissed               "NOT NULL; DEFAULT false"
    TIMESTAMP recommended_at           "NOT NULL; DEFAULT now()"
    TIMESTAMP dismissed_at             "NULLABLE"
  }

  %%— Relationships in Layer 2 —
  USER ||--o{ FAVORITE_COLLECTION     : "owns collections"
  FAVORITE_COLLECTION ||--o{ FAVORITE_COLLECTION_ITEM : "contains items"
  FAVORITE_COLLECTION_ITEM }|--|| FAVORITE : "favorite lookup"
  FAVORITE ||--o{ FAVORITE_SHARE      : "can be shared"
  FAVORITE_COLLECTION ||--o{ FAVORITE_SHARE : "collection can be shared"
  USER ||--o{ FAVORITE_SHARE          : "shares favorites"
  USER ||--o{ FAVORITE_RECOMMENDATION : "receives recommendations"

```

## Notes

This diagram represents the favorite collections & sharing structure and relationships within the favorite domain.

---
*Generated from diagram extraction script*

# Favorite Analytics & History

**Section:** Favorite
**Subsection:** Favorite Analytics & History

## Diagram

```mermaid
erDiagram
  %%=== Layer 3: Favorite Analytics & History ===%%

  FAVORITE_USAGE_LOG {
    UUID id PK                         "NOT NULL; UNIQUE"
    UUID favorite_id FK                "NOT NULL; references FAVORITE.id"
    UUID user_id FK                    "NOT NULL; references USER.id"
    ENUM action_type                   "NOT NULL; VIEWED, USED, SHARED, COPIED, MODIFIED"
    JSONB action_context               "NULLABLE; additional context data"
    TIMESTAMP action_at                "NOT NULL; DEFAULT now()"
    UUID session_id                    "NULLABLE; for session grouping"
  }

  FAVORITE_TREND {
    UUID id PK                         "NOT NULL; UNIQUE"
    UUID resource_id                   "NOT NULL"
    ENUM resource_type                 "NOT NULL"
    DATE trend_date                    "NOT NULL"
    SMALLINT favorite_count                 "NOT NULL; total favorites for this resource"
    SMALLINT daily_favorites_added          "NOT NULL; new favorites added today"
    SMALLINT daily_favorites_removed        "NOT NULL; favorites removed today"
    FLOAT trending_score               "NOT NULL; calculated trending score"
    TIMESTAMP calculated_at            "NOT NULL; DEFAULT now()"
  }

  FAVORITE_EXPORT {
    UUID id PK                         "NOT NULL; UNIQUE"
    UUID user_id FK                    "NOT NULL; references USER.id"
    UUID collection_id FK              "NULLABLE; references FAVORITE_COLLECTION.id"
    ENUM export_format                 "NOT NULL; JSON, CSV, PDF"
    ENUM export_scope                  "NOT NULL; ALL_FAVORITES, COLLECTION, FILTERED"
    JSONB export_filters               "NULLABLE; filtering criteria used"
    TEXT export_url                    "NULLABLE; download link"
    TIMESTAMP requested_at             "NOT NULL; DEFAULT now()"
    TIMESTAMP completed_at             "NULLABLE"
    TIMESTAMP expires_at               "NULLABLE; when download link expires"
    BOOLEAN is_completed               "NOT NULL; DEFAULT false"
  }

  %%— Relationships in Layer 3 —
  FAVORITE ||--o{ FAVORITE_USAGE_LOG  : "tracks usage"
  USER ||--o{ FAVORITE_USAGE_LOG      : "performs actions"
  USER ||--o{ FAVORITE_EXPORT         : "requests exports"
  FAVORITE_COLLECTION ||--o{ FAVORITE_EXPORT : "can be exported"
```

## Notes

This diagram represents the favorite analytics & history structure and relationships within the favorite domain.

---
*Generated from diagram extraction script*

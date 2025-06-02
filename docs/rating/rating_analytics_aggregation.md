# Rating Analytics & Aggregation

**Section:** Rating
**Subsection:** Rating Analytics & Aggregation

## Diagram

```mermaid
erDiagram
  %%=== Layer 3: Rating Analytics & Aggregation ===%%

  RATING_SUMMARY {
    UUID resource_id PK                "NOT NULL; matches RATING.resource_id"
    ENUM resource_type PK              "NOT NULL; matches RATING.resource_type"
    FLOAT average_rating               "NOT NULL; calculated average"
    INT total_ratings                  "NOT NULL; count of all ratings"
    INT five_star_count                "NOT NULL"
    INT four_star_count                "NOT NULL"
    INT three_star_count               "NOT NULL"
    INT two_star_count                 "NOT NULL"
    INT one_star_count                 "NOT NULL"
    INT verified_ratings_count         "NOT NULL; count of verified ratings only"
    FLOAT verified_average             "NOT NULL; average of verified ratings only"
    TIMESTAMP last_updated             "NOT NULL; when summary was recalculated"
  }

  RATING_TREND {
    UUID id PK                         "NOT NULL; UNIQUE"
    UUID resource_id                   "NOT NULL"
    ENUM resource_type                 "NOT NULL"
    DATE trend_date                    "NOT NULL"
    FLOAT daily_average                "NOT NULL"
    INT daily_rating_count             "NOT NULL"
    FLOAT trend_direction              "NOT NULL; positive/negative trend"
    TIMESTAMP calculated_at            "NOT NULL; DEFAULT now()"
  }

  FEATURED_RATING {
    UUID id PK                         "NOT NULL; UNIQUE"
    UUID rating_id FK                  "NOT NULL; references RATING.id"
    UUID featured_by FK                "NOT NULL; references USER.id"
    TEXT feature_reason                "NULLABLE"
    INT display_order                  "NOT NULL; DEFAULT 0"
    TIMESTAMP featured_at              "NOT NULL; DEFAULT now()"
    TIMESTAMP expires_at               "NULLABLE"
    BOOLEAN is_active                  "NOT NULL; DEFAULT true"
  }

  %%— Relationships in Layer 3 —
  RATING ||--o{ FEATURED_RATING       : "can be featured"
  USER ||--o{ FEATURED_RATING         : "features ratings"

```

## Notes

This diagram represents the rating analytics & aggregation structure and relationships within the rating domain.

---
*Generated from diagram extraction script*

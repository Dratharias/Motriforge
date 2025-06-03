# Core "Rating" Definition & Classification
**Section:** Rating
**Subsection:** Core "Rating" Definition & Classification

## Diagram
```mermaid
erDiagram
  %%=== Layer 1: Core Rating & Classification ===%%
  RATING {
    UUID id PK                         "NOT NULL; UNIQUE"
    UUID user_id FK                    "NOT NULL; references USER.id"
    SMALLINT rating_value              "NOT NULL; CHECK (rating_value >= 1 AND rating_value <= 5)"
    TEXT review_text                   "NULLABLE; optional written review; CHECK (LENGTH(review_text) <= 2000)"
    BOOLEAN is_verified                "NOT NULL; DEFAULT false; user actually used the resource"
    BOOLEAN is_featured                "NOT NULL; DEFAULT false; highlighted by admins"
    UUID rating_status_id FK           "NOT NULL; references RATING_STATUS.id"
    UUID created_by_user_id FK         "NOT NULL; references USER.id"
    UUID updated_by_user_id FK         "NULLABLE; references USER.id"
    TIMESTAMP created_at               "NOT NULL; DEFAULT now()"
    TIMESTAMP updated_at               "NOT NULL; DEFAULT now()"
    BOOLEAN is_active                  "NOT NULL; DEFAULT true"
    UUID visibility_id FK              "NOT NULL; references VISIBILITY.id"
  }
  
  %%— Consolidated polymorphic resource relationship —
  RATING_RESOURCE {
    UUID id PK                         "NOT NULL; UNIQUE"
    UUID rating_id FK                  "NOT NULL; references RATING.id"
    UUID resource_id                   "NOT NULL; the ID of the rated resource"
    ENUM resource_type                 "NOT NULL; CHECK (resource_type IN ('WORKOUT', 'EXERCISE', 'PROGRAM', 'EQUIPMENT', 'INSTITUTION'))"
    UUID created_by_user_id FK         "NOT NULL; references USER.id"
    UUID updated_by_user_id FK         "NULLABLE; references USER.id"
    TIMESTAMP created_at               "NOT NULL; DEFAULT now()"
    TIMESTAMP updated_at               "NOT NULL; DEFAULT now()"
    BOOLEAN is_active                  "NOT NULL; DEFAULT true"
    UNIQUE(rating_id, resource_id, resource_type) "Business constraint: one rating per resource per user"
  }
  
  %%— Status and Classification —
  RATING_STATUS {
    UUID id PK                         "NOT NULL; UNIQUE"
    ENUM name                          "NOT NULL; UNIQUE; CHECK (name IN ('PENDING', 'APPROVED', 'REJECTED', 'FLAGGED', 'HIDDEN'))"
    TEXT description                   "NULLABLE"
    BOOLEAN requires_moderation        "NOT NULL; DEFAULT false"
    BOOLEAN is_visible_to_public       "NOT NULL; DEFAULT true"
    UUID created_by_user_id FK         "NOT NULL; references USER.id"
    UUID updated_by_user_id FK         "NULLABLE; references USER.id"
    TIMESTAMP created_at               "NOT NULL; DEFAULT now()"
    TIMESTAMP updated_at               "NOT NULL; DEFAULT now()"
    BOOLEAN is_active                  "NOT NULL; DEFAULT true"
  }
  
  RATING_CATEGORY {
    UUID rating_id PK,FK               "NOT NULL; references RATING.id"
    UUID category_id PK,FK             "NOT NULL; references CATEGORY.id"
    UUID created_by_user_id FK         "NOT NULL; references USER.id"
    UUID updated_by_user_id FK         "NULLABLE; references USER.id"
    TIMESTAMP created_at               "NOT NULL; DEFAULT now()"
    TIMESTAMP updated_at               "NOT NULL; DEFAULT now()"
    BOOLEAN is_active                  "NOT NULL; DEFAULT true"
  }
  
  RATING_TAG {
    UUID rating_id PK,FK               "NOT NULL; references RATING.id"
    UUID tag_id PK,FK                  "NOT NULL; references TAG.id"
    UUID created_by_user_id FK         "NOT NULL; references USER.id"
    UUID updated_by_user_id FK         "NULLABLE; references USER.id"
    TIMESTAMP created_at               "NOT NULL; DEFAULT now()"
    TIMESTAMP updated_at               "NOT NULL; DEFAULT now()"
    BOOLEAN is_active                  "NOT NULL; DEFAULT true"
  }
  
  %%— Detailed criteria scoring (Layer 2 preview) —
  RATING_CRITERIA {
    UUID id PK                         "NOT NULL; UNIQUE"
    UUID rating_id FK                  "NOT NULL; references RATING.id"
    UUID criteria_type_id FK           "NOT NULL; references CRITERIA_TYPE.id"
    SMALLINT score                     "NOT NULL; CHECK (score >= 1 AND score <= 5); 1-5 scale"
    TEXT notes                         "NULLABLE; CHECK (LENGTH(notes) <= 500)"
    UUID created_by_user_id FK         "NOT NULL; references USER.id"
    UUID updated_by_user_id FK         "NULLABLE; references USER.id"
    TIMESTAMP created_at               "NOT NULL; DEFAULT now()"
    TIMESTAMP updated_at               "NOT NULL; DEFAULT now()"
    BOOLEAN is_active                  "NOT NULL; DEFAULT true"
    UNIQUE(rating_id, criteria_type_id) "Business constraint: one score per criteria per rating"
  }
  
  CRITERIA_TYPE {
    UUID id PK                         "NOT NULL; UNIQUE"
    ENUM name                          "NOT NULL; UNIQUE; CHECK (name IN ('DIFFICULTY', 'EFFECTIVENESS', 'CLARITY', 'ENJOYMENT', 'EQUIPMENT_QUALITY', 'INSTRUCTION_QUALITY', 'SAFETY', 'ACCESSIBILITY'))"
    TEXT description                   "NOT NULL"
    ENUM applicable_to_resource_type   "NOT NULL; CHECK (applicable_to_resource_type IN ('WORKOUT', 'EXERCISE', 'PROGRAM', 'EQUIPMENT', 'ALL'))"
    BOOLEAN is_required                "NOT NULL; DEFAULT false"
    SMALLINT display_order             "NOT NULL; DEFAULT 0; CHECK (display_order >= 0)"
    UUID created_by_user_id FK         "NOT NULL; references USER.id"
    UUID updated_by_user_id FK         "NULLABLE; references USER.id"
    TIMESTAMP created_at               "NOT NULL; DEFAULT now()"
    TIMESTAMP updated_at               "NOT NULL; DEFAULT now()"
    BOOLEAN is_active                  "NOT NULL; DEFAULT true"
  }
  
  %%— Analytics & Aggregation (Layer 3 preview) —
  RATING_ANALYTICS_SUMMARY {
    UUID resource_id PK                "NOT NULL; the resource being rated"
    ENUM resource_type PK              "NOT NULL; CHECK (resource_type IN ('WORKOUT', 'EXERCISE', 'PROGRAM', 'EQUIPMENT', 'INSTITUTION'))"
    DECIMAL average_rating             "NOT NULL; CHECK (average_rating >= 1.0 AND average_rating <= 5.0); calculated average"
    INT total_ratings                  "NOT NULL; DEFAULT 0; CHECK (total_ratings >= 0); count of all ratings"
    INT five_star_count                "NOT NULL; DEFAULT 0; CHECK (five_star_count >= 0)"
    INT four_star_count                "NOT NULL; DEFAULT 0; CHECK (four_star_count >= 0)"
    INT three_star_count               "NOT NULL; DEFAULT 0; CHECK (three_star_count >= 0)"
    INT two_star_count                 "NOT NULL; DEFAULT 0; CHECK (two_star_count >= 0)"
    INT one_star_count                 "NOT NULL; DEFAULT 0; CHECK (one_star_count >= 0)"
    INT verified_ratings_count         "NOT NULL; DEFAULT 0; CHECK (verified_ratings_count >= 0); count of verified ratings only"
    DECIMAL verified_average           "NOT NULL; DEFAULT 0.0; CHECK (verified_average >= 0.0 AND verified_average <= 5.0); average of verified ratings only"
    TIMESTAMP last_calculated          "NOT NULL; DEFAULT now(); when summary was recalculated"
    UNIQUE(resource_id, resource_type) "Business constraint: one summary per resource"
  }
  
  %%— User Interaction Tracking —
  RATING_HELPFUL_VOTE {
    UUID id PK                         "NOT NULL; UNIQUE"
    UUID rating_id FK                  "NOT NULL; references RATING.id"
    UUID user_id FK                    "NOT NULL; references USER.id"
    BOOLEAN is_helpful                 "NOT NULL; true = helpful, false = not helpful"
    UUID created_by_user_id FK         "NOT NULL; references USER.id"
    UUID updated_by_user_id FK         "NULLABLE; references USER.id"
    TIMESTAMP created_at               "NOT NULL; DEFAULT now()"
    TIMESTAMP updated_at               "NOT NULL; DEFAULT now()"
    BOOLEAN is_active                  "NOT NULL; DEFAULT true"
    UNIQUE(rating_id, user_id)         "Business constraint: one vote per user per rating"
  }
  
  %%— Relationships —
  USER ||--o{ RATING                  : "creates ratings"
  RATING ||--|| RATING_STATUS         : "status lookup"
  RATING ||--|| RATING_RESOURCE       : "references resource"
  RATING ||--o{ RATING_CATEGORY       : "categorized by"
  RATING ||--o{ RATING_TAG            : "tagged with"
  RATING ||--o{ RATING_CRITERIA       : "detailed criteria scores"
  RATING ||--o{ RATING_HELPFUL_VOTE   : "helpfulness votes"
  
  RATING_CATEGORY }|--|| CATEGORY     : "category lookup"
  RATING_TAG }|--|| TAG               : "tag lookup"
  RATING_CRITERIA }|--|| CRITERIA_TYPE : "criteria lookup"
  RATING_HELPFUL_VOTE }|--|| USER     : "voter lookup"
  
  %%— Note: These external relationships are maintained via resource_id + resource_type pattern
  %%— Example virtual relationships (enforced by application logic):
  %%— WORKOUT ||--o{ RATING_RESOURCE : "can be rated (resource_type='WORKOUT')"
  %%— EXERCISE ||--o{ RATING_RESOURCE : "can be rated (resource_type='EXERCISE')"
  %%— PROGRAM ||--o{ RATING_RESOURCE : "can be rated (resource_type='PROGRAM')"
  %%— EQUIPMENT ||--o{ RATING_RESOURCE : "can be rated (resource_type='EQUIPMENT')"
  %%— INSTITUTION ||--o{ RATING_RESOURCE : "can be rated (resource_type='INSTITUTION')"
```

## Notes
This diagram represents the core "rating" definition & classification structure and relationships within the rating domain.

---
*Generated from diagram extraction script*
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
    UUID resource_id                   "NOT NULL; polymorphic resource reference"
    ENUM resource_type                 "NOT NULL; WORKOUT, EXERCISE, PROGRAM, EQUIPMENT"
    SMALLINT rating_value              "NOT NULL; 1-5 scale"
    TEXT review_text                   "NULLABLE; optional written review"
    BOOLEAN is_verified                "NOT NULL; DEFAULT false; user actually used the resource"
    BOOLEAN is_featured                "NOT NULL; DEFAULT false; highlighted by admins"
    UUID rating_status_id FK           "NOT NULL; references RATING_STATUS.id"
    TIMESTAMP created_at               "NOT NULL; DEFAULT now()"
    TIMESTAMP updated_at               "NOT NULL"
    UUID visibility_id FK              "NOT NULL; references VISIBILITY.id"
  }

  RATING_STATUS {
    UUID id PK                         "NOT NULL; UNIQUE"
    ENUM name                          "NOT NULL; UNIQUE; PENDING, APPROVED, REJECTED, FLAGGED"
    TEXT description                   "NULLABLE"
  }

  RATING_CATEGORY {
    UUID rating_id PK                  "NOT NULL; references RATING.id"
    UUID category_id PK                "NOT NULL; references CATEGORY.id"
  }

  RATING_TAG {
    UUID rating_id PK                  "NOT NULL; references RATING.id"
    UUID tag_id PK                     "NOT NULL; references TAG.id"
  }

  %%— Relationships in Layer 1 —
  RATING ||--|| RATING_STATUS         : "status lookup"
  RATING ||--o{ RATING_CATEGORY       : "categorized by"
  RATING ||--o{ RATING_TAG            : "tagged with"
  RATING_CATEGORY }|--|| CATEGORY     : "category lookup"
  RATING_TAG }|--|| TAG               : "tag lookup"
  USER ||--o{ RATING                  : "creates ratings"

```

## Notes

This diagram represents the core "rating" definition & classification structure and relationships within the rating domain.

---
*Generated from diagram extraction script*

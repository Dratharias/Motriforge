# Core "Activity" Definition & Classification

**Section:** Activity
**Subsection:** Core "Activity" Definition & Classification

## Diagram

```mermaid
erDiagram
  %%=== Layer 1: Core Activity & Classification ===%%

  ACTIVITY {
    UUID id PK                         "NOT NULL; UNIQUE"
    UUID user_id FK                    "NOT NULL; references USER.id"
    UUID activity_type_id FK           "NOT NULL; references ACTIVITY_TYPE.id"
    VARCHAR(255) title                 "NOT NULL"
    TEXT description                   "NULLABLE"
    UUID resource_id                   "NULLABLE; polymorphic resource reference"
    ENUM resource_type                 "NULLABLE; WORKOUT, EXERCISE, PROGRAM, INSTITUTION, etc."
    JSONB metadata                     "NULLABLE; context-specific data"
    TIMESTAMP occurred_at              "NOT NULL; when the activity happened"
    TIMESTAMP created_at               "NOT NULL; DEFAULT now()"
    TIMESTAMP updated_at               "NOT NULL"
    BOOLEAN is_system_generated        "NOT NULL; DEFAULT false"
    UUID visibility_id FK              "NOT NULL; references VISIBILITY.id"
  }

  ACTIVITY_TYPE {
    UUID id PK                         "NOT NULL; UNIQUE"
    ENUM name                          "NOT NULL; UNIQUE; LOGIN, WORKOUT_COMPLETED, EXERCISE_ADDED, PROGRAM_STARTED, etc."
    VARCHAR(255) display_name          "NOT NULL"
    TEXT description                   "NULLABLE"
    BOOLEAN is_trackable               "NOT NULL; DEFAULT true"
    BOOLEAN requires_resource          "NOT NULL; DEFAULT false"
  }

  ACTIVITY_CATEGORY {
    UUID activity_id PK                "NOT NULL; references ACTIVITY.id"
    UUID category_id PK                "NOT NULL; references CATEGORY.id"
  }

  ACTIVITY_TAG {
    UUID activity_id PK                "NOT NULL; references ACTIVITY.id"
    UUID tag_id PK                     "NOT NULL; references TAG.id"
  }

  %%— Relationships in Layer 1 —
  ACTIVITY ||--|| ACTIVITY_TYPE       : "type lookup"
  ACTIVITY ||--o{ ACTIVITY_CATEGORY   : "categorized by"
  ACTIVITY ||--o{ ACTIVITY_TAG        : "tagged with"
  ACTIVITY_CATEGORY }|--|| CATEGORY   : "category lookup"
  ACTIVITY_TAG }|--|| TAG             : "tag lookup"

```

## Notes

This diagram represents the core "activity" definition & classification structure and relationships within the activity domain.

---
*Generated from diagram extraction script*

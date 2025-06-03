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
    JSONB metadata                     "NULLABLE; context-specific data"
    TIMESTAMP occurred_at              "NOT NULL; when the activity happened"
    BOOLEAN is_system_generated        "NOT NULL; DEFAULT false"
    UUID created_by FK                 "NOT NULL; references USER.id"
    UUID updated_by FK                 "NULLABLE; references USER.id"
    TIMESTAMP created_at               "NOT NULL; DEFAULT now()"
    TIMESTAMP updated_at               "NOT NULL; DEFAULT now()"
    BOOLEAN is_active                  "NOT NULL; DEFAULT true"
    UUID visibility_id FK              "NOT NULL; references VISIBILITY.id"
  }
  
  %%— Resource-specific activity relationships —
  ACTIVITY_WORKOUT {
    UUID activity_id PK,FK             "NOT NULL; references ACTIVITY.id"
    UUID workout_id PK,FK              "NOT NULL; references WORKOUT.id"
    UUID created_by FK                 "NOT NULL; references USER.id"
    UUID updated_by FK                 "NULLABLE; references USER.id"
    TIMESTAMP created_at               "NOT NULL; DEFAULT now()"
    TIMESTAMP updated_at               "NOT NULL; DEFAULT now()"
    BOOLEAN is_active                  "NOT NULL; DEFAULT true"
  }
  
  ACTIVITY_EXERCISE {
    UUID activity_id PK,FK             "NOT NULL; references ACTIVITY.id"
    UUID exercise_id PK,FK             "NOT NULL; references EXERCISE.id"
    UUID created_by FK                 "NOT NULL; references USER.id"
    UUID updated_by FK                 "NULLABLE; references USER.id"
    TIMESTAMP created_at               "NOT NULL; DEFAULT now()"
    TIMESTAMP updated_at               "NOT NULL; DEFAULT now()"
    BOOLEAN is_active                  "NOT NULL; DEFAULT true"
  }
  
  ACTIVITY_PROGRAM {
    UUID activity_id PK,FK             "NOT NULL; references ACTIVITY.id"
    UUID program_id PK,FK              "NOT NULL; references PROGRAM.id"
    UUID created_by FK                 "NOT NULL; references USER.id"
    UUID updated_by FK                 "NULLABLE; references USER.id"
    TIMESTAMP created_at               "NOT NULL; DEFAULT now()"
    TIMESTAMP updated_at               "NOT NULL; DEFAULT now()"
    BOOLEAN is_active                  "NOT NULL; DEFAULT true"
  }
  
  %%— Activity Type and Classification —
  ACTIVITY_TYPE {
    UUID id PK                         "NOT NULL; UNIQUE"
    ENUM name                          "NOT NULL; UNIQUE; LOGIN, WORKOUT_COMPLETED, EXERCISE_ADDED, PROGRAM_STARTED, etc."
    VARCHAR(255) display_name          "NOT NULL"
    TEXT description                   "NULLABLE"
    BOOLEAN is_trackable               "NOT NULL; DEFAULT true"
    BOOLEAN requires_resource          "NOT NULL; DEFAULT false"
  }
  
  ACTIVITY_CATEGORY {
    UUID activity_id PK,FK             "NOT NULL; references ACTIVITY.id"
    UUID category_id PK,FK             "NOT NULL; references CATEGORY.id"
    UUID created_by FK                 "NOT NULL; references USER.id"
    UUID updated_by FK                 "NULLABLE; references USER.id"
    TIMESTAMP created_at               "NOT NULL; DEFAULT now()"
    TIMESTAMP updated_at               "NOT NULL; DEFAULT now()"
    BOOLEAN is_active                  "NOT NULL; DEFAULT true"
  }
  
  ACTIVITY_TAG {
    UUID activity_id PK,FK             "NOT NULL; references ACTIVITY.id"
    UUID tag_id PK,FK                  "NOT NULL; references TAG.id"
    UUID created_by FK                 "NOT NULL; references USER.id"
    UUID updated_by FK                 "NULLABLE; references USER.id"
    TIMESTAMP created_at               "NOT NULL; DEFAULT now()"
    TIMESTAMP updated_at               "NOT NULL; DEFAULT now()"
    BOOLEAN is_active                  "NOT NULL; DEFAULT true"
  }
  
  %%— Relationships —
  USER ||--o{ ACTIVITY                : "performs activities"
  ACTIVITY ||--|| ACTIVITY_TYPE       : "type lookup"
  ACTIVITY ||--o{ ACTIVITY_WORKOUT    : "workout activities"
  ACTIVITY ||--o{ ACTIVITY_EXERCISE   : "exercise activities"
  ACTIVITY ||--o{ ACTIVITY_PROGRAM    : "program activities"
  ACTIVITY ||--o{ ACTIVITY_INSTITUTION : "institution activities"
  ACTIVITY ||--o{ ACTIVITY_CATEGORY   : "categorized by"
  ACTIVITY ||--o{ ACTIVITY_TAG        : "tagged with"
  ACTIVITY_WORKOUT }|--|| WORKOUT     : "workout lookup"
  ACTIVITY_EXERCISE }|--|| EXERCISE   : "exercise lookup"
  ACTIVITY_PROGRAM }|--|| PROGRAM     : "program lookup"
  ACTIVITY_INSTITUTION }|--|| INSTITUTION : "institution lookup"
  ACTIVITY_CATEGORY }|--|| CATEGORY   : "category lookup"
  ACTIVITY_TAG }|--|| TAG             : "tag lookup"
```

## Notes
This diagram represents the core "activity" definition & classification structure and relationships within the activity domain.

---
*Generated from diagram extraction script*
# Core “Workout” Definition & Classification

**Section:** Workout
**Subsection:** Core “Workout” Definition & Classification

## Diagram

```mermaid
erDiagram
  %%=== Layer 1: Core Workout & Classification ===%%

  WORKOUT {
    UUID id PK                         "NOT NULL"
    UUID workout_status_id FK          "NOT NULL; references WORKOUT_STATUS.id"
    SMALLINT estimated_duration_seconds "NOT NULL; Max ~18 hours"
    VARCHAR(50) name                   "NOT NULL; DEFAULT 'UNNAMED'; UNIQUE"
    UUID difficulty_level_id FK        "NOT NULL; references DIFFICULTY_LEVEL.id"
    VARCHAR(255) notes                 "NULLABLE; Short summary"
    TIMESTAMP created_at               "NOT NULL; DEFAULT now()"
    TIMESTAMP updated_at               "NOT NULL"
    BOOLEAN is_active                  "NOT NULL; DEFAULT true"
    UUID visibility_id FK              "NOT NULL; references VISIBILITY.id"
  }

  %%— Classification & Lookup Tables —
  WORKOUT_STATUS {
    UUID workout_id PK "NOT NULL; references WORKOUT.id"
    UUID status_id PK  "NOT NULL; references STATUS.id"
    TIMESTAMP published_at "NULLABLE"
  }

  WORKOUT_CATEGORY {
    UUID workout_id PK "NOT NULL; references WORKOUT.id"
    UUID category_id PK "NOT NULL; references CATEGORY.id"
  }

  WORKOUT_GOAL {
    UUID workout_id PK "NOT NULL; references WORKOUT.id"
    UUID goal_id PK    "NOT NULL; references GOAL.id"
  }

  WORKOUT_CONSTRAINT {
    UUID workout_id PK "NOT NULL; references WORKOUT.id"
    UUID category_id PK "NOT NULL; references CATEGORY.id"
  }

  WORKOUT_TAG {
    UUID workout_id PK "NOT NULL; references WORKOUT.id"
    UUID tag_id PK     "NOT NULL; references TAG.id"
  }

  %%— Relationships in Layer 1 —
  WORKOUT ||--|| WORKOUT_STATUS     : "status lookup"
  WORKOUT ||--|| WORKOUT_CATEGORY   : "category lookup"
  WORKOUT ||--o{ WORKOUT_GOAL       : "has goals"
  WORKOUT ||--o{ WORKOUT_CONSTRAINT : "has constraints"
  WORKOUT ||--o{ WORKOUT_TAG        : "has tags"
```

## Notes

This diagram represents the core “workout” definition & classification structure and relationships within the workout domain.

---
*Generated from diagram extraction script*

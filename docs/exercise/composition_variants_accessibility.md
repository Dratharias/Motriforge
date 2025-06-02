# Composition “Variants & Accessibility”

**Section:** Exercise
**Subsection:** Composition “Variants & Accessibility”

## Diagram

```mermaid
erDiagram
  %%===============================================
  %% Layer 2: Exercise Variants & Accessibility
  %%===============================================

  EXERCISE_VARIANT {
    UUID id PK                         "NOT NULL; UNIQUE"
    UUID exercise_id FK                "NOT NULL; references EXERCISE.id"
    UUID variant_exercise_id FK        "NOT NULL; references EXERCISE.id"
    SMALLINT order_index               "NOT NULL"
    SMALLINT difficulty_delta          "NOT NULL"
  }

  EXERCISE_ACCESSIBILITY {
    UUID id PK                         "NOT NULL; UNIQUE"
    UUID exercise_id FK                "NOT NULL; references EXERCISE.id"
    UUID alternative_exercise_id FK     "NOT NULL; references EXERCISE.id"
    INT order_index                    "NOT NULL"
    TEXT note                          "NULLABLE"
  }

  %%— Relationships in Layer 2 —
  EXERCISE         ||--o{ EXERCISE_VARIANT      : "difficulty variants"
  EXERCISE         ||--o{ EXERCISE_ACCESSIBILITY : "accessibility alternatives"
  EXERCISE_VARIANT }|--|| EXERCISE              : "variant lookup"
  EXERCISE_ACCESSIBILITY }|--|| EXERCISE         : "alternative lookup"

```

## Notes

This diagram represents the composition “variants & accessibility” structure and relationships within the exercise domain.

---
*Generated from diagram extraction script*

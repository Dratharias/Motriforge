# Composition “Sets → Instructions → Tempo”

**Section:** Workout
**Subsection:** Composition “Sets → Instructions → Tempo”

## Diagram

```mermaid
erDiagram
  %%=== Layer 2: Composition (Sets, Instructions, Tempo) ===%%

  WORKOUT_SET {
    UUID id PK                              "NOT NULL"
    UUID workout_id FK                      "NOT NULL; references WORKOUT.id"
    VARCHAR(50) name                        "NOT NULL"
    SMALLINT rest_after_seconds             "NOT NULL"
    UUID target_muscle_id FK                "NOT NULL; references MUSCLE.id"
    UUID set_category_id FK                 "NOT NULL; references SET_CATEGORY.id"
    UUID workout_set_accessibility_id FK    "NOT NULL; references WORKOUT_SET_ACCESSIBILITY.id"
    UUID workout_set_difficulty_variant_id FK "NOT NOT; references WORKOUT_SET_DIFFICULTY_VARIANT.id"
    TIMESTAMP created_at                    "NOT NULL; DEFAULT now()"
    TIMESTAMP updated_at                    "NOT NULL"
  }

  EXERCISE_INSTRUCTION {
    UUID workout_set_id PK      "NOT NULL; references WORKOUT_SET.id"
    UUID exercise_id PK         "NOT NULL; references EXERCISE.id"
    SMALLINT rest_between_seconds "NOT NULL"
    SMALLINT order_index         "NOT NULL"
  }

  TEMPO {
    UUID exercise_instruction_id PK "NOT NULL; references EXERCISE_INSTRUCTION.id"
    UUID tempo_type_id PK           "NOT NULL; references TEMPO_TYPES.id"
    SMALLINT order_index            "NOT NULL"
  }

  TEMPO_TYPES {
    UUID id PK                    "NOT NULL"
    VARCHAR(30) type              "NOT NULL; UNIQUE"
    SMALLINT time_under_tension_seconds "NULLABLE"
    VARCHAR(255) description
  }

  WORKOUT_SET_CATEGORY {
    UUID workout_set_id PK "NOT NULL; references WORKOUT_SET.id"
    UUID category_id PK    "NOT NULL; references CATEGORY.id"
  }

  WORKOUT_SET_DIFFICULTY_VARIANT {
    UUID id PK                     "NOT NULL"
    UUID workout_id FK             "NOT NULL; references WORKOUT.id"
    UUID workout_set_id FK         "NOT NULL; references WORKOUT_SET.id"
    SMALLINT difficulty_delta      "NOT NULL"
    SMALLINT order_index           "NOT NULL"
  }

  WORKOUT_SET_ACCESSIBILITY {
    UUID id PK                     "NOT NULL"
    UUID workout_id FK             "NOT NULL; references WORKOUT.id"
    UUID workout_set_id FK         "NOT NULL; references WORKOUT_SET.id"
    SMALLINT order_index           "NOT NULL"
  }

  %%— Relationships in Layer 2 —
  WORKOUT ||--o{ WORKOUT_SET                         : "uses sets"
  WORKOUT_SET ||--o{ EXERCISE_INSTRUCTION             : "contains exercises"
  EXERCISE_INSTRUCTION ||--o{ TEMPO                    : "has tempo"
  TEMPO ||--|| TEMPO_TYPES                             : "type lookup"
  WORKOUT_SET ||--|{ WORKOUT_SET_CATEGORY               : "categorized by"
  WORKOUT ||--o{ WORKOUT_SET_DIFFICULTY_VARIANT        : "difficulty variants"
  WORKOUT ||--o{ WORKOUT_SET_ACCESSIBILITY             : "accessibility variants"

```

## Notes

This diagram represents the composition “sets → instructions → tempo” structure and relationships within the workout domain.

---
*Generated from diagram extraction script*

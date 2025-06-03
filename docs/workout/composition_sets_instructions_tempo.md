# Composition "Sets → Instructions → Tempo"
**Section:** Workout
**Subsection:** Composition "Sets → Instructions → Tempo"

## Diagram
```mermaid
erDiagram
  %%=== Layer 2: Composition (Sets, Instructions, Tempo) - FIXED ===%%
  WORKOUT_SET {
    UUID id PK                              "NOT NULL; UNIQUE"
    UUID workout_id FK                      "NOT NULL; references WORKOUT.id"
    VARCHAR(50) name                        "NOT NULL"
    SMALLINT rest_after_seconds             "NOT NULL; CHECK (rest_after_seconds >= 0)"
    UUID target_muscle_id FK                "NOT NULL; references MUSCLE.id"
    UUID workout_set_accessibility_id FK    "NULLABLE; references WORKOUT_SET_ACCESSIBILITY.id"
    UUID workout_set_difficulty_variant_id FK "NULLABLE; references WORKOUT_SET_DIFFICULTY_VARIANT.id"
    UUID created_by_user_id FK              "NOT NULL; references USER.id"
    UUID updated_by_user_id FK              "NULLABLE; references USER.id"
    TIMESTAMP created_at                    "NOT NULL; DEFAULT now()"
    TIMESTAMP updated_at                    "NOT NULL; DEFAULT now()"
    BOOLEAN is_active                       "NOT NULL; DEFAULT true"
  }
  
  %%— Workout-Muscle Targeting —
  WORKOUT_MUSCLE_TARGET {
    UUID workout_id PK,FK                   "NOT NULL; references WORKOUT.id"
    UUID muscle_id PK,FK                    "NOT NULL; references MUSCLE.id"
    ENUM target_type                        "NOT NULL; CHECK (target_type IN ('PRIMARY', 'SECONDARY', 'STABILIZER'))"
    SMALLINT intensity_percentage           "NOT NULL; CHECK (intensity_percentage >= 1 AND intensity_percentage <= 100)"
    UUID created_by_user_id FK              "NOT NULL; references USER.id"
    UUID updated_by_user_id FK              "NULLABLE; references USER.id"
    TIMESTAMP created_at                    "NOT NULL; DEFAULT now()"
    TIMESTAMP updated_at                    "NOT NULL; DEFAULT now()"
    BOOLEAN is_active                       "NOT NULL; DEFAULT true"
  }
  
  EXERCISE_INSTRUCTION {
    UUID id PK                              "NOT NULL; UNIQUE"
    UUID workout_set_id FK                  "NOT NULL; references WORKOUT_SET.id"
    UUID exercise_id FK                     "NOT NULL; references EXERCISE.id"
    SMALLINT rest_between_seconds           "NOT NULL; CHECK (rest_between_seconds >= 0)"
    SMALLINT order_index                    "NOT NULL; CHECK (order_index >= 0)"
    TEXT custom_instructions                "NULLABLE; set-specific modifications"
    UUID created_by_user_id FK              "NOT NULL; references USER.id"
    UUID updated_by_user_id FK              "NULLABLE; references USER.id"
    TIMESTAMP created_at                    "NOT NULL; DEFAULT now()"
    TIMESTAMP updated_at                    "NOT NULL; DEFAULT now()"
    BOOLEAN is_active                       "NOT NULL; DEFAULT true"
    UNIQUE(workout_set_id, exercise_id)     "Business constraint: one instruction per exercise per set"
  }
  
  TEMPO {
    UUID id PK                              "NOT NULL; UNIQUE"
    UUID exercise_instruction_id FK         "NOT NULL; references EXERCISE_INSTRUCTION.id"
    UUID tempo_type_id FK                   "NOT NULL; references TEMPO_TYPE.id"
    SMALLINT order_index                    "NOT NULL; CHECK (order_index >= 0)"
    SMALLINT custom_duration_seconds        "NULLABLE; CHECK (custom_duration_seconds > 0); override default tempo duration"
    UUID created_by_user_id FK              "NOT NULL; references USER.id"
    UUID updated_by_user_id FK              "NULLABLE; references USER.id"
    TIMESTAMP created_at                    "NOT NULL; DEFAULT now()"
    TIMESTAMP updated_at                    "NOT NULL; DEFAULT now()"
    BOOLEAN is_active                       "NOT NULL; DEFAULT true"
  }
  
  TEMPO_TYPE {
    UUID id PK                              "NOT NULL; UNIQUE"
    ENUM name                               "NOT NULL; UNIQUE; CHECK (name IN ('CONCENTRIC', 'ECCENTRIC', 'ISOMETRIC', 'PAUSE', 'EXPLOSIVE'))"
    SMALLINT time_under_tension_seconds     "NULLABLE; CHECK (time_under_tension_seconds > 0)"
    TEXT description                        "NULLABLE"
    BOOLEAN is_system_type                  "NOT NULL; DEFAULT false"
    UUID created_by_user_id FK              "NOT NULL; references USER.id"
    UUID updated_by_user_id FK              "NULLABLE; references USER.id"
    TIMESTAMP created_at                    "NOT NULL; DEFAULT now()"
    TIMESTAMP updated_at                    "NOT NULL; DEFAULT now()"
    BOOLEAN is_active                       "NOT NULL; DEFAULT true"
  }
  
  %%— Set Categories and Variants —
  SET_CATEGORY {
    UUID id PK                              "NOT NULL; UNIQUE"
    ENUM name                               "NOT NULL; UNIQUE; CHECK (name IN ('STRENGTH', 'CARDIO', 'FLEXIBILITY', 'BALANCE', 'COMPOUND', 'ISOLATION'))"
    TEXT description                        "NULLABLE"
    ENUM category_type                      "NOT NULL; CHECK (category_type IN ('STRENGTH', 'CARDIO', 'FLEXIBILITY', 'BALANCE', 'COMPOUND'))"
    UUID created_by_user_id FK              "NOT NULL; references USER.id"
    UUID updated_by_user_id FK              "NULLABLE; references USER.id"
    TIMESTAMP created_at                    "NOT NULL; DEFAULT now()"
    TIMESTAMP updated_at                    "NOT NULL; DEFAULT now()"
    BOOLEAN is_active                       "NOT NULL; DEFAULT true"
  }
  
  WORKOUT_SET_CATEGORY {
    UUID workout_set_id PK,FK               "NOT NULL; references WORKOUT_SET.id"
    UUID category_id PK,FK                  "NOT NULL; references CATEGORY.id"
    UUID created_by_user_id FK              "NOT NULL; references USER.id"
    UUID updated_by_user_id FK              "NULLABLE; references USER.id"
    TIMESTAMP created_at                    "NOT NULL; DEFAULT now()"
    TIMESTAMP updated_at                    "NOT NULL; DEFAULT now()"
    BOOLEAN is_active                       "NOT NULL; DEFAULT true"
  }
  
  WORKOUT_SET_DIFFICULTY_VARIANT {
    UUID id PK                              "NOT NULL; UNIQUE"
    UUID workout_id FK                      "NOT NULL; references WORKOUT.id"
    UUID workout_set_id FK                  "NOT NULL; references WORKOUT_SET.id"
    SMALLINT difficulty_delta               "NOT NULL; CHECK (difficulty_delta >= -10 AND difficulty_delta <= 10)"
    SMALLINT order_index                    "NOT NULL; CHECK (order_index >= 0)"
    TEXT variant_description                "NULLABLE"
    UUID created_by_user_id FK              "NOT NULL; references USER.id"
    UUID updated_by_user_id FK              "NULLABLE; references USER.id"
    TIMESTAMP created_at                    "NOT NULL; DEFAULT now()"
    TIMESTAMP updated_at                    "NOT NULL; DEFAULT now()"
    BOOLEAN is_active                       "NOT NULL; DEFAULT true"
  }
  
  WORKOUT_SET_ACCESSIBILITY {
    UUID id PK                              "NOT NULL; UNIQUE"
    UUID workout_id FK                      "NOT NULL; references WORKOUT.id"
    UUID workout_set_id FK                  "NOT NULL; references WORKOUT_SET.id"
    SMALLINT order_index                    "NOT NULL; CHECK (order_index >= 0)"
    TEXT accessibility_description          "NULLABLE"
    ENUM accessibility_type                 "NOT NULL; CHECK (accessibility_type IN ('MOBILITY_LIMITED', 'EQUIPMENT_FREE', 'LOW_IMPACT', 'SEATED', 'STANDING_ONLY'))"
    UUID created_by_user_id FK              "NOT NULL; references USER.id"
    UUID updated_by_user_id FK              "NULLABLE; references USER.id"
    TIMESTAMP created_at                    "NOT NULL; DEFAULT now()"
    TIMESTAMP updated_at                    "NOT NULL; DEFAULT now()"
    BOOLEAN is_active                       "NOT NULL; DEFAULT true"
  }
  
  %%— Relationships —
  WORKOUT ||--o{ WORKOUT_SET                         : "contains sets"
  WORKOUT ||--o{ WORKOUT_MUSCLE_TARGET               : "targets muscles"
  WORKOUT_MUSCLE_TARGET }|--|| MUSCLE               : "muscle lookup"
  WORKOUT_SET ||--|| MUSCLE                         : "primary target muscle"
  WORKOUT_SET ||--o{ EXERCISE_INSTRUCTION           : "contains exercises"
  WORKOUT_SET ||--o{ WORKOUT_SET_CATEGORY           : "additional categories"
  WORKOUT_SET_CATEGORY }|--|| CATEGORY              : "category lookup"
  EXERCISE_INSTRUCTION ||--|| EXERCISE              : "exercise lookup"
  EXERCISE_INSTRUCTION ||--o{ TEMPO                 : "has tempo"
  TEMPO }|--|| TEMPO_TYPE                           : "tempo type lookup"
  WORKOUT ||--o{ WORKOUT_SET_DIFFICULTY_VARIANT     : "difficulty variants"
  WORKOUT_SET_DIFFICULTY_VARIANT }|--|| WORKOUT_SET : "variant set"
  WORKOUT ||--o{ WORKOUT_SET_ACCESSIBILITY          : "accessibility variants"
  WORKOUT_SET_ACCESSIBILITY }|--|| WORKOUT_SET      : "accessible set"
```

## Notes
This diagram represents the composition "sets → instructions → tempo" structure with muscle targeting and comprehensive audit trails within the workout domain.

---
*Generated from diagram extraction script*
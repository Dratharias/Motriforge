# Core “Exercise” Definition & Classification

**Section:** Exercise
**Subsection:** Core “Exercise” Definition & Classification

## Diagram

```mermaid
erDiagram
  %%===============================================
  %% Layer 1: Core Exercise & Classification
  %%===============================================

  EXERCISE {
    UUID id PK                            "NOT NULL; UNIQUE"
    VARCHAR(50) name                      "NOT NULL; UNIQUE; Max 50 chars"
    VARCHAR(255) description              "NOT NULL; Short overview"
    TEXT instructions                     "NOT NULL; Step-by-step, multi-paragraph"
    TEXT notes                            "NULLABLE; Optional trainer/user notes"
    UUID difficulty_level_id FK           "NOT NULL; references DIFFICULTY_LEVEL.id"
    TIMESTAMP created_at                  "NOT NULL; DEFAULT now()"
    TIMESTAMP updated_at                  "NOT NULL; Auto-managed"
    BOOLEAN is_active                     "NOT NULL; DEFAULT true"
    UUID visibility_id FK                 "NOT NULL; references VISIBILITY.id"
  }

  EXERCISE_CATEGORY {
    UUID exercise_id PK,FK                   "NOT NULL; references EXERCISE.id"
    UUID category_id PK,FK                   "NOT NULL; references CATEGORY.id"
  }

  EXERCISE_TAG {
    UUID exercise_id PK,FK                   "NOT NULL; references EXERCISE.id"
    UUID tag_id PK,FK                        "NOT NULL; references TAG.id"
  }

  %%— Relationships in Layer 1 —
  EXERCISE        }|--|| DIFFICULTY_LEVEL : "difficulty lookup"
  EXERCISE ||--o{ EXERCISE_CATEGORY      : "categorized by"
  EXERCISE ||--o{ EXERCISE_TAG           : "tagged with"
  EXERCISE_CATEGORY }|--|{ CATEGORY        : "category lookup"
  EXERCISE_TAG      }|--|{ TAG             : "tag lookup"

```

## Notes

This diagram represents the core “exercise” definition & classification structure and relationships within the exercise domain.

---
*Generated from diagram extraction script*

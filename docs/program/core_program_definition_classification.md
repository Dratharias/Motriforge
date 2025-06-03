# Core “Program” Definition & Classification

**Section:** Program
**Subsection:** Core “Program” Definition & Classification

## Diagram

```mermaid
erDiagram
  %%=== Layer 1: Core Program & Classification ===%%

  PROGRAM {
    UUID id PK                               "NOT NULL"
    VARCHAR(60) title                        "NOT NULL; UNIQUE"
    TEXT description                         "NOT NULL"
    UUID difficulty_level_id FK              "NOT NULL; references DIFFICULTY_LEVEL.id"
    TIMESTAMP created_at                     "NOT NULL; DEFAULT now()"
    TIMESTAMP updated_at                     "NOT NULL; Auto‐managed"
    BOOLEAN is_active                        "NOT NULL; DEFAULT true"
    UUID visibility_id FK                    "NOT NULL; references VISIBILITY.id"
  }

  PROGRAM_STATUS {
    UUID program_id PK,FK "NOT NULL; references PROGRAM.id"
    UUID status_id PK,FK  "NOT NULL; references STATUS.id"
  }

  PROGRAM_CATEGORY {
    UUID program_id PK,FK                        "NOT NULL; references PROGRAM.id"
    UUID category_id PK,FK                       "NOT NULL; references CATEGORY.id"
  }

  PROGRAM_GOAL {
    UUID goal_id PK,FK                           "NOT NULL; references GOAL.id"
    UUID program_id PK,FK                        "NOT NULL; references PROGRAM.id"
  }

  PROGRAM_CONSTRAINT {
    UUID program_id PK,FK                        "NOT NULL; references PROGRAM.id"
    UUID constraint_id PK,FK                     "NOT NULL; references CATEGORY.id"
  }

  PROGRAM_TAG {
    UUID program_id PK,FK "NOT NULL; references PROGRAM.id"
    UUID tag_id PK,FK     "NOT NULL; references TAG.id"
  }

  %%— Relationships in Layer 1 —
  PROGRAM ||--|| PROGRAM_STATUS       : "status lookup"
  PROGRAM ||--|| PROGRAM_CATEGORY     : "category lookup"
  PROGRAM ||--o{ PROGRAM_GOAL         : "has goals"
  PROGRAM ||--o{ CATEGORY             : "has constraints"
  PROGRAM ||--o{ PROGRAM_TAG          : "has tags"
```

## Notes

This diagram represents the core “program” definition & classification structure and relationships within the program domain.

---
*Generated from diagram extraction script*

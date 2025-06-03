# Metadata & Extensions (Versioning, Media, Equipment, User Mapping)

**Section:** Exercise
**Subsection:** Metadata & Extensions (Versioning, Media, Equipment, User Mapping)

## Diagram

```mermaid
erDiagram
  %%========================================================
  %% Layer 3: Exercise Metadata & Extensions
  %%========================================================

  EXERCISE_VERSION {
    UUID id PK                         "NOT NULL; UNIQUE"
    UUID exercise_id FK                "NOT NULL; references EXERCISE.id"
    SMALLINT version_number                 "NOT NULL"
    TEXT change_reason                 "NULLABLE"
    TIMESTAMP created_at               "NOT NULL; DEFAULT now()"
    BOOLEAN is_active                  "NOT NULL; DEFAULT true"
  }

  EXERCISE_MEDIA {
    UUID id PK                         "NOT NULL; UNIQUE"
    UUID exercise_id FK                "NOT NULL; references EXERCISE.id"
    UUID media_id FK                   "NOT NULL; references MEDIA.id"
    TIMESTAMP added_at                 "NOT NULL; DEFAULT now()"
  }

  EXERCISE_EQUIPMENT {
    UUID id PK                         "NOT NULL; UNIQUE"
    UUID exercise_id FK                "NOT NULL; references EXERCISE.id"
    UUID equipment_id FK               "NOT NULL; references EQUIPMENT.id"
    TIMESTAMP added_at                 "NOT NULL; DEFAULT now()"
  }

  USER_EXERCISE_MAP {
    UUID id PK                         "NOT NULL; UNIQUE"
    UUID user_id FK                    "NOT NULL; references USER.id"
    UUID exercise_id FK                "NOT NULL; references EXERCISE.id"
    TIMESTAMP mapped_at                "NOT NULL; DEFAULT now()"
  }

  %%— Relationships in Layer 3 —
  EXERCISE         ||--o{ EXERCISE_VERSION       : "version history"
  EXERCISE         ||--o{ EXERCISE_MEDIA         : "has media"
  EXERCISE         ||--o{ EXERCISE_EQUIPMENT     : "uses equipment"
  EXERCISE         ||--o{ USER_EXERCISE_MAP      : "user mappings"
  EXERCISE_VERSION }|--|| EXERCISE              : "exercise lookup"
  EXERCISE_MEDIA   ||--|| MEDIA                  : "media lookup"
  EXERCISE_EQUIPMENT ||--|| EQUIPMENT            : "equipment lookup"
  USER_EXERCISE_MAP }|--|| USER                   : "user lookup"

```

## Notes

This diagram represents the metadata & extensions (versioning, media, equipment, user mapping) structure and relationships within the exercise domain.

---
*Generated from diagram extraction script*

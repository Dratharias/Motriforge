# Metadata & Extensions (Versions, Media, Duration)

**Section:** Workout
**Subsection:** Metadata & Extensions (Versions, Media, Duration)

## Diagram

```mermaid
erDiagram
  %%=== Layer 3: Metadata & Extensions ===%%

  WORKOUT_VERSION {
    UUID id PK                          "NOT NULL"
    UUID workout_id FK                  "NOT NULL; references WORKOUT.id"
    SMALLINT version_number            "NOT NULL"
    TEXT reason                         "NULLABLE"
    TIMESTAMP created_at                "NOT NULL; DEFAULT now()"
    BOOLEAN is_active                   "NOT NULL; DEFAULT true"
  }

  WORKOUT_MEDIA {
    UUID id PK                          "NOT NULL"
    UUID workout_id FK                  "NOT NULL; references WORKOUT.id"
    UUID media_id FK                    "NOT NULL; references MEDIA.id"
    TIMESTAMP added_at                  "NOT NULL; DEFAULT now()"
  }

  ESTIMATED_WORKOUT_DURATION {
    UUID workout_id PK                  "NOT NULL; references WORKOUT.id"
    SMALLINT total_seconds              "NOT NULL"
    SMALLINT tempo_seconds              "NOT NULL"
    SMALLINT rest_between_sets_seconds  "NOT NULL"
    SMALLINT rest_between_exercises_seconds "NOT NULL"
    SMALLINT warmup_seconds             "NOT NULL"
    SMALLINT transitions_seconds        "NOT NULL"
    TIMESTAMP calculated_at             "NOT NULL; DEFAULT now()"
  }

  %%— Relationships in Layer 3 —
  WORKOUT ||--o{ WORKOUT_VERSION             : "has versions"
  WORKOUT ||--o{ WORKOUT_MEDIA               : "has media"
  WORKOUT ||--|| ESTIMATED_WORKOUT_DURATION  : "has precomputed duration"
  WORKOUT_MEDIA ||--|| MEDIA                  : "media lookup"

```

## Notes

This diagram represents the metadata & extensions (versions, media, duration) structure and relationships within the workout domain.

---
*Generated from diagram extraction script*

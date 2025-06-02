# Activity Context & Associations

**Section:** Activity
**Subsection:** Activity Context & Associations

## Diagram

```mermaid
erDiagram
  %%=== Layer 2: Activity Context & Associations ===%%

  ACTIVITY_PARTICIPANT {
    UUID id PK                         "NOT NULL; UNIQUE"
    UUID activity_id FK                "NOT NULL; references ACTIVITY.id"
    UUID user_id FK                    "NOT NULL; references USER.id"
    ENUM participation_type            "NOT NULL; ACTOR, OBSERVER, BENEFICIARY, ASSIGNEE"
    TIMESTAMP joined_at                "NOT NULL; DEFAULT now()"
    TEXT notes                         "NULLABLE"
  }

  ACTIVITY_INSTITUTION {
    UUID activity_id PK                "NOT NULL; references ACTIVITY.id"
    UUID institution_id PK             "NOT NULL; references INSTITUTION.id"
    ENUM involvement_type              "NOT NULL; CONTEXT, LOCATION, AUTHORITY"
  }

  ACTIVITY_METRIC {
    UUID id PK                         "NOT NULL; UNIQUE"
    UUID activity_id FK                "NOT NULL; references ACTIVITY.id"
    UUID metric_id FK                  "NOT NULL; references METRIC.id"
    FLOAT value                        "NOT NULL"
    FLOAT previous_value               "NULLABLE; for comparison"
    TIMESTAMP measured_at              "NOT NULL"
  }

  ACTIVITY_STREAK {
    UUID id PK                         "NOT NULL; UNIQUE"
    UUID user_id FK                    "NOT NULL; references USER.id"
    UUID activity_type_id FK           "NOT NULL; references ACTIVITY_TYPE.id"
    INT current_count                  "NOT NULL; DEFAULT 0"
    INT best_count                     "NOT NULL; DEFAULT 0"
    DATE last_activity_date            "NULLABLE"
    DATE streak_started_date           "NULLABLE"
    BOOLEAN is_active                  "NOT NULL; DEFAULT true"
  }

  %%— Relationships in Layer 2 —
  ACTIVITY ||--o{ ACTIVITY_PARTICIPANT : "has participants"
  ACTIVITY ||--o{ ACTIVITY_INSTITUTION : "occurs within"
  ACTIVITY ||--o{ ACTIVITY_METRIC      : "records metrics"
  ACTIVITY_PARTICIPANT }|--|| USER     : "user lookup"
  ACTIVITY_INSTITUTION }|--|| INSTITUTION : "institution lookup"
  ACTIVITY_METRIC }|--|| METRIC        : "metric lookup"
  USER ||--o{ ACTIVITY_STREAK          : "tracks streaks"
  ACTIVITY_TYPE ||--o{ ACTIVITY_STREAK : "streak type"

```

## Notes

This diagram represents the activity context & associations structure and relationships within the activity domain.

---
*Generated from diagram extraction script*

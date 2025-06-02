# Schedule & Workout Composition

**Section:** Program
**Subsection:** Schedule & Workout Composition

## Diagram

```mermaid
erDiagram
  %%=== Layer 2: Schedule & Workout Composition ===%%

  PROGRAM_SCHEDULE {
    UUID id PK                               "NOT NULL"
    UUID program_id FK                       "NOT NULL; references PROGRAM.id"
    SMALLINT schedule_length_days            "NOT NULL; total length in days"
    VARCHAR(255) notes                       "NULLABLE"
  }

  SCHEDULE_WORKOUT {
    UUID id PK                               "NOT NULL"
    UUID program_schedule_id FK              "NOT NULL; references PROGRAM_SCHEDULE.id"
    UUID workout_id FK                       "NOT NULL; references WORKOUT.id"
    SMALLINT day_number                      "NOT NULL; MIN 0; MAX references PROGRAM_SCHEDULE.schedule_length_days"
    SMALLINT order_index                     "NOT NULL"
    BOOLEAN is_optional                      "NOT NULL; Default: false"
    VARCHAR(255) notes                       "NULLABLE"
  }

  %%— Relationships in Layer 2 —
  PROGRAM ||--o{ PROGRAM_SCHEDULE         : "default schedule"
  PROGRAM_SCHEDULE ||--o{ SCHEDULE_WORKOUT : "scheduled workouts"
  SCHEDULE_WORKOUT }|--|| WORKOUT          : "default workout"

```

## Notes

This diagram represents the schedule & workout composition structure and relationships within the program domain.

---
*Generated from diagram extraction script*

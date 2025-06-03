# Activity History & Analytics

**Section:** Activity
**Subsection:** Activity History & Analytics

## Diagram

```mermaid
erDiagram
  %%=== Layer 3: Activity History & Analytics ===%%

  ACTIVITY_SESSION {
    UUID id PK                         "NOT NULL; UNIQUE"
    UUID user_id FK                    "NOT NULL; references USER.id"
    TIMESTAMP session_start            "NOT NULL"
    TIMESTAMP session_end              "NULLABLE"
    SMALLINT activity_count                 "NOT NULL; DEFAULT 0"
    JSONB session_metadata             "NULLABLE; device, location, etc."
  }

  ACTIVITY_SESSION_ACTIVITY {
    UUID activity_session_id PK        "NOT NULL; references ACTIVITY_SESSION.id; composite PK"
    UUID activity_id PK                "NOT NULL; references ACTIVITY.id; composite PK"
    SMALLINT sequence_order                 "NOT NULL"
  }

  ACTIVITY_DIGEST {
    UUID id PK                         "NOT NULL; UNIQUE"
    UUID user_id FK                    "NOT NULL; references USER.id"
    DATE digest_date                   "NOT NULL"
    ENUM digest_period                 "NOT NULL; DAILY, WEEKLY, MONTHLY"
    SMALLINT total_activities               "NOT NULL; DEFAULT 0"
    JSONB activity_summary             "NOT NULL; counts by type"
    JSONB achievements                 "NULLABLE; badges, milestones"
    TIMESTAMP calculated_at            "NOT NULL; DEFAULT now()"
  }

  ACTIVITY_NOTIFICATION {
    UUID id PK                         "NOT NULL; UNIQUE"
    UUID activity_id FK                "NOT NULL; references ACTIVITY.id"
    UUID recipient_id FK               "NOT NULL; references USER.id"
    UUID notification_type_id FK       "NOT NULL; references NOTIFICATION_TYPE.id"
    TEXT message                       "NOT NULL"
    BOOLEAN is_read                    "NOT NULL; DEFAULT false"
    TIMESTAMP sent_at                  "NOT NULL; DEFAULT now()"
    TIMESTAMP read_at                  "NULLABLE"
  }

  %%— Relationships in Layer 3 —
  USER ||--o{ ACTIVITY_SESSION         : "has sessions"
  ACTIVITY_SESSION ||--o{ ACTIVITY_SESSION_ACTIVITY : "contains activities"
  ACTIVITY_SESSION_ACTIVITY }|--|| ACTIVITY : "activity lookup"
  USER ||--o{ ACTIVITY_DIGEST          : "receives digests"
  ACTIVITY ||--o{ ACTIVITY_NOTIFICATION : "triggers notifications"
  ACTIVITY_NOTIFICATION }|--|| USER    : "recipient lookup"

```

## Notes

This diagram represents the activity history & analytics structure and relationships within the activity domain.

---
*Generated from diagram extraction script*

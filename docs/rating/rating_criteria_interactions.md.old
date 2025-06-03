# Rating Criteria & Interactions

**Section:** Rating
**Subsection:** Rating Criteria & Interactions

## Diagram

```mermaid
erDiagram
  %%=== Layer 2: Rating Criteria & Interactions ===%%

  RATING_CRITERIA {
    UUID id PK                         "NOT NULL; UNIQUE"
    UUID rating_id FK                  "NOT NULL; references RATING.id"
    UUID criteria_type_id FK           "NOT NULL; references CRITERIA_TYPE.id"
    SMALLINT score                     "NOT NULL; 1-5 scale"
    TEXT notes                         "NULLABLE"
  }

  CRITERIA_TYPE {
    UUID id PK                         "NOT NULL; UNIQUE"
    ENUM name                          "NOT NULL; UNIQUE; DIFFICULTY, EFFECTIVENESS, CLARITY, ENJOYMENT, etc."
    TEXT description                   "NOT NULL"
    ENUM applicable_to                 "NOT NULL; WORKOUT, EXERCISE, PROGRAM, ALL"
    BOOLEAN is_active                  "NOT NULL; DEFAULT true"
  }

  RATING_HELPFUL {
    UUID id PK                         "NOT NULL; UNIQUE"
    UUID rating_id FK                  "NOT NULL; references RATING.id"
    UUID user_id FK                    "NOT NULL; references USER.id"
    BOOLEAN is_helpful                 "NOT NULL; true = helpful, false = not helpful"
    TIMESTAMP created_at               "NOT NULL; DEFAULT now()"
  }

  RATING_REPORT {
    UUID id PK                         "NOT NULL; UNIQUE"
    UUID rating_id FK                  "NOT NULL; references RATING.id"
    UUID reported_by FK                "NOT NULL; references USER.id"
    UUID report_reason_id FK           "NOT NULL; references REPORT_REASON.id"
    TEXT additional_details            "NULLABLE"
    UUID report_status_id FK           "NOT NULL; references REPORT_STATUS.id"
    TIMESTAMP reported_at              "NOT NULL; DEFAULT now()"
    TIMESTAMP resolved_at              "NULLABLE"
    UUID resolved_by FK                "NULLABLE; references USER.id"
  }

  REPORT_REASON {
    UUID id PK                         "NOT NULL; UNIQUE"
    ENUM name                          "NOT NULL; UNIQUE; SPAM, INAPPROPRIATE, FAKE, OFFENSIVE"
    TEXT description                   "NOT NULL"
  }

  REPORT_STATUS {
    UUID id PK                         "NOT NULL; UNIQUE"
    ENUM name                          "NOT NULL; UNIQUE; PENDING, REVIEWED, RESOLVED, DISMISSED"
    TEXT description                   "NULLABLE"
  }

  %%— Relationships in Layer 2 —
  RATING ||--o{ RATING_CRITERIA       : "detailed criteria scores"
  RATING_CRITERIA }|--|| CRITERIA_TYPE : "criteria lookup"
  RATING ||--o{ RATING_HELPFUL        : "helpfulness votes"
  RATING_HELPFUL }|--|| USER          : "voter lookup"
  RATING ||--o{ RATING_REPORT         : "can be reported"
  RATING_REPORT }|--|| REPORT_REASON  : "reason lookup"
  RATING_REPORT }|--|| REPORT_STATUS  : "status lookup"
  USER ||--o{ RATING_REPORT           : "reports ratings"

```

## Notes

This diagram represents the rating criteria & interactions structure and relationships within the rating domain.

---
*Generated from diagram extraction script*

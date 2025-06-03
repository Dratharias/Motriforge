# Notification Analytics & History

**Section:** Notifications
**Subsection:** Notification Analytics & History

## Diagram

```mermaid
erDiagram
  %%=== Layer 3: Notification Analytics & History ===%%

  NOTIFICATION_CAMPAIGN {
    UUID id PK                         "NOT NULL; UNIQUE"
    VARCHAR(255) campaign_name         "NOT NULL"
    TEXT description                   "NULLABLE"
    UUID notification_type_id FK       "NOT NULL; references NOTIFICATION_TYPE.id"
    JSONB target_criteria              "NOT NULL; user filtering criteria"
    UUID created_by FK                 "NOT NULL; references USER.id"
    TIMESTAMP scheduled_for            "NOT NULL"
    TIMESTAMP started_at               "NULLABLE"
    TIMESTAMP completed_at             "NULLABLE"
    INT target_user_count              "NOT NULL"
    INT sent_count                     "NOT NULL; DEFAULT 0"
    INT delivered_count                "NOT NULL; DEFAULT 0"
    INT opened_count                   "NOT NULL; DEFAULT 0"
    INT clicked_count                  "NOT NULL; DEFAULT 0"
    TIMESTAMP created_at               "NOT NULL; DEFAULT now()"
  }

  NOTIFICATION_ANALYTICS {
    UUID notification_type_id PK,FK       "NOT NULL; references NOTIFICATION_TYPE.id"
    DATE analytics_date PK             "NOT NULL"
    INT sent_count                     "NOT NULL; DEFAULT 0"
    INT delivered_count                "NOT NULL; DEFAULT 0"
    INT opened_count                   "NOT NULL; DEFAULT 0"
    INT clicked_count                  "NOT NULL; DEFAULT 0"
    INT failed_count                   "NOT NULL; DEFAULT 0"
    FLOAT open_rate                    "NOT NULL; DEFAULT 0"
    FLOAT click_rate                   "NOT NULL; DEFAULT 0"
    FLOAT delivery_rate                "NOT NULL; DEFAULT 0"
    TIMESTAMP calculated_at            "NOT NULL; DEFAULT now()"
  }

  NOTIFICATION_SUPPRESSION {
    UUID id PK                         "NOT NULL; UNIQUE"
    UUID user_id FK                    "NOT NULL; references USER.id"
    UUID notification_type_id FK       "NULLABLE; references NOTIFICATION_TYPE.id; NULL = all"
    ENUM suppression_reason            "NOT NULL; USER_UNSUBSCRIBED, BOUNCED_EMAIL, SPAM_COMPLAINT"
    TEXT details                       "NULLABLE"
    TIMESTAMP suppressed_at            "NOT NULL; DEFAULT now()"
    TIMESTAMP expires_at               "NULLABLE"
    BOOLEAN is_permanent               "NOT NULL; DEFAULT false"
  }

  %%— Relationships in Layer 3 —
  USER ||--o{ NOTIFICATION_CAMPAIGN   : "creates campaigns"
  NOTIFICATION_TYPE ||--o{ NOTIFICATION_CAMPAIGN : "campaign type"
  NOTIFICATION_TYPE ||--o{ NOTIFICATION_ANALYTICS : "daily analytics"
  USER ||--o{ NOTIFICATION_SUPPRESSION : "suppression rules"
  NOTIFICATION_TYPE ||--o{ NOTIFICATION_SUPPRESSION : "type-specific suppression"

```

## Notes

This diagram represents the notification analytics & history structure and relationships within the notifications domain.

---
*Generated from diagram extraction script*

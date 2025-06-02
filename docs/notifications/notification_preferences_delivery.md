# Notification Preferences & Delivery

**Section:** Notifications
**Subsection:** Notification Preferences & Delivery

## Diagram

```mermaid
erDiagram
  %%=== Layer 2: Notification Preferences & Delivery ===%%

  USER_NOTIFICATION_PREFERENCE {
    UUID id PK                         "NOT NULL; UNIQUE"
    UUID user_id FK                    "NOT NULL; references USER.id"
    UUID notification_type_id FK       "NOT NULL; references NOTIFICATION_TYPE.id"
    ENUM channel                       "NOT NULL; EMAIL, PUSH, IN_APP"
    BOOLEAN is_enabled                 "NOT NULL; DEFAULT true"
    JSONB channel_settings             "NULLABLE; channel-specific settings"
    TIMESTAMP updated_at               "NOT NULL; DEFAULT now()"
  }

  NOTIFICATION_DELIVERY {
    UUID id PK                         "NOT NULL; UNIQUE"
    UUID notification_id FK            "NOT NULL; references NOTIFICATION.id"
    ENUM channel                       "NOT NULL; EMAIL, PUSH, IN_APP"
    UUID delivery_status_id FK         "NOT NULL; references DELIVERY_STATUS.id"
    VARCHAR external_id                "NULLABLE; provider message ID"
    TEXT failure_reason                "NULLABLE"
    SMALLINT retry_count                    "NOT NULL; DEFAULT 0"
    TIMESTAMP sent_at                  "NULLABLE"
    TIMESTAMP delivered_at             "NULLABLE"
    TIMESTAMP failed_at                "NULLABLE"
    TIMESTAMP created_at               "NOT NULL; DEFAULT now()"
  }

  DELIVERY_STATUS {
    UUID id PK                         "NOT NULL; UNIQUE"
    ENUM name                          "NOT NULL; UNIQUE; QUEUED, SENT, DELIVERED, FAILED, BOUNCED"
    TEXT description                   "NULLABLE"
  }

  NOTIFICATION_SCHEDULE {
    UUID id PK                         "NOT NULL; UNIQUE"
    UUID user_id FK                    "NOT NULL; references USER.id"
    UUID notification_type_id FK       "NOT NULL; references NOTIFICATION_TYPE.id"
    ENUM frequency                     "NOT NULL; IMMEDIATE, DAILY, WEEKLY, MONTHLY"
    TIME preferred_time                "NULLABLE; for batched notifications"
    VARCHAR timezone                   "NOT NULL; DEFAULT 'UTC'"
    BOOLEAN is_active                  "NOT NULL; DEFAULT true"
    TIMESTAMP created_at               "NOT NULL; DEFAULT now()"
    TIMESTAMP updated_at               "NOT NULL"
  }

  NOTIFICATION_BATCH {
    UUID id PK                         "NOT NULL; UNIQUE"
    UUID user_id FK                    "NOT NULL; references USER.id"
    ENUM batch_type                    "NOT NULL; DAILY_DIGEST, WEEKLY_SUMMARY"
    SMALLINT notification_count             "NOT NULL"
    TIMESTAMP sent_at                  "NOT NULL"
    JSONB batch_metadata               "NULLABLE"
  }

  NOTIFICATION_BATCH_ITEM {
    UUID notification_batch_id PK      "NOT NULL; references NOTIFICATION_BATCH.id"
    UUID notification_id PK            "NOT NULL; references NOTIFICATION.id"
    SMALLINT display_order                  "NOT NULL; DEFAULT 0"
  }

  %%— Relationships in Layer 2 —
  USER ||--o{ USER_NOTIFICATION_PREFERENCE : "sets preferences"
  NOTIFICATION_TYPE ||--o{ USER_NOTIFICATION_PREFERENCE : "preference per type"
  NOTIFICATION ||--o{ NOTIFICATION_DELIVERY : "delivery attempts"
  NOTIFICATION_DELIVERY ||--|| DELIVERY_STATUS : "status lookup"
  USER ||--o{ NOTIFICATION_SCHEDULE   : "custom schedules"
  USER ||--o{ NOTIFICATION_BATCH      : "receives batches"
  NOTIFICATION_BATCH ||--o{ NOTIFICATION_BATCH_ITEM : "contains notifications"
  NOTIFICATION_BATCH_ITEM }|--|| NOTIFICATION : "notification lookup"

```

## Notes

This diagram represents the notification preferences & delivery structure and relationships within the notifications domain.

---
*Generated from diagram extraction script*

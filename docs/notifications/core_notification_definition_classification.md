# Core "Notification" Definition & Classification

**Section:** Notifications
**Subsection:** Core "Notification" Definition & Classification

## Diagram

```mermaid
erDiagram
  %%=== Layer 1: Core Notification & Classification ===%%

  NOTIFICATION_TYPE {
    UUID id PK                         "NOT NULL; UNIQUE"
    ENUM name                          "NOT NULL; UNIQUE; WORKOUT_REMINDER, PROGRAM_COMPLETE, etc."
    VARCHAR(255) display_name          "NOT NULL"
    TEXT description                   "NULLABLE"
    ENUM category                      "NOT NULL; SYSTEM, ACTIVITY, REMINDER, SOCIAL, BILLING"
    ENUM priority                      "NOT NULL; LOW, NORMAL, HIGH, URGENT"
    BOOLEAN is_user_configurable       "NOT NULL; DEFAULT true"
    BOOLEAN requires_action            "NOT NULL; DEFAULT false"
    TIMESTAMP created_at               "NOT NULL; DEFAULT now()"
    BOOLEAN is_active                  "NOT NULL; DEFAULT true"
  }

  NOTIFICATION_TEMPLATE {
    UUID id PK                         "NOT NULL; UNIQUE"
    UUID notification_type_id FK       "NOT NULL; references NOTIFICATION_TYPE.id"
    ENUM channel                       "NOT NULL; EMAIL, PUSH, IN_APP"
    VARCHAR(255) subject_template      "NULLABLE; for emails"
    TEXT body_template                 "NOT NULL; supports variables {{user.name}}"
    TEXT action_url_template           "NULLABLE; deep link template"
    VARCHAR(100) action_button_text    "NULLABLE"
    JSONB template_variables           "NULLABLE; available variables"
    TIMESTAMP created_at               "NOT NULL; DEFAULT now()"
    TIMESTAMP updated_at               "NOT NULL"
    BOOLEAN is_active                  "NOT NULL; DEFAULT true"
  }

  NOTIFICATION {
    UUID id PK                         "NOT NULL; UNIQUE"
    UUID user_id FK                    "NOT NULL; references USER.id"
    UUID notification_type_id FK       "NOT NULL; references NOTIFICATION_TYPE.id"
    VARCHAR(255) title                 "NOT NULL"
    TEXT message                       "NOT NULL"
    TEXT action_url                    "NULLABLE; deep link"
    VARCHAR(100) action_button_text    "NULLABLE"
    JSONB metadata                     "NULLABLE; related resource IDs, context"
    UUID notification_status_id FK     "NOT NULL; references NOTIFICATION_STATUS.id"
    TIMESTAMP scheduled_for            "NULLABLE; for delayed notifications"
    TIMESTAMP sent_at                  "NULLABLE"
    TIMESTAMP read_at                  "NULLABLE"
    TIMESTAMP clicked_at               "NULLABLE"
    TIMESTAMP created_at               "NOT NULL; DEFAULT now()"
  }

  NOTIFICATION_STATUS {
    UUID id PK                         "NOT NULL; UNIQUE"
    ENUM name                          "NOT NULL; UNIQUE; PENDING, SENT, DELIVERED, READ, CLICKED, FAILED"
    TEXT description                   "NULLABLE"
  }

  %%— Relationships in Layer 1 —
  NOTIFICATION_TYPE ||--o{ NOTIFICATION_TEMPLATE : "has templates"
  NOTIFICATION_TYPE ||--o{ NOTIFICATION : "instances"
  NOTIFICATION ||--|| NOTIFICATION_STATUS : "status lookup"
  USER ||--o{ NOTIFICATION            : "receives notifications"

```

## Notes

This diagram represents the core "notification" definition & classification structure and relationships within the notifications domain.

---
*Generated from diagram extraction script*

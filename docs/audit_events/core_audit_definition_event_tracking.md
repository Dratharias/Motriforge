# Core "Audit" Definition & Event Tracking

**Section:** Audit & Events
**Subsection:** Core "Audit" Definition & Event Tracking

## Diagram

```mermaid
erDiagram
  %%=== Layer 1: Core Audit & Event Tracking ===%%

  AUDIT_LOG {
    UUID id PK                         "NOT NULL; UNIQUE"
    UUID user_id FK                    "NULLABLE; references USER.id; NULL for system events"
    VARCHAR(100) entity_type           "NOT NULL; table/entity name"
    UUID entity_id                     "NOT NULL; record ID"
    ENUM action                        "NOT NULL; CREATE, UPDATE, DELETE, VIEW, EXPORT"
    JSONB old_values                   "NULLABLE; before state"
    JSONB new_values                   "NULLABLE; after state"
    JSONB changed_fields               "NULLABLE; list of changed field names"
    VARCHAR(45) ip_address             "NULLABLE"
    VARCHAR(500) user_agent            "NULLABLE"
    UUID session_id                    "NULLABLE; for session grouping"
    TEXT reason                        "NULLABLE; user-provided reason for change"
    TIMESTAMP occurred_at              "NOT NULL; DEFAULT now()"
  }

  SYSTEM_EVENT {
    UUID id PK                         "NOT NULL; UNIQUE"
    ENUM event_type                    "NOT NULL; LOGIN, LOGOUT, PASSWORD_RESET, SUBSCRIPTION_CHANGE, etc."
    UUID user_id FK                    "NULLABLE; references USER.id"
    UUID resource_id                   "NULLABLE; related resource"
    ENUM resource_type                 "NULLABLE; WORKOUT, PROGRAM, etc."
    JSONB event_data                   "NOT NULL; event-specific payload"
    ENUM severity                      "NOT NULL; INFO, WARNING, ERROR, CRITICAL"
    VARCHAR(45) ip_address             "NULLABLE"
    VARCHAR(500) user_agent            "NULLABLE"
    UUID trace_id                      "NULLABLE; for distributed tracing"
    TIMESTAMP occurred_at              "NOT NULL; DEFAULT now()"
  }

  EVENT_TYPE {
    UUID id PK                         "NOT NULL; UNIQUE"
    ENUM name                          "NOT NULL; UNIQUE"
    TEXT description                   "NOT NULL"
    ENUM category                      "NOT NULL; SECURITY, BUSINESS, SYSTEM, INTEGRATION"
    BOOLEAN requires_retention         "NOT NULL; DEFAULT true"
    INT retention_days                 "NOT NULL; DEFAULT 90"
    BOOLEAN is_sensitive               "NOT NULL; DEFAULT false"
  }

  %%— Relationships in Layer 1 —
  AUDIT_LOG }|--|| USER               : "performed by user"
  SYSTEM_EVENT }o--|| USER            : "relates to user"
  SYSTEM_EVENT }|--|| EVENT_TYPE      : "event type lookup"

```

## Notes

This diagram represents the core "audit" definition & event tracking structure and relationships within the audit & events domain.

---
*Generated from diagram extraction script*

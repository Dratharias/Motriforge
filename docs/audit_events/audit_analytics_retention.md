# Audit Analytics & Retention

**Section:** Audit & Events
**Subsection:** Audit Analytics & Retention

## Diagram

```mermaid
erDiagram
  %%=== Layer 3: Audit Analytics & Retention ===%%

  AUDIT_RETENTION_POLICY {
    UUID id PK                         "NOT NULL; UNIQUE"
    VARCHAR(100) entity_type           "NOT NULL"
    ENUM action                        "NOT NULL"
    INT retention_days                 "NOT NULL"
    BOOLEAN compress_after_days        "NOT NULL; DEFAULT false"
    INT compression_after_days         "NULLABLE"
    BOOLEAN is_active                  "NOT NULL; DEFAULT true"
    TIMESTAMP created_at               "NOT NULL; DEFAULT now()"
    TIMESTAMP updated_at               "NOT NULL"
  }

  AUDIT_EXPORT {
    UUID id PK                         "NOT NULL; UNIQUE"
    UUID requested_by FK               "NOT NULL; references USER.id"
    DATE export_start_date             "NOT NULL"
    DATE export_end_date               "NOT NULL"
    JSONB export_filters               "NULLABLE; filtering criteria"
    ENUM export_format                 "NOT NULL; CSV, JSON, PDF"
    ENUM export_scope                  "NOT NULL; USER_ACTIVITY, SYSTEM_EVENTS, SECURITY_EVENTS, ALL"
    VARCHAR export_url                 "NULLABLE; download link"
    ENUM export_status                 "NOT NULL; REQUESTED, PROCESSING, COMPLETED, FAILED"
    TIMESTAMP requested_at             "NOT NULL; DEFAULT now()"
    TIMESTAMP completed_at             "NULLABLE"
    TIMESTAMP expires_at               "NULLABLE; when download expires"
  }

  EVENT_ANALYTICS {
    DATE analytics_date PK             "NOT NULL"
    ENUM event_category PK             "NOT NULL; references EVENT_TYPE.category"
    INT total_events                   "NOT NULL; DEFAULT 0"
    INT unique_users                   "NOT NULL; DEFAULT 0"
    INT error_events                   "NOT NULL; DEFAULT 0"
    INT security_events                "NOT NULL; DEFAULT 0"
    FLOAT average_processing_time      "NOT NULL; DEFAULT 0"
    TIMESTAMP calculated_at            "NOT NULL; DEFAULT now()"
  }

  %%— Relationships in Layer 3 —
  USER ||--o{ AUDIT_EXPORT            : "requests exports"
  EVENT_TYPE ||--o{ EVENT_ANALYTICS   : "category analytics"

```

## Notes

This diagram represents the audit analytics & retention structure and relationships within the audit & events domain.

---
*Generated from diagram extraction script*

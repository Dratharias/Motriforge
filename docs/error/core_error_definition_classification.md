# Core "Error" Definition & Classification

**Section:** Error
**Subsection:** Core "Error" Definition & Classification

## Diagram

```mermaid
erDiagram
  %%=== Layer 1: Core Error & Classification ===%%

  ERROR {
    UUID id PK                         "NOT NULL; UNIQUE"
    VARCHAR(100) error_code            "NOT NULL; APP_001, API_404, DB_CONNECTION, etc."
    VARCHAR(255) error_message         "NOT NULL"
    TEXT error_description             "NULLABLE; detailed description"
    UUID error_type_id FK              "NOT NULL; references ERROR_TYPE.id"
    UUID severity_level_id FK          "NOT NULL; references SEVERITY_LEVEL.id"
    UUID user_id FK                    "NULLABLE; references USER.id; user who experienced error"
    VARCHAR(100) source_component      "NOT NULL; API, DATABASE, PAYMENT, AUTH, etc."
    VARCHAR(100) source_method         "NULLABLE; specific method/endpoint"
    TEXT stack_trace                   "NULLABLE; technical stack trace"
    JSONB context_data                 "NULLABLE; request data, environment info"
    VARCHAR(45) ip_address             "NULLABLE"
    VARCHAR(500) user_agent            "NULLABLE"
    UUID session_id                    "NULLABLE"
    UUID error_status_id FK            "NOT NULL; references ERROR_STATUS.id"
    TIMESTAMP occurred_at              "NOT NULL; DEFAULT now()"
    TIMESTAMP updated_at               "NOT NULL"
    UUID visibility_id FK              "NOT NULL; references VISIBILITY.id"
  }

  ERROR_TYPE {
    UUID id PK                         "NOT NULL; UNIQUE"
    ENUM name                          "NOT NULL; UNIQUE; VALIDATION, DATABASE, API, AUTH, PAYMENT, SYSTEM"
    TEXT description                   "NOT NULL"
    BOOLEAN requires_immediate_attention "NOT NULL; DEFAULT false"
    BOOLEAN is_user_facing             "NOT NULL; DEFAULT false"
    INT default_retention_days         "NOT NULL; DEFAULT 90"
  }

  SEVERITY_LEVEL {
    UUID id PK                         "NOT NULL; UNIQUE"
    ENUM name                          "NOT NULL; UNIQUE; LOW, MEDIUM, HIGH, CRITICAL"
    TEXT description                   "NOT NULL"
    VARCHAR(7) color_code              "NOT NULL; hex color for UI"
    BOOLEAN requires_notification      "NOT NULL; DEFAULT false"
    BOOLEAN requires_escalation        "NOT NULL; DEFAULT false"
  }

  ERROR_STATUS {
    UUID id PK                         "NOT NULL; UNIQUE"
    ENUM name                          "NOT NULL; UNIQUE; NEW, INVESTIGATING, RESOLVED, IGNORED, ESCALATED"
    TEXT description                   "NULLABLE"
  }

  ERROR_CATEGORY {
    UUID error_id PK                   "NOT NULL; references ERROR.id"
    UUID category_id PK                "NOT NULL; references CATEGORY.id"
  }

  ERROR_TAG {
    UUID error_id PK                   "NOT NULL; references ERROR.id"
    UUID tag_id PK                     "NOT NULL; references TAG.id"
  }

  %%— Relationships in Layer 1 —
  ERROR ||--|| ERROR_TYPE             : "type lookup"
  ERROR ||--|| SEVERITY_LEVEL         : "severity lookup"
  ERROR ||--|| ERROR_STATUS           : "status lookup"
  ERROR ||--o{ ERROR_CATEGORY         : "categorized by"
  ERROR ||--o{ ERROR_TAG              : "tagged with"
  ERROR_CATEGORY }|--|| CATEGORY      : "category lookup"
  ERROR_TAG }|--|| TAG                : "tag lookup"
  USER ||--o{ ERROR                   : "experiences errors"

```

## Notes

This diagram represents the core "error" definition & classification structure and relationships within the error domain.

---
*Generated from diagram extraction script*

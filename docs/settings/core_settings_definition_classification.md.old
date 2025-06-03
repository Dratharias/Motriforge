# Core "Settings" Definition & Classification

**Section:** Settings
**Subsection:** Core "Settings" Definition & Classification

## Diagram

```mermaid
erDiagram
  %%=== Layer 1: Core Settings & Classification ===%%

  SETTING {
    UUID id PK                         "NOT NULL; UNIQUE"
    VARCHAR(100) setting_key           "NOT NULL; UNIQUE; dot notation like user.notifications.email"
    VARCHAR(255) display_name          "NOT NULL"
    TEXT description                   "NULLABLE"
    ENUM setting_scope                 "NOT NULL; USER, INSTITUTION, SYSTEM"
    ENUM data_type                     "NOT NULL; STRING, INTEGER, BOOLEAN, JSON, FLOAT"
    JSONB default_value                "NOT NULL"
    JSONB validation_rules             "NULLABLE; min/max, regex, options"
    BOOLEAN is_required                "NOT NULL; DEFAULT false"
    BOOLEAN is_sensitive               "NOT NULL; DEFAULT false; for passwords, tokens"
    BOOLEAN is_user_configurable       "NOT NULL; DEFAULT true"
    TIMESTAMP created_at               "NOT NULL; DEFAULT now()"
    TIMESTAMP updated_at               "NOT NULL"
    BOOLEAN is_active                  "NOT NULL; DEFAULT true"
  }

  SETTING_CATEGORY {
    UUID setting_id PK,FK                 "NOT NULL; references SETTING.id"
    UUID category_id PK,FK                "NOT NULL; references CATEGORY.id"
  }

  SETTING_TAG {
    UUID setting_id PK,FK                 "NOT NULL; references SETTING.id"
    UUID tag_id PK,FK                     "NOT NULL; references TAG.id"
  }

  %%— Relationships in Layer 1 —
  SETTING ||--o{ SETTING_CATEGORY     : "categorized by"
  SETTING ||--o{ SETTING_TAG          : "tagged with"
  SETTING_CATEGORY }|--|| CATEGORY    : "category lookup"
  SETTING_TAG }|--|| TAG              : "tag lookup"

```

## Notes

This diagram represents the core "settings" definition & classification structure and relationships within the settings domain.

---
*Generated from diagram extraction script*

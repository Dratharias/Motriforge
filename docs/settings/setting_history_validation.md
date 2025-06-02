# Setting History & Validation

**Section:** Settings
**Subsection:** Setting History & Validation

## Diagram

```mermaid
erDiagram
  %%=== Layer 3: Setting History & Validation ===%%

  SETTING_CHANGE_LOG {
    UUID id PK                         "NOT NULL; UNIQUE"
    UUID setting_id FK                 "NOT NULL; references SETTING.id"
    UUID changed_by FK                 "NOT NULL; references USER.id"
    ENUM scope                         "NOT NULL; USER, INSTITUTION, SYSTEM"
    UUID scope_id                      "NULLABLE; user_id or institution_id"
    JSONB old_value                    "NULLABLE"
    JSONB new_value                    "NOT NULL"
    TEXT change_reason                 "NULLABLE"
    TIMESTAMP changed_at               "NOT NULL; DEFAULT now()"
  }

  SETTING_TEMPLATE {
    UUID id PK                         "NOT NULL; UNIQUE"
    VARCHAR(100) template_name         "NOT NULL; UNIQUE"
    TEXT description                   "NULLABLE"
    ENUM template_scope                "NOT NULL; USER, INSTITUTION"
    JSONB settings_data                "NOT NULL; key-value pairs"
    UUID created_by FK                 "NOT NULL; references USER.id"
    BOOLEAN is_system_template         "NOT NULL; DEFAULT false"
    TIMESTAMP created_at               "NOT NULL; DEFAULT now()"
    BOOLEAN is_active                  "NOT NULL; DEFAULT true"
  }

  SETTING_EXPORT {
    UUID id PK                         "NOT NULL; UNIQUE"
    UUID requested_by FK               "NOT NULL; references USER.id"
    ENUM export_scope                  "NOT NULL; USER, INSTITUTION, SYSTEM"
    UUID scope_id                      "NULLABLE; user_id or institution_id"
    JSONB exported_settings            "NOT NULL"
    VARCHAR export_format              "NOT NULL; JSON, CSV"
    TIMESTAMP exported_at              "NOT NULL; DEFAULT now()"
    TIMESTAMP expires_at               "NOT NULL; DEFAULT (now() + interval '24 hours')"
  }

  %%— Relationships in Layer 3 —
  SETTING ||--o{ SETTING_CHANGE_LOG   : "tracks changes"
  USER ||--o{ SETTING_CHANGE_LOG      : "makes changes"
  USER ||--o{ SETTING_TEMPLATE        : "creates templates"
  USER ||--o{ SETTING_EXPORT          : "exports settings"

```

## Notes

This diagram represents the setting history & validation structure and relationships within the settings domain.

---
*Generated from diagram extraction script*

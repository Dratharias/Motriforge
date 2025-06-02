# Setting Values & Overrides

**Section:** Settings
**Subsection:** Setting Values & Overrides

## Diagram

```mermaid
erDiagram
  %%=== Layer 2: Setting Values & Overrides ===%%

  SYSTEM_SETTING {
    UUID id PK                         "NOT NULL; UNIQUE"
    UUID setting_id FK                 "NOT NULL; references SETTING.id; UNIQUE"
    JSONB value                        "NOT NULL"
    UUID set_by FK                     "NOT NULL; references USER.id"
    TEXT change_reason                 "NULLABLE"
    TIMESTAMP set_at                   "NOT NULL; DEFAULT now()"
    TIMESTAMP updated_at               "NOT NULL"
  }

  SETTING_GROUP {
    UUID id PK                         "NOT NULL; UNIQUE"
    VARCHAR(100) group_name            "NOT NULL; UNIQUE"
    TEXT description                   "NULLABLE"
    SMALLINT display_order                  "NOT NULL; DEFAULT 0"
    BOOLEAN is_collapsible             "NOT NULL; DEFAULT true"
    BOOLEAN is_expanded_default        "NOT NULL; DEFAULT true"
  }

  SETTING_GROUP_MEMBER {
    UUID setting_group_id PK           "NOT NULL; references SETTING_GROUP.id"
    UUID setting_id PK                 "NOT NULL; references SETTING.id"
    SMALLINT display_order                  "NOT NULL; DEFAULT 0"
  }

  %%— Relationships in Layer 2 —
  USER ||--o{ USER_SETTING      : "has user settings"
  INSTITUTION ||--o{ INSTITUTION_SETTING : "has institution settings"
  SETTING ||--o{ USER_SETTING   : "user values"
  SETTING ||--o{ INSTITUTION_SETTING : "institution values"
  SETTING ||--|| SYSTEM_SETTING : "system value"
  SETTING_GROUP ||--o{ SETTING_GROUP_MEMBER : "contains settings"
  SETTING_GROUP_MEMBER }|--|| SETTING : "setting lookup"
  USER ||--o{ SYSTEM_SETTING    : "system changes"

```

## Notes

This diagram represents the setting values & overrides structure and relationships within the settings domain.

---
*Generated from diagram extraction script*

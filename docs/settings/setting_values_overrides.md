# Setting Values & Overrides

**Section:** Settings
**Subsection:** Setting Values & Overrides

## Diagram

```mermaid
erDiagram
  %%=== Layer 2: Setting Values & Overrides ===%%

  USER_SETTING_VALUE {
    UUID id PK                         "NOT NULL; UNIQUE"
    UUID user_id FK                    "NOT NULL; references USER.id"
    UUID setting_id FK                 "NOT NULL; references SETTING.id"
    JSONB value                        "NOT NULL"
    BOOLEAN is_default                 "NOT NULL; DEFAULT false"
    TIMESTAMP set_at                   "NOT NULL; DEFAULT now()"
    TIMESTAMP updated_at               "NOT NULL"
  }

  INSTITUTION_SETTING_VALUE {
    UUID id PK                         "NOT NULL; UNIQUE"
    UUID institution_id FK             "NOT NULL; references INSTITUTION.id"
    UUID setting_id FK                 "NOT NULL; references SETTING.id"
    JSONB value                        "NOT NULL"
    BOOLEAN overrides_system           "NOT NULL; DEFAULT false"
    UUID set_by FK                     "NOT NULL; references USER.id"
    TIMESTAMP set_at                   "NOT NULL; DEFAULT now()"
    TIMESTAMP updated_at               "NOT NULL"
  }

  SYSTEM_SETTING_VALUE {
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
    INT display_order                  "NOT NULL; DEFAULT 0"
    BOOLEAN is_collapsible             "NOT NULL; DEFAULT true"
    BOOLEAN is_expanded_default        "NOT NULL; DEFAULT true"
  }

  SETTING_GROUP_MEMBER {
    UUID setting_group_id PK           "NOT NULL; references SETTING_GROUP.id"
    UUID setting_id PK                 "NOT NULL; references SETTING.id"
    INT display_order                  "NOT NULL; DEFAULT 0"
  }

  %%— Relationships in Layer 2 —
  USER ||--o{ USER_SETTING_VALUE      : "has user settings"
  INSTITUTION ||--o{ INSTITUTION_SETTING_VALUE : "has institution settings"
  SETTING ||--o{ USER_SETTING_VALUE   : "user values"
  SETTING ||--o{ INSTITUTION_SETTING_VALUE : "institution values"
  SETTING ||--|| SYSTEM_SETTING_VALUE : "system value"
  SETTING_GROUP ||--o{ SETTING_GROUP_MEMBER : "contains settings"
  SETTING_GROUP_MEMBER }|--|| SETTING : "setting lookup"
  USER ||--o{ SYSTEM_SETTING_VALUE    : "system changes"

```

## Notes

This diagram represents the setting values & overrides structure and relationships within the settings domain.

---
*Generated from diagram extraction script*

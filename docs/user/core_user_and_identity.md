# Core "User" and Identity
**Section:** User
**Subsection:** Core "User" and Identity

## Diagram
```mermaid
erDiagram
  %%=== Layer 1: Core User and Identity ===%%
  USER {
    UUID id PK                          "NOT NULL; UNIQUE"
    VARCHAR(255) email                  "NOT NULL; UNIQUE"
    VARCHAR(255) first_name             "NOT NULL"
    VARCHAR(255) last_name              "NOT NULL"
    DATE date_of_birth                  "NULLABLE"
    TEXT notes                          "NULLABLE"
    TIMESTAMP created_at                "NOT NULL; DEFAULT now()"
    TIMESTAMP updated_at                "NOT NULL; DEFAULT now()"
    TIMESTAMP last_login                "NOT NULL"
    BOOLEAN is_active                   "NOT NULL; DEFAULT true"
    UUID visibility_id FK               "NOT NULL; references VISIBILITY.id"
  }
  
  %%— Identity Extensions —
  USER_PASSWORD_RESET {
    UUID id PK                         "NOT NULL; UNIQUE"
    UUID user_id FK                    "NOT NULL; references USER.id"
    VARCHAR(255) reset_token           "NOT NULL; UNIQUE"
    TIMESTAMP requested_at             "NOT NULL; DEFAULT now()"
    TIMESTAMP expires_at               "NOT NULL"
    BOOLEAN is_used                    "NOT NULL; DEFAULT false"
  }
  
  USER_SETTING {
    UUID id PK                         "NOT NULL; UNIQUE"
    UUID user_id FK                    "NOT NULL; references USER.id"
    UUID setting_id FK                 "NOT NULL; references SETTING.id"
    JSONB value                        "NOT NULL"
    BOOLEAN is_default                 "NOT NULL; DEFAULT false"
    UUID created_by FK                 "NOT NULL; references USER.id"
    UUID updated_by FK                 "NULLABLE; references USER.id"
    TIMESTAMP created_at               "NOT NULL; DEFAULT now()"
    TIMESTAMP updated_at               "NOT NULL; DEFAULT now()"
    BOOLEAN is_active                  "NOT NULL; DEFAULT true"
  }
  
  %%— Categorical Tagging —
  USER_TAG {
    UUID user_id PK,FK                 "NOT NULL; references USER.id"
    UUID tag_id PK,FK                  "NOT NULL; references TAG.id"
    UUID created_by FK                 "NOT NULL; references USER.id"
    UUID updated_by FK                 "NULLABLE; references USER.id"
    TIMESTAMP created_at               "NOT NULL; DEFAULT now()"
    TIMESTAMP updated_at               "NOT NULL; DEFAULT now()"
    BOOLEAN is_active                  "NOT NULL; DEFAULT true"
  }
  
  USER_CATEGORY {
    UUID user_id PK,FK                 "NOT NULL; references USER.id"
    UUID category_id PK,FK             "NOT NULL; references CATEGORY.id"
    UUID created_by FK                 "NOT NULL; references USER.id"
    UUID updated_by FK                 "NULLABLE; references USER.id"
    TIMESTAMP created_at               "NOT NULL; DEFAULT now()"
    TIMESTAMP updated_at               "NOT NULL; DEFAULT now()"
    BOOLEAN is_active                  "NOT NULL; DEFAULT true"
  }
  
  %%— Internal Relationships —
  USER ||--o{ USER_PASSWORD_RESET : "can request resets"
  USER ||--o{ USER_SETTING  : "has settings"
  USER ||--o{ USER_TAG            : "has tags"
  USER ||--o{ USER_CATEGORY       : "has categories"
  USER_TAG }|--|| TAG             : "tag lookup"
  USER_CATEGORY }|--|| CATEGORY   : "category lookup"
  USER_SETTING }|--|| SETTING : "setting lookup"
```

## Notes
This diagram represents the core "user" and identity structure and relationships within the user domain.

---
*Generated from diagram extraction script*

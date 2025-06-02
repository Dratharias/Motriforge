# Core “User” and Identity

**Section:** User
**Subsection:** Core “User” and Identity

## Diagram

```mermaid
erDiagram
  %%=== Layer 1: Core User and Identity ===%%

  USER {
    UUID id PK                          "NOT NULL"
    UUID user_category_id FK           "NOT NULL; references USER_CATEGORY.id"
    VARCHAR(255) email                  "NOT NULL, UNIQUE"
    VARCHAR(255) first_name             "NOT NULL"
    VARCHAR(255) last_name              "NOT NULL"
    DATE date_of_birth                  "NULLABLE"
    TEXT notes                          "NULLABLE"
    TIMESTAMP created_at                "NOT NULL"
    TIMESTAMP updated_at                "NOT NULL"
    TIMESTAMP last_login                "NOT NULL"
    BOOLEAN is_active                   "NOT NULL"
	  UUID visibility_id FK               "NULLABLE; references VISIBILITY.id; of use when coaches oversees user's workouts, programs and metrics"
  }

  %%— Identity Extensions —
  USER_PASSWORD_RESET {
    UUID id PK                         "NOT NULL"
    UUID user_id FK                    "NOT NULL; references USER.id"
    VARCHAR reset_token                "NOT NULL, UNIQUE"
    TIMESTAMP requested_at             "NOT NULL"
    TIMESTAMP expires_at               "NOT NULL"
    BOOLEAN is_used                    "NOT NULL"
  }

  USER_SETTINGS {
    UUID user_id PK                    "NOT NULL; references USER.id"
    UUID settings_id PK                "NOT NULL; references SETTINGS.id"
  }

  %%— Categorical Tagging —
  USER_TAG {
    UUID user_id PK                    "NOT NULL; references USER.id"
    UUID tag_id PK                     "NOT NULL; references TAG.id"
  }

  USER_CATEGORY {
    UUID user_id PK                    "NOT NULL; references USER.id"
    UUID category_id PK                "NOT NULL; references CATEGORY.id"
  }

  %%— Internal Relationships —
  USER ||--o{ USER_PASSWORD_RESET : "can request resets"
  USER ||--|{ USER_SETTINGS       : "has settings"
  USER ||--|{ USER_TAG            : "has tags"
  USER ||--|| USER_CATEGORY       : "has a category"
```

## Notes

This diagram represents the core “user” and identity structure and relationships within the user domain.

---
*Generated from diagram extraction script*

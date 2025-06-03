# Core “Institution” Definition & Basic Metadata

**Section:** Institution
**Subsection:** Core “Institution” Definition & Basic Metadata

## Diagram

```mermaid
erDiagram
  %%=== Layer 1: Core Institution & Classification ===%%

  INSTITUTION {
    UUID id PK             "NOT NULL"
    VARCHAR(255) name      "NOT NULL; DEFAULT UNNAMED"
    TIMESTAMP created_at   "NOT NULL"
    TIMESTAMP updated_at
    BOOLEAN is_active      "DEFAULT true"
    UUID visibility_id FK  "NOT NULL; references VISIBILITY.id"
    UUID created_by FK                 "NOT NULL; references USER.id"
    UUID updated_by FK                 "NULLABLE; references USER.id"
  }

  INSTITUTION_SETTING {
    UUID id PK                         "NOT NULL; UNIQUE"
    UUID institution_id FK             "NOT NULL; references INSTITUTION.id"
    UUID setting_id FK                 "NOT NULL; references SETTING.id"
    JSONB value                        "NOT NULL"
    BOOLEAN overrides_system           "NOT NULL; DEFAULT false"
    UUID set_by FK                     "NOT NULL; references USER.id"
    TIMESTAMP set_at                   "NOT NULL; DEFAULT now()"
    TIMESTAMP updated_at               "NOT NULL"
  }

  INSTITUTION_CATEGORY {
    UUID institution_id PK,FK    "NOT NULL; references INSTITUTION.id"
    UUID category_id PK,FK       "NOT NULL; references CATEGORY.id"
  }

  INSTITUTION_TAG {
    UUID institution_id PK,FK    "NOT NULL; references INSTITUTION.id"
    UUID tag_id PK,FK            "NOT NULL; references TAG.id"
  }

  %%— Relationships in Layer 1 —
  INSTITUTION ||--|{ INSTITUTION_CATEGORY : "categorized by"
  INSTITUTION ||--o{ INSTITUTION_TAG      : "tagged with"
```

## Notes

This diagram represents the core “institution” definition & basic metadata structure and relationships within the program domain.

---
*Generated from diagram extraction script*

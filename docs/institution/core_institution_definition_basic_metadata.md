# Core “Institution” Definition & Basic Metadata

**Section:** Program
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
    BOOLEAN is_active      "DEFAULT TRUE"
    UUID visibility_id FK  "NOT NULL; references VISIBILITY.id"
  }

  INSTITUTION_CATEGORY {
    UUID institution_id PK    "NOT NULL; references INSTITUTION.id"
    UUID category_id PK       "NOT NULL; references CATEGORY.id"
  }

  INSTITUTION_TAG {
    UUID institution_id PK    "NOT NULL; references INSTITUTION.id"
    UUID tag_id PK            "NOT NULL; references TAG.id"
  }

  %%— Relationships in Layer 1 —
  INSTITUTION ||--|{ INSTITUTION_CATEGORY : "categorized by"
  INSTITUTION ||--o{ INSTITUTION_TAG      : "tagged with"
```

## Notes

This diagram represents the core “institution” definition & basic metadata structure and relationships within the program domain.

---
*Generated from diagram extraction script*

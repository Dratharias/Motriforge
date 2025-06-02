# Core "Favorite" Definition & Classification

**Section:** Favorite
**Subsection:** Core "Favorite" Definition & Classification

## Diagram

```mermaid
erDiagram
  %%=== Layer 1: Core Favorite & Classification ===%%

  FAVORITE {
    UUID id PK                         "NOT NULL; UNIQUE"
    UUID user_id FK                    "NOT NULL; references USER.id"
    UUID resource_id                   "NOT NULL; polymorphic resource reference"
    ENUM resource_type                 "NOT NULL; WORKOUT, EXERCISE, PROGRAM, EQUIPMENT, MEDIA, INSTITUTION"
    TEXT notes                         "NULLABLE; personal notes about why it's favorited"
    TIMESTAMP favorited_at             "NOT NULL; DEFAULT now()"
    TIMESTAMP last_accessed_at         "NULLABLE; when last viewed/used"
    INT access_count                   "NOT NULL; DEFAULT 0"
    BOOLEAN is_active                  "NOT NULL; DEFAULT true"
    UUID visibility_id FK              "NOT NULL; references VISIBILITY.id"
  }

  FAVORITE_CATEGORY {
    UUID favorite_id PK                "NOT NULL; references FAVORITE.id"
    UUID category_id PK                "NOT NULL; references CATEGORY.id"
  }

  FAVORITE_TAG {
    UUID favorite_id PK                "NOT NULL; references FAVORITE.id"
    UUID tag_id PK                     "NOT NULL; references TAG.id"
  }

  %%— Relationships in Layer 1 —
  FAVORITE ||--o{ FAVORITE_CATEGORY   : "categorized by"
  FAVORITE ||--o{ FAVORITE_TAG        : "tagged with"
  FAVORITE_CATEGORY }|--|| CATEGORY   : "category lookup"
  FAVORITE_TAG }|--|| TAG             : "tag lookup"

```

## Notes

This diagram represents the core "favorite" definition & classification structure and relationships within the favorite domain.

---
*Generated from diagram extraction script*

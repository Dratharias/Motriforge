# Versions, Media & Extensions

**Section:** Program
**Subsection:** Versions, Media & Extensions

## Diagram

```mermaid
erDiagram
  %%=== Layer 3: Versions, Media & Extensions ===%%

  PROGRAM_VERSION {
    UUID id PK                               "NOT NULL"
    UUID program_id FK                       "NOT NULL; references PROGRAM.id"
    SMALLINT version_number                  "NOT NULL; DEFAULT 0"
    VARCHAR(255) reason                      "NULLABLE; Short description"
    TIMESTAMP created_at                     "NOT NULL; DEFAULT now()"
    JSONB snapshot_data                      "NOT NULL"
    BOOLEAN is_active                        "NOT NULL"
  }

  PROGRAM_MEDIA {
    UUID id PK                               "NOT NULL"
    UUID program_id FK                       "NOT NULL; references PROGRAM.id"
    UUID media_id FK                         "NOT NULL; references MEDIA.id"
    TIMESTAMP added_at                       "NOT NULL; DEFAULT now()"
  }

  %%— Relationships in Layer 3 —
  PROGRAM ||--o{ PROGRAM_VERSION : "version history"
  PROGRAM ||--o{ PROGRAM_MEDIA   : "has media"
  PROGRAM_MEDIA ||--|| MEDIA      : "media lookup"

```

## Notes

This diagram represents the versions, media & extensions structure and relationships within the program domain.

---
*Generated from diagram extraction script*

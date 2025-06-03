# User Roles & Permissions (Access Control)

**Section:** User
**Subsection:** User Roles & Permissions (Access Control)

## Diagram

```mermaid
erDiagram
  %%=== Layer 2: Roles, Permissions, and Sharing ===%%

  %%— Many-to-many between USER and ROLE/ PERMISSION —
  USER_ROLE {
    UUID user_id PK                "NOT NULL; references USER.id"
    UUID role_id PK                "NOT NULL; references ROLE.id"
    UUID updated_by FK               "NULLABLE; references USER.id; DEFAULT NULL"
    TIMESTAMP created_at            "NOT NULL; DEFAULT now()"
    TIMESTAMP updated_at             "NOT NULL; DEFAULT now()"
    BOOLEAN is_active                "NOT NULL; DEFAULT true"
  }

  USER_PERMISSION {
    UUID user_id PK                "NOT NULL; references USER.id"
    UUID permission_id PK          "NOT NULL; references PERMISSION.id"
    UUID updated_by FK                "NOT NULL; references USER.id"
    TIMESTAMP updated_at             "NOT NULL; DEFAULT now()"
    BOOLEAN is_active                "NOT NULL; DEFAULT true"
  }

  %%— Sharing and Invites —
  USER_SHARE_INVITE {
    UUID id PK                        "NOT NULL; UNIQUE"
    UUID invited_by FK                "NOT NULL; references USER.id"
    VARCHAR invitee_email             "NOT NULL"
    UUID program_id FK                "NULLABLE; references PROGRAM.id; DEFAULT NULL"
    UUID workout_id FK                "NULLABLE; references WORKOUT.id; DEFAULT NULL"
    TEXT message                      "NULLABLE"
    UUID token                        "NOT NULL; UNIQUE"
    TIMESTAMP sent_at                 "NOT NULL; DEFAULT now()"
    TIMESTAMP accepted_at             "NULLABLE"
    TIMESTAMP expires_at              "DEFAULT (now() + interval '7 days')"
    BOOLEAN is_active                 "DEFAULT true"
    BOOLEAN is_revoked                "DEFAULT false"
  }

  USER_SHARE_INVITE_CATEGORY {
    UUID user_share_invite_id PK,FK "NOT NULL; references USER_SHARE_INVITE.id"
    UUID category_id PK,FK          "NOT NULL; references CATEGORY.id"
  }

  %%— Relationships —
  USER ||--|{ USER_ROLE             : "has roles"
  USER ||--|{ USER_PERMISSION       : "has permissions"
  USER ||--o{ USER_SHARE_INVITE     : "sends share invites"
  USER_SHARE_INVITE ||--|{ USER_SHARE_INVITE_CATEGORY : "limits to categories"
  USER_SHARE_INVITE ||--|| PROGRAM  : "optional program reference"
  USER_SHARE_INVITE ||--|| WORKOUT  : "optional workout reference"
  USER_ROLE ||--|| ROLE : "role lookup"
  USER_PERMISSION }|--|{ PERMISSION : "permission lookup"
	
```

## Notes

This diagram represents the user roles & permissions (access control) structure and relationships within the user domain.

---
*Generated from diagram extraction script*

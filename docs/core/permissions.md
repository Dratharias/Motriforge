# Permissions & Access Control
```mermaid
erDiagram
    ROLE {
        UUID id PK
        VARCHAR(100) name "NOT NULL UNIQUE"
        VARCHAR(255) display_name "NOT NULL"
        TEXT description "NULLABLE LENGTH 1000"
        SMALLINT level "NOT NULL DEFAULT 0"
        UUID created_by FK "NOT NULL"
        TIMESTAMP created_at "NOT NULL DEFAULT now()"
        BOOLEAN is_active "NOT NULL DEFAULT true"
    }
    PERMISSION {
        UUID id PK
        VARCHAR(100) name "NOT NULL UNIQUE"
        VARCHAR(255) display_name "NOT NULL"
        TEXT description "NULLABLE LENGTH 1000"
        VARCHAR(50) resource "NOT NULL"
        VARCHAR(50) action "NOT NULL"
        UUID created_by FK "NOT NULL"
        TIMESTAMP created_at "NOT NULL DEFAULT now()"
        BOOLEAN is_active "NOT NULL DEFAULT true"
    }
    ROLE_PERMISSION {
        UUID role_id PK FK "NOT NULL"
        UUID permission_id PK FK "NOT NULL"
        UUID created_by FK "NOT NULL"
        TIMESTAMP created_at "NOT NULL DEFAULT now()"
        BOOLEAN is_active "NOT NULL DEFAULT true"
    }
    USER_ROLE {
        UUID user_id PK FK "NOT NULL"
        UUID role_id PK FK "NOT NULL"
        UUID scope_id "NULLABLE"
        ENUM scope_type "NULLABLE"
        UUID assigned_by FK "NOT NULL"
        TIMESTAMP assigned_at "NOT NULL DEFAULT now()"
        TIMESTAMP expires_at "NULLABLE"
        BOOLEAN is_active "NOT NULL DEFAULT true"
    }
    USER_PERMISSION {
        UUID user_id PK FK "NOT NULL"
        UUID permission_id PK FK "NOT NULL"
        UUID scope_id "NULLABLE"
        ENUM scope_type "NULLABLE"
        UUID granted_by FK "NOT NULL"
        TIMESTAMP granted_at "NOT NULL DEFAULT now()"
        TIMESTAMP expires_at "NULLABLE"
        BOOLEAN is_active "NOT NULL DEFAULT true"
    }
    ROLE ||--o{ ROLE_PERMISSION : "has"
    PERMISSION ||--o{ ROLE_PERMISSION : "granted_to"
    USER ||--o{ USER_ROLE : "has_roles"
    USER ||--o{ USER_PERMISSION : "has_permissions"
    USER_ROLE }|--|| ROLE : "role"
    USER_PERMISSION }|--|| PERMISSION : "permission"
```


# Access Control, Policies & Invites
**Section:** Institution
**Subsection:** Access Control, Policies & Invites

## Diagram
```mermaid
erDiagram
  %%=== Layer 3: Access Control, Policies & Invites ===%%
  
  %%— Institution Policy Management —
  INSTITUTION_POLICY {
    UUID id PK                         "NOT NULL; UNIQUE"
    UUID institution_id FK             "NOT NULL; references INSTITUTION.id"
    UUID policy_id FK                  "NOT NULL; references POLICY.id"
    UUID scope_id                      "NULLABLE; department_id or resource_id"
    ENUM scope_type                    "NULLABLE; DEPARTMENT, RESOURCE, GLOBAL"
    UUID created_by FK                 "NOT NULL; references USER.id"
    UUID updated_by FK                 "NULLABLE; references USER.id"
    TIMESTAMP created_at               "NOT NULL; DEFAULT now()"
    TIMESTAMP updated_at               "NOT NULL; DEFAULT now()"
    BOOLEAN is_active                  "NOT NULL; DEFAULT true"
  }
  
  %%— Institution Invitation System —
  INSTITUTION_INVITE {
    UUID id PK                         "NOT NULL; UNIQUE"
    UUID institution_id FK             "NOT NULL; references INSTITUTION.id"
    UUID invited_by FK                 "NOT NULL; references USER.id"
    VARCHAR(255) email                 "NOT NULL"
    UUID relationship_type_id FK       "NOT NULL; references RELATIONSHIP_TYPE.id"
    UUID department_id FK              "NULLABLE; references INSTITUTION_DEPARTMENT.id"
    UUID role_id FK                    "NULLABLE; references ROLE.id"
    TEXT message                       "NULLABLE"
    VARCHAR(255) invite_token          "NOT NULL; UNIQUE"
    UUID created_by FK                 "NOT NULL; references USER.id"
    UUID updated_by FK                 "NULLABLE; references USER.id"
    TIMESTAMP sent_at                  "NOT NULL; DEFAULT now()"
    TIMESTAMP accepted_at              "NULLABLE"
    TIMESTAMP expires_at               "NOT NULL; DEFAULT (now() + interval '7 days')"
    TIMESTAMP created_at               "NOT NULL; DEFAULT now()"
    TIMESTAMP updated_at               "NOT NULL; DEFAULT now()"
    BOOLEAN is_active                  "NOT NULL; DEFAULT true"
    BOOLEAN is_revoked                 "NOT NULL; DEFAULT false"
  }
  
  INSTITUTION_INVITATION_CATEGORY {
    UUID invitation_id PK,FK           "NOT NULL; references INSTITUTION_INVITE.id"
    UUID category_id PK,FK             "NOT NULL; references CATEGORY.id"
    UUID created_by FK                 "NOT NULL; references USER.id"
    UUID updated_by FK                 "NULLABLE; references USER.id"
    TIMESTAMP created_at               "NOT NULL; DEFAULT now()"
    TIMESTAMP updated_at               "NOT NULL; DEFAULT now()"
    BOOLEAN is_active                  "NOT NULL; DEFAULT true"
  }
  
  %%— Institution Access Control Logs —
  INSTITUTION_ACCESS_LOG {
    UUID id PK                         "NOT NULL; UNIQUE"
    UUID institution_id FK             "NOT NULL; references INSTITUTION.id"
    UUID user_id FK                    "NULLABLE; references USER.id"
    UUID resource_id                   "NULLABLE; accessed resource ID"
    ENUM resource_type                 "NULLABLE; WORKOUT, PROGRAM, EXERCISE, MEMBER, etc."
    ENUM access_type                   "NOT NULL; VIEW, CREATE, UPDATE, DELETE, SHARE"
    UUID permission_id FK              "NULLABLE; references PERMISSION.id"
    BOOLEAN access_granted             "NOT NULL"
    TEXT denial_reason                 "NULLABLE"
    VARCHAR(45) ip_address             "NULLABLE"
    VARCHAR(500) user_agent            "NULLABLE"
    UUID session_id                    "NULLABLE"
    TIMESTAMP accessed_at              "NOT NULL; DEFAULT now()"
  }
  
  %%— Institution Security Events —
  INSTITUTION_SECURITY_EVENT {
    UUID id PK                         "NOT NULL; UNIQUE"
    UUID institution_id FK             "NOT NULL; references INSTITUTION.id"
    UUID user_id FK                    "NULLABLE; references USER.id"
    ENUM event_type                    "NOT NULL; UNAUTHORIZED_ACCESS, PERMISSION_ESCALATION, SUSPICIOUS_ACTIVITY"
    ENUM severity                      "NOT NULL; LOW, MEDIUM, HIGH, CRITICAL"
    TEXT event_description             "NOT NULL"
    JSONB event_details                "NULLABLE; specific event data"
    VARCHAR(45) ip_address             "NULLABLE"
    VARCHAR(500) user_agent            "NULLABLE"
    UUID reviewed_by FK                "NULLABLE; references USER.id"
    TIMESTAMP reviewed_at              "NULLABLE"
    BOOLEAN requires_action            "NOT NULL; DEFAULT false"
    TIMESTAMP occurred_at              "NOT NULL; DEFAULT now()"
  }
  
  %%— Institution Role Templates —
  INSTITUTION_ROLE_TEMPLATE {
    UUID id PK                         "NOT NULL; UNIQUE"
    UUID institution_id FK             "NOT NULL; references INSTITUTION.id"
    VARCHAR(100) template_name         "NOT NULL"
    TEXT description                   "NULLABLE"
    JSONB role_configuration           "NOT NULL; roles and permissions"
    UUID created_by FK                 "NOT NULL; references USER.id"
    UUID updated_by FK                 "NULLABLE; references USER.id"
    TIMESTAMP created_at               "NOT NULL; DEFAULT now()"
    TIMESTAMP updated_at               "NOT NULL; DEFAULT now()"
    BOOLEAN is_active                  "NOT NULL; DEFAULT true"
  }
  
  INSTITUTION_ROLE_TEMPLATE_ROLE {
    UUID template_id PK,FK             "NOT NULL; references INSTITUTION_ROLE_TEMPLATE.id"
    UUID role_id PK,FK                 "NOT NULL; references ROLE.id"
    BOOLEAN is_default                 "NOT NULL; DEFAULT false"
    UUID created_by FK                 "NOT NULL; references USER.id"
    UUID updated_by FK                 "NULLABLE; references USER.id"
    TIMESTAMP created_at               "NOT NULL; DEFAULT now()"
    TIMESTAMP updated_at               "NOT NULL; DEFAULT now()"
    BOOLEAN is_active                  "NOT NULL; DEFAULT true"
  }
  
  %%— Relationships —
  INSTITUTION ||--o{ INSTITUTION_POLICY : "defines policies"
  POLICY ||--o{ INSTITUTION_POLICY : "applied to institutions"
  
  INSTITUTION ||--o{ INSTITUTION_INVITE : "sends invites"
  USER ||--o{ INSTITUTION_INVITE : "creates invites"
  RELATIONSHIP_TYPE ||--o{ INSTITUTION_INVITE : "invite type"
  INSTITUTION_DEPARTMENT ||--o{ INSTITUTION_INVITE : "department invites"
  ROLE ||--o{ INSTITUTION_INVITE : "role invites"
  INSTITUTION_INVITE ||--o{ INSTITUTION_INVITATION_CATEGORY : "categorized invites"
  INSTITUTION_INVITATION_CATEGORY }|--|| CATEGORY : "category lookup"
  
  INSTITUTION ||--o{ INSTITUTION_ACCESS_LOG : "access tracking"
  USER ||--o{ INSTITUTION_ACCESS_LOG : "user access"
  PERMISSION ||--o{ INSTITUTION_ACCESS_LOG : "permission used"
  
  INSTITUTION ||--o{ INSTITUTION_SECURITY_EVENT : "security events"
  USER ||--o{ INSTITUTION_SECURITY_EVENT : "user events"
  USER ||--o{ INSTITUTION_SECURITY_EVENT : "reviewed by"
  
  INSTITUTION ||--o{ INSTITUTION_ROLE_TEMPLATE : "role templates"
  USER ||--o{ INSTITUTION_ROLE_TEMPLATE : "creates templates"
  INSTITUTION_ROLE_TEMPLATE ||--o{ INSTITUTION_ROLE_TEMPLATE_ROLE : "template roles"
  INSTITUTION_ROLE_TEMPLATE_ROLE }|--|| ROLE : "role lookup"
```

## Notes
This diagram represents the access control, policies & invites structure with unified permission management and comprehensive audit trails within the institution domain.

---
*Generated from diagram extraction script*
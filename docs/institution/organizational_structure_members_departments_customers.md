# Organizational Structure (Members, Departments, Customers)
**Section:** Institution
**Subsection:** Organizational Structure (Members, Departments, Customers)

## Diagram
```mermaid
erDiagram
  %%=== Layer 2: Organizational Structure - FIXED ===%%
  %%— User-Institution Relationship Foundation —
  USER_INSTITUTION_RELATIONSHIP {
    UUID id PK                           "NOT NULL; UNIQUE"
    UUID user_id FK                      "NOT NULL; references USER.id"
    UUID institution_id FK               "NOT NULL; references INSTITUTION.id"
    UUID relationship_type_id FK         "NOT NULL; references RELATIONSHIP_TYPE.id"
    UUID role_id FK                      "NULLABLE; references ROLE.id"
    UUID created_by_user_id FK           "NOT NULL; references USER.id"
    UUID updated_by_user_id FK           "NULLABLE; references USER.id"
    TIMESTAMP started_at                 "NOT NULL; DEFAULT now()"
    TIMESTAMP ended_at                   "NULLABLE"
    TIMESTAMP created_at                 "NOT NULL; DEFAULT now()"
    TIMESTAMP updated_at                 "NOT NULL; DEFAULT now()"
    BOOLEAN is_active                    "NOT NULL; DEFAULT true"
    UNIQUE(user_id, institution_id, relationship_type_id) "Business constraint: one relationship type per user per institution"
  }
  
  RELATIONSHIP_TYPE {
    UUID id PK                           "NOT NULL; UNIQUE"
    ENUM name                            "NOT NULL; UNIQUE; CHECK (name IN ('CUSTOMER', 'MEMBER', 'COACH', 'TRAINER', 'ADMIN', 'GUEST', 'PHYSIOTHERAPIST'))"
    TEXT description                     "NULLABLE"
    BOOLEAN requires_approval            "NOT NULL; DEFAULT false"
    BOOLEAN is_billable                  "NOT NULL; DEFAULT false"
    UUID created_by_user_id FK           "NOT NULL; references USER.id"
    UUID updated_by_user_id FK           "NULLABLE; references USER.id"
    TIMESTAMP created_at                 "NOT NULL; DEFAULT now()"
    TIMESTAMP updated_at                 "NOT NULL; DEFAULT now()"
    BOOLEAN is_active                    "NOT NULL; DEFAULT true"
  }
  
  INSTITUTION_DEPARTMENT {
    UUID id PK                           "NOT NULL; UNIQUE"
    UUID institution_id FK               "NOT NULL; references INSTITUTION.id"
    VARCHAR(100) name                    "NOT NULL"
    TEXT description                     "NULLABLE"
    UUID parent_department_id FK         "NULLABLE; references INSTITUTION_DEPARTMENT.id; CHECK (parent_department_id != id)"
    SMALLINT hierarchy_level             "NOT NULL; DEFAULT 0; CHECK (hierarchy_level >= 0 AND hierarchy_level <= 10)"
    VARCHAR(500) hierarchy_path          "NOT NULL; materialized path for efficient queries"
    UUID created_by_user_id FK           "NOT NULL; references USER.id"
    UUID updated_by_user_id FK           "NULLABLE; references USER.id"
    TIMESTAMP created_at                 "NOT NULL; DEFAULT now()"
    TIMESTAMP updated_at                 "NOT NULL; DEFAULT now()"
    BOOLEAN is_active                    "NOT NULL; DEFAULT true"
    UNIQUE(institution_id, name)         "Business constraint: unique department names within institution"
  }
  
  DEPARTMENT_HEAD_ASSIGNMENT {
    UUID id PK                           "NOT NULL; UNIQUE"
    UUID institution_department_id FK    "NOT NULL; references INSTITUTION_DEPARTMENT.id"
    UUID institution_member_id FK        "NOT NULL; references INSTITUTION_MEMBER.id"
    UUID assigned_by_user_id FK          "NOT NULL; references USER.id"
    TIMESTAMP assigned_at                "NOT NULL; DEFAULT now()"
    TIMESTAMP ends_at                    "NULLABLE"
    BOOLEAN is_active                    "NOT NULL; DEFAULT true"
    UNIQUE(institution_department_id, assigned_at) "Business constraint: one active head per department"
  }
  
  %%— Members & Roles —
  INSTITUTION_MEMBER {
    UUID id PK                           "NOT NULL; UNIQUE"
    UUID user_institution_relationship_id FK "NOT NULL; references USER_INSTITUTION_RELATIONSHIP.id"
    UUID institution_department_id FK    "NULLABLE; references INSTITUTION_DEPARTMENT.id"
    VARCHAR(50) employee_id              "NULLABLE; institution-specific employee ID"
    VARCHAR(100) job_title               "NULLABLE"
    UUID created_by_user_id FK           "NOT NULL; references USER.id"
    UUID updated_by_user_id FK           "NULLABLE; references USER.id"
    TIMESTAMP joined_at                  "NOT NULL; DEFAULT now()"
    TIMESTAMP created_at                 "NOT NULL; DEFAULT now()"
    TIMESTAMP updated_at                 "NOT NULL; DEFAULT now()"
    BOOLEAN is_active                    "NOT NULL; DEFAULT true"
  }
  
  INSTITUTION_CUSTOMER {
    UUID id PK                           "NOT NULL; UNIQUE"
    UUID user_institution_relationship_id FK "NOT NULL; references USER_INSTITUTION_RELATIONSHIP.id"
    VARCHAR(50) customer_number          "NULLABLE; institution-specific customer ID"
    UUID subscription_id FK              "NULLABLE; references SUBSCRIPTION.id"
    UUID primary_contact_member_id FK    "NULLABLE; references INSTITUTION_MEMBER.id"
    UUID created_by_user_id FK           "NOT NULL; references USER.id"
    UUID updated_by_user_id FK           "NULLABLE; references USER.id"
    TIMESTAMP linked_at                  "NOT NULL; DEFAULT now()"
    TIMESTAMP created_at                 "NOT NULL; DEFAULT now()"
    TIMESTAMP updated_at                 "NOT NULL; DEFAULT now()"
    BOOLEAN is_active                    "NOT NULL; DEFAULT true"
  }
  
  %%— Member Role Assignments —
  INSTITUTION_MEMBER_ROLE {
    UUID institution_member_id PK,FK    "NOT NULL; references INSTITUTION_MEMBER.id"
    UUID role_id PK,FK                   "NOT NULL; references ROLE.id"
    UUID created_by_user_id FK           "NOT NULL; references USER.id"
    UUID updated_by_user_id FK           "NULLABLE; references USER.id"
    TIMESTAMP created_at                 "NOT NULL; DEFAULT now()"
    TIMESTAMP updated_at                 "NOT NULL; DEFAULT now()"
    BOOLEAN is_active                    "NOT NULL; DEFAULT true"
  }
  
  INSTITUTION_PERMISSION_GRANT {
    UUID id PK                           "NOT NULL; UNIQUE"
    UUID grantee_id                      "NOT NULL; references INSTITUTION_MEMBER.id or INSTITUTION_DEPARTMENT.id"
    ENUM grantee_type                    "NOT NULL; CHECK (grantee_type IN ('MEMBER', 'DEPARTMENT'))"
    UUID permission_id FK                "NOT NULL; references PERMISSION.id"
    UUID scope_id                        "NULLABLE; department_id or resource_id"
    ENUM scope_type                      "NULLABLE; CHECK (scope_type IN ('DEPARTMENT', 'RESOURCE', 'GLOBAL'))"
    UUID granted_by_user_id FK           "NOT NULL; references USER.id"
    UUID created_by_user_id FK           "NOT NULL; references USER.id"
    UUID updated_by_user_id FK           "NULLABLE; references USER.id"
    TIMESTAMP granted_at                 "NOT NULL; DEFAULT now()"
    TIMESTAMP expires_at                 "NULLABLE"
    TIMESTAMP created_at                 "NOT NULL; DEFAULT now()"
    TIMESTAMP updated_at                 "NOT NULL; DEFAULT now()"
    BOOLEAN is_active                    "NOT NULL; DEFAULT true"
  }
  
  %%— Relationships —
  USER ||--o{ USER_INSTITUTION_RELATIONSHIP : "has institution relationships"
  INSTITUTION ||--o{ USER_INSTITUTION_RELATIONSHIP : "has user relationships"
  USER_INSTITUTION_RELATIONSHIP }|--|| RELATIONSHIP_TYPE : "relationship type"
  USER_INSTITUTION_RELATIONSHIP }o--|| ROLE : "optional role"
  USER_INSTITUTION_RELATIONSHIP ||--o{ INSTITUTION_MEMBER : "member details"
  USER_INSTITUTION_RELATIONSHIP ||--o{ INSTITUTION_CUSTOMER : "customer details"
  
  INSTITUTION ||--o{ INSTITUTION_DEPARTMENT : "has departments"
  INSTITUTION_DEPARTMENT ||--o{ INSTITUTION_DEPARTMENT : "parent department"
  INSTITUTION_DEPARTMENT ||--o{ INSTITUTION_MEMBER : "department members"
  INSTITUTION_DEPARTMENT ||--o{ DEPARTMENT_HEAD_ASSIGNMENT : "head assignments"
  DEPARTMENT_HEAD_ASSIGNMENT }|--|| INSTITUTION_MEMBER : "department head"
  
  INSTITUTION_MEMBER ||--o{ INSTITUTION_MEMBER_ROLE : "assigned roles"
  INSTITUTION_MEMBER_ROLE }|--|| ROLE : "role lookup"
  
  INSTITUTION_MEMBER ||--o{ INSTITUTION_PERMISSION_GRANT : "member permissions"
  INSTITUTION_DEPARTMENT ||--o{ INSTITUTION_PERMISSION_GRANT : "department permissions"
  INSTITUTION_PERMISSION_GRANT }|--|| PERMISSION : "permission lookup"
  
  INSTITUTION_CUSTOMER }o--|| SUBSCRIPTION : "subscription link"
  INSTITUTION_CUSTOMER }o--|| INSTITUTION_MEMBER : "primary contact"
```

## Notes
This diagram represents the organizational structure (members, departments, customers) with proper joint tables and standardized naming conventions within the institution domain.

---
*Generated from diagram extraction script*
# Organizational Structure (Members, Departments, Customers)
**Section:** Institution
**Subsection:** Organizational Structure (Members, Departments, Customers)

## Diagram
```mermaid
erDiagram
  %%=== Layer 2: Organizational Structure ===%%
  
  %%— Core Relationship Type Management —
  RELATIONSHIP_TYPE {
    UUID id PK                           "NOT NULL; UNIQUE"
    ENUM name                            "NOT NULL; UNIQUE; CHECK (name IN ('CUSTOMER', 'MEMBER', 'COACH', 'TRAINER', 'ADMIN', 'GUEST', 'PHYSIOTHERAPIST', 'MANAGER', 'OWNER'))"
    VARCHAR(255) display_name            "NOT NULL"
    TEXT description                     "NULLABLE"
    BOOLEAN requires_approval            "NOT NULL; DEFAULT false"
    BOOLEAN is_billable                  "NOT NULL; DEFAULT false"
    BOOLEAN can_manage_others            "NOT NULL; DEFAULT false"
    BOOLEAN has_department_access        "NOT NULL; DEFAULT false"
    SMALLINT hierarchy_level             "NOT NULL; DEFAULT 0; CHECK (hierarchy_level >= 0 AND hierarchy_level <= 10); 0=lowest, 10=highest"
    UUID created_by_user_id FK           "NOT NULL; references USER.id"
    UUID updated_by_user_id FK           "NULLABLE; references USER.id"
    TIMESTAMP created_at                 "NOT NULL; DEFAULT now()"
    TIMESTAMP updated_at                 "NOT NULL; DEFAULT now()"
    BOOLEAN is_active                    "NOT NULL; DEFAULT true"
  }
  
  %%— User-Institution Relationship Foundation —
  USER_INSTITUTION_RELATIONSHIP {
    UUID id PK                           "NOT NULL; UNIQUE"
    UUID user_id FK                      "NOT NULL; references USER.id"
    UUID institution_id FK               "NOT NULL; references INSTITUTION.id"
    UUID relationship_type_id FK         "NOT NULL; references RELATIONSHIP_TYPE.id"
    UUID primary_role_id FK              "NULLABLE; references ROLE.id; main role for this relationship"
    ENUM relationship_status             "NOT NULL; DEFAULT 'ACTIVE'; CHECK (relationship_status IN ('PENDING', 'ACTIVE', 'SUSPENDED', 'TERMINATED', 'EXPIRED'))"
    UUID approved_by_user_id FK          "NULLABLE; references USER.id; who approved this relationship"
    UUID created_by_user_id FK           "NOT NULL; references USER.id"
    UUID updated_by_user_id FK           "NULLABLE; references USER.id"
    TIMESTAMP started_at                 "NOT NULL; DEFAULT now()"
    TIMESTAMP ended_at                   "NULLABLE"
    TIMESTAMP approved_at                "NULLABLE"
    TIMESTAMP created_at                 "NOT NULL; DEFAULT now()"
    TIMESTAMP updated_at                 "NOT NULL; DEFAULT now()"
    BOOLEAN is_active                    "NOT NULL; DEFAULT true"
    UNIQUE user_institution_type         "(user_id, institution_id, relationship_type_id); Business constraint: one relationship type per user per institution"
    INDEX idx_user_inst_rel_status       "(user_id, institution_id, relationship_status)"
    INDEX idx_inst_rel_type              "(institution_id, relationship_type_id, relationship_status)"
  }
  
  %%— Department Hierarchy with Management —
  INSTITUTION_DEPARTMENT {
    UUID id PK                           "NOT NULL; UNIQUE"
    UUID institution_id FK               "NOT NULL; references INSTITUTION.id"
    VARCHAR(100) name                    "NOT NULL"
    VARCHAR(100) code                    "NULLABLE; unique department code within institution"
    TEXT description                     "NULLABLE"
    UUID parent_department_id FK         "NULLABLE; references INSTITUTION_DEPARTMENT.id; CHECK (parent_department_id != id)"
    SMALLINT hierarchy_level             "NOT NULL; DEFAULT 0; CHECK (hierarchy_level >= 0 AND hierarchy_level <= 10)"
    VARCHAR(500) hierarchy_path          "NOT NULL; materialized path for efficient queries; FORMAT: '/1/2/3/'"
    ENUM department_type                 "NOT NULL; DEFAULT 'OPERATIONAL'; CHECK (department_type IN ('OPERATIONAL', 'ADMINISTRATIVE', 'CLINICAL', 'TRAINING', 'FACILITIES', 'FINANCE'))"
    BOOLEAN is_billable_unit             "NOT NULL; DEFAULT false"
    BOOLEAN allows_public_access         "NOT NULL; DEFAULT false"
    JSONB contact_information            "NULLABLE; phone, email, location details"
    UUID created_by_user_id FK           "NOT NULL; references USER.id"
    UUID updated_by_user_id FK           "NULLABLE; references USER.id"
    TIMESTAMP created_at                 "NOT NULL; DEFAULT now()"
    TIMESTAMP updated_at                 "NOT NULL; DEFAULT now()"
    BOOLEAN is_active                    "NOT NULL; DEFAULT true"
    UNIQUE inst_dept_name                "(institution_id, name); Business constraint: unique department names within institution"
    UNIQUE inst_dept_code                "(institution_id, code); Business constraint: unique department codes within institution WHERE code IS NOT NULL"
    INDEX idx_dept_hierarchy_path        "(hierarchy_path)"
    INDEX idx_dept_type                  "(institution_id, department_type, is_active)"
    CHECK hierarchy_path_level           "(hierarchy_level = (LENGTH(hierarchy_path) - LENGTH(REPLACE(hierarchy_path, '/', ''))) - 1)"
  }
  
  %%— Department Head Management with History —
  DEPARTMENT_HEAD_ASSIGNMENT {
    UUID id PK                           "NOT NULL; UNIQUE"
    UUID institution_department_id FK    "NOT NULL; references INSTITUTION_DEPARTMENT.id"
    UUID user_institution_relationship_id FK "NOT NULL; references USER_INSTITUTION_RELATIONSHIP.id"
    ENUM assignment_type                 "NOT NULL; DEFAULT 'PERMANENT'; CHECK (assignment_type IN ('PERMANENT', 'TEMPORARY', 'ACTING', 'INTERIM'))"
    UUID assigned_by_user_id FK          "NOT NULL; references USER.id"
    UUID replaced_assignment_id FK       "NULLABLE; references DEPARTMENT_HEAD_ASSIGNMENT.id; previous head assignment"
    TEXT assignment_reason               "NULLABLE"
    TIMESTAMP assigned_at                "NOT NULL; DEFAULT now()"
    TIMESTAMP effective_from             "NOT NULL; DEFAULT now()"
    TIMESTAMP effective_until            "NULLABLE"
    BOOLEAN is_active                    "NOT NULL; DEFAULT true"
    UNIQUE active_dept_head              "(institution_department_id, effective_from) WHERE is_active = true; Business constraint: one active head per department per period"
    INDEX idx_dept_head_active           "(institution_department_id, is_active, effective_from DESC)"
    CHECK effective_date_order           "(effective_until IS NULL OR effective_from < effective_until)"
  }
  
  %%— Member Management —
  INSTITUTION_MEMBER {
    UUID id PK                           "NOT NULL; UNIQUE"
    UUID user_institution_relationship_id FK "NOT NULL; references USER_INSTITUTION_RELATIONSHIP.id; UNIQUE"
    UUID primary_department_id FK        "NULLABLE; references INSTITUTION_DEPARTMENT.id"
    VARCHAR(50) employee_id              "NULLABLE; institution-specific employee identifier"
    VARCHAR(100) job_title               "NULLABLE"
    ENUM employment_type                 "NOT NULL; DEFAULT 'FULL_TIME'; CHECK (employment_type IN ('FULL_TIME', 'PART_TIME', 'CONTRACT', 'VOLUNTEER', 'INTERN', 'CONSULTANT'))"
    DECIMAL fte_percentage               "NOT NULL; DEFAULT 1.0; CHECK (fte_percentage > 0 AND fte_percentage <= 1.0); Full-Time Equivalent"
    DATE employment_start_date           "NOT NULL; DEFAULT CURRENT_DATE"
    DATE employment_end_date             "NULLABLE"
    JSONB emergency_contact              "NULLABLE; emergency contact information"
    JSONB work_schedule                  "NULLABLE; working hours and schedule details"
    UUID supervisor_member_id FK         "NULLABLE; references INSTITUTION_MEMBER.id; direct supervisor"
    UUID created_by_user_id FK           "NOT NULL; references USER.id"
    UUID updated_by_user_id FK           "NULLABLE; references USER.id"
    TIMESTAMP joined_at                  "NOT NULL; DEFAULT now()"
    TIMESTAMP created_at                 "NOT NULL; DEFAULT now()"
    TIMESTAMP updated_at                 "NOT NULL; DEFAULT now()"
    BOOLEAN is_active                    "NOT NULL; DEFAULT true"
    INDEX idx_member_dept                "(primary_department_id, is_active)"
    INDEX idx_member_supervisor          "(supervisor_member_id, is_active)"
    INDEX idx_member_employment          "(employment_type, is_active)"
    CHECK employment_date_order          "(employment_end_date IS NULL OR employment_start_date <= employment_end_date)"
  }
  
  %%— Customer Management —
  INSTITUTION_CUSTOMER {
    UUID id PK                           "NOT NULL; UNIQUE"
    UUID user_institution_relationship_id FK "NOT NULL; references USER_INSTITUTION_RELATIONSHIP.id; UNIQUE"
    VARCHAR(50) customer_number          "NULLABLE; institution-specific customer identifier"
    ENUM customer_type                   "NOT NULL; DEFAULT 'INDIVIDUAL'; CHECK (customer_type IN ('INDIVIDUAL', 'FAMILY', 'CORPORATE', 'GROUP', 'GUEST'))"
    UUID subscription_id FK              "NULLABLE; references SUBSCRIPTION.id"
    UUID primary_contact_member_id FK    "NULLABLE; references INSTITUTION_MEMBER.id; assigned account manager"
    DATE membership_start_date           "NOT NULL; DEFAULT CURRENT_DATE"
    DATE membership_end_date             "NULLABLE"
    BOOLEAN is_vip_customer             "NOT NULL; DEFAULT false"
    JSONB billing_preferences            "NULLABLE; billing contact and preferences"
    JSONB service_preferences            "NULLABLE; preferred services and settings"
    UUID referrer_customer_id FK         "NULLABLE; references INSTITUTION_CUSTOMER.id; who referred this customer"
    UUID created_by_user_id FK           "NOT NULL; references USER.id"
    UUID updated_by_user_id FK           "NULLABLE; references USER.id"
    TIMESTAMP linked_at                  "NOT NULL; DEFAULT now()"
    TIMESTAMP created_at                 "NOT NULL; DEFAULT now()"
    TIMESTAMP updated_at                 "NOT NULL; DEFAULT now()"
    BOOLEAN is_active                    "NOT NULL; DEFAULT true"
    INDEX idx_customer_type              "(customer_type, is_active)"
    INDEX idx_customer_contact           "(primary_contact_member_id, is_active)"
    INDEX idx_customer_vip               "(is_vip_customer, is_active) WHERE is_vip_customer = true"
    CHECK membership_date_order          "(membership_end_date IS NULL OR membership_start_date <= membership_end_date)"
  }
  
  %%— Multi-Role Assignment for Members —
  INSTITUTION_MEMBER_ROLE {
    UUID id PK                           "NOT NULL; UNIQUE"
    UUID institution_member_id FK        "NOT NULL; references INSTITUTION_MEMBER.id"
    UUID role_id FK                      "NOT NULL; references ROLE.id"
    UUID department_scope_id FK          "NULLABLE; references INSTITUTION_DEPARTMENT.id; role limited to specific department"
    BOOLEAN is_primary_role              "NOT NULL; DEFAULT false"
    TIMESTAMP role_assigned_at           "NOT NULL; DEFAULT now()"
    TIMESTAMP role_expires_at            "NULLABLE"
    UUID assigned_by_user_id FK          "NOT NULL; references USER.id"
    UUID created_by_user_id FK           "NOT NULL; references USER.id"
    UUID updated_by_user_id FK           "NULLABLE; references USER.id"
    TIMESTAMP created_at                 "NOT NULL; DEFAULT now()"
    TIMESTAMP updated_at                 "NOT NULL; DEFAULT now()"
    BOOLEAN is_active                    "NOT NULL; DEFAULT true"
    UNIQUE member_role_dept_combo        "(institution_member_id, role_id, department_scope_id); Business constraint: unique role per member per department scope"
    INDEX idx_member_role_primary        "(institution_member_id, is_primary_role) WHERE is_primary_role = true"
    INDEX idx_member_role_active         "(institution_member_id, is_active, role_assigned_at DESC)"
    CHECK role_expiry_order              "(role_expires_at IS NULL OR role_assigned_at < role_expires_at)"
  }
  
  %%— Department Member Assignments (Cross-Department Access) —
  INSTITUTION_DEPARTMENT_MEMBER {
    UUID id PK                           "NOT NULL; UNIQUE"
    UUID institution_department_id FK    "NOT NULL; references INSTITUTION_DEPARTMENT.id"
    UUID institution_member_id FK        "NOT NULL; references INSTITUTION_MEMBER.id"
    ENUM access_type                     "NOT NULL; DEFAULT 'MEMBER'; CHECK (access_type IN ('MEMBER', 'VISITOR', 'TEMPORARY', 'CONSULTANT'))"
    BOOLEAN can_manage_department        "NOT NULL; DEFAULT false"
    TIMESTAMP access_granted_at          "NOT NULL; DEFAULT now()"
    TIMESTAMP access_expires_at          "NULLABLE"
    UUID granted_by_user_id FK           "NOT NULL; references USER.id"
    UUID created_by_user_id FK           "NOT NULL; references USER.id"
    UUID updated_by_user_id FK           "NULLABLE; references USER.id"
    TIMESTAMP created_at                 "NOT NULL; DEFAULT now()"
    TIMESTAMP updated_at                 "NOT NULL; DEFAULT now()"
    BOOLEAN is_active                    "NOT NULL; DEFAULT true"
    UNIQUE dept_member_access            "(institution_department_id, institution_member_id); Business constraint: one access record per member per department"
    INDEX idx_dept_member_mgmt           "(institution_department_id, can_manage_department) WHERE can_manage_department = true"
    CHECK access_expiry_order            "(access_expires_at IS NULL OR access_granted_at < access_expires_at)"
  }
  
  %%— Permission Management —
  INSTITUTION_PERMISSION_GRANT {
    UUID id PK                           "NOT NULL; UNIQUE"
    UUID grantee_id                      "NOT NULL; references INSTITUTION_MEMBER.id or INSTITUTION_DEPARTMENT.id"
    ENUM grantee_type                    "NOT NULL; CHECK (grantee_type IN ('MEMBER', 'DEPARTMENT', 'ROLE'))"
    UUID permission_id FK                "NOT NULL; references PERMISSION.id"
    UUID scope_id                        "NULLABLE; department_id, resource_id, or institution_id"
    ENUM scope_type                      "NULLABLE; CHECK (scope_type IN ('DEPARTMENT', 'RESOURCE', 'INSTITUTION', 'GLOBAL'))"
    BOOLEAN is_inherited                 "NOT NULL; DEFAULT false; true if inherited from role or department"
    UUID inherited_from_id               "NULLABLE; source of inheritance if applicable"
    ENUM inherited_from_type             "NULLABLE; CHECK (inherited_from_type IN ('ROLE', 'DEPARTMENT', 'PARENT_DEPARTMENT'))"
    UUID granted_by_user_id FK           "NOT NULL; references USER.id"
    UUID created_by_user_id FK           "NOT NULL; references USER.id"
    UUID updated_by_user_id FK           "NULLABLE; references USER.id"
    TIMESTAMP granted_at                 "NOT NULL; DEFAULT now()"
    TIMESTAMP expires_at                 "NULLABLE"
    TIMESTAMP created_at                 "NOT NULL; DEFAULT now()"
    TIMESTAMP updated_at                 "NOT NULL; DEFAULT now()"
    BOOLEAN is_active                    "NOT NULL; DEFAULT true"
    UNIQUE grantee_permission_scope      "(grantee_id, grantee_type, permission_id, scope_id, scope_type); Business constraint: unique permission grant per scope"
    INDEX idx_perm_grant_grantee         "(grantee_type, grantee_id, is_active)"
    INDEX idx_perm_grant_scope           "(scope_type, scope_id, is_active)"
    INDEX idx_perm_grant_inherited       "(is_inherited, inherited_from_type, inherited_from_id) WHERE is_inherited = true"
    CHECK inheritance_consistency        "(is_inherited = false OR (inherited_from_id IS NOT NULL AND inherited_from_type IS NOT NULL))"
  }
  
  %%— Relationships —
  USER ||--o{ USER_INSTITUTION_RELATIONSHIP : "has_institution_relationships"
  INSTITUTION ||--o{ USER_INSTITUTION_RELATIONSHIP : "has_user_relationships"
  USER_INSTITUTION_RELATIONSHIP }|--|| RELATIONSHIP_TYPE : "relationship_type"
  USER_INSTITUTION_RELATIONSHIP }o--|| ROLE : "primary_role"
  USER_INSTITUTION_RELATIONSHIP }o--|| USER : "approved_by_user"
  
  USER_INSTITUTION_RELATIONSHIP ||--o{ INSTITUTION_MEMBER : "member_details"
  USER_INSTITUTION_RELATIONSHIP ||--o{ INSTITUTION_CUSTOMER : "customer_details"
  
  INSTITUTION ||--o{ INSTITUTION_DEPARTMENT : "has_departments"
  INSTITUTION_DEPARTMENT ||--o{ INSTITUTION_DEPARTMENT : "parent_department"
  INSTITUTION_DEPARTMENT ||--o{ INSTITUTION_MEMBER : "primary_department_members"
  INSTITUTION_DEPARTMENT ||--o{ INSTITUTION_DEPARTMENT_MEMBER : "department_member_access"
  INSTITUTION_DEPARTMENT ||--o{ DEPARTMENT_HEAD_ASSIGNMENT : "head_assignments"
  
  DEPARTMENT_HEAD_ASSIGNMENT }|--|| USER_INSTITUTION_RELATIONSHIP : "head_user_relationship"
  DEPARTMENT_HEAD_ASSIGNMENT }|--|| USER : "assigned_by_user"
  DEPARTMENT_HEAD_ASSIGNMENT }o--|| DEPARTMENT_HEAD_ASSIGNMENT : "replaced_assignment"
  
  INSTITUTION_MEMBER ||--o{ INSTITUTION_MEMBER : "supervisor_relationship"
  INSTITUTION_MEMBER ||--o{ INSTITUTION_MEMBER_ROLE : "assigned_roles"
  INSTITUTION_MEMBER ||--o{ INSTITUTION_DEPARTMENT_MEMBER : "department_access"
  INSTITUTION_MEMBER ||--o{ INSTITUTION_CUSTOMER : "managed_customers"
  
  INSTITUTION_MEMBER_ROLE }|--|| ROLE : "role_lookup"
  INSTITUTION_MEMBER_ROLE }o--|| INSTITUTION_DEPARTMENT : "department_scope"
  INSTITUTION_MEMBER_ROLE }|--|| USER : "assigned_by_user"
  
  INSTITUTION_DEPARTMENT_MEMBER }|--|| USER : "granted_by_user"
  
  INSTITUTION_CUSTOMER }o--|| SUBSCRIPTION : "subscription_link"
  INSTITUTION_CUSTOMER }o--|| INSTITUTION_CUSTOMER : "referrer_customer"
  
  INSTITUTION_PERMISSION_GRANT }|--|| PERMISSION : "permission_lookup"
  INSTITUTION_PERMISSION_GRANT }|--|| USER : "granted_by_user"
  
  %%— Standardized audit relationships
  RELATIONSHIP_TYPE }|--|| USER : "created_by_user"
  RELATIONSHIP_TYPE }o--|| USER : "updated_by_user"
  USER_INSTITUTION_RELATIONSHIP }|--|| USER : "created_by_user"
  USER_INSTITUTION_RELATIONSHIP }o--|| USER : "updated_by_user"
  INSTITUTION_DEPARTMENT }|--|| USER : "created_by_user"
  INSTITUTION_DEPARTMENT }o--|| USER : "updated_by_user"
  INSTITUTION_MEMBER }|--|| USER : "created_by_user"
  INSTITUTION_MEMBER }o--|| USER : "updated_by_user"
  INSTITUTION_CUSTOMER }|--|| USER : "created_by_user"
  INSTITUTION_CUSTOMER }o--|| USER : "updated_by_user"
  INSTITUTION_MEMBER_ROLE }|--|| USER : "created_by_user"
  INSTITUTION_MEMBER_ROLE }o--|| USER : "updated_by_user"
  INSTITUTION_DEPARTMENT_MEMBER }|--|| USER : "created_by_user"
  INSTITUTION_DEPARTMENT_MEMBER }o--|| USER : "updated_by_user"
  INSTITUTION_PERMISSION_GRANT }|--|| USER : "created_by_user"
  INSTITUTION_PERMISSION_GRANT }o--|| USER : "updated_by_user"
```

## Notes
This diagram represents the organizational structure (members, departments, customers) with proper joint tables and standardized naming conventions within the institution domain.

---
*Generated from diagram extraction script*
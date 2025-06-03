# Permission
**Section:** Permission

## Diagram
```mermaid
erDiagram
  %%========================================
  %% 1) CORE ENTITIES & HIERARCHIES - IMPROVED
  %%========================================
  ROLE {
    UUID id PK                       "NOT NULL; UNIQUE"
    VARCHAR(100) name                "NOT NULL; UNIQUE; CHECK (LENGTH(name) >= 2)"
    ENUM type                        "NOT NULL; CHECK (type IN ('ADMIN', 'GUEST', 'TRAINER', 'PHYSIOTHERAPIST', 'COACH', 'MEMBER', 'CUSTOMER', 'MANAGER', 'OWNER', 'SYSTEM'))"
    VARCHAR(255) display_name        "NOT NULL"
    TEXT description                 "NULLABLE; CHECK (LENGTH(description) <= 1000)"
    UUID parent_role_id FK           "NULLABLE; references ROLE.id; CHECK (parent_role_id != id)"
    SMALLINT hierarchy_level         "NOT NULL; DEFAULT 0; CHECK (hierarchy_level >= 0 AND hierarchy_level <= 10)"
    VARCHAR(500) hierarchy_path      "NOT NULL; materialized path; FORMAT: '/1/2/3/'"
    BOOLEAN is_system_role           "NOT NULL; DEFAULT false"
    BOOLEAN is_assignable            "NOT NULL; DEFAULT true; can be assigned to users"
    BOOLEAN requires_approval        "NOT NULL; DEFAULT false; role assignment needs approval"
    UUID created_by_user_id FK       "NOT NULL; references USER.id"
    UUID updated_by_user_id FK       "NULLABLE; references USER.id"
    TIMESTAMP created_at             "NOT NULL; DEFAULT now()"
    TIMESTAMP updated_at             "NOT NULL; DEFAULT now()"
    BOOLEAN is_active                "NOT NULL; DEFAULT true"
    INDEX idx_role_hierarchy_path    "(hierarchy_path)"
    INDEX idx_role_type              "(type, is_active)"
    INDEX idx_role_assignable        "(is_assignable, is_active) WHERE is_assignable = true"
    CHECK hierarchy_path_level       "(hierarchy_level = (LENGTH(hierarchy_path) - LENGTH(REPLACE(hierarchy_path, '/', ''))) - 1)"
  }
  
  PERMISSION_GROUP {
    UUID id PK                       "NOT NULL; UNIQUE"
    VARCHAR(100) name                "NOT NULL; UNIQUE; CHECK (LENGTH(name) >= 2)"
    VARCHAR(255) display_name        "NOT NULL"
    TEXT description                 "NULLABLE; CHECK (LENGTH(description) <= 1000)"
    UUID parent_group_id FK          "NULLABLE; references PERMISSION_GROUP.id; CHECK (parent_group_id != id)"
    SMALLINT hierarchy_level         "NOT NULL; DEFAULT 0; CHECK (hierarchy_level >= 0 AND hierarchy_level <= 5)"
    VARCHAR(500) hierarchy_path      "NOT NULL; materialized path; FORMAT: '/1/2/3/'"
    SMALLINT display_order           "NOT NULL; DEFAULT 0; CHECK (display_order >= 0)"
    VARCHAR(7) color_code            "NULLABLE; CHECK (color_code ~ '^#[0-9A-Fa-f]{6}$'); hex color for UI"
    BOOLEAN is_system_group          "NOT NULL; DEFAULT false"
    UUID created_by_user_id FK       "NOT NULL; references USER.id"
    UUID updated_by_user_id FK       "NULLABLE; references USER.id"
    TIMESTAMP created_at             "NOT NULL; DEFAULT now()"
    TIMESTAMP updated_at             "NOT NULL; DEFAULT now()"
    BOOLEAN is_active                "NOT NULL; DEFAULT true"
    INDEX idx_perm_group_hierarchy   "(hierarchy_path)"
    INDEX idx_perm_group_display     "(display_order ASC, name ASC)"
    CHECK group_hierarchy_path_level "(hierarchy_level = (LENGTH(hierarchy_path) - LENGTH(REPLACE(hierarchy_path, '/', ''))) - 1)"
  }
  
  PERMISSION {
    UUID id PK                       "NOT NULL; UNIQUE"
    VARCHAR(100) name                "NOT NULL; UNIQUE; CHECK (LENGTH(name) >= 3); e.g., USER.WORKOUT.CREATE"
    VARCHAR(255) display_name        "NOT NULL"
    TEXT description                 "NULLABLE; CHECK (LENGTH(description) <= 1000)"
    UUID permission_group_id FK      "NULLABLE; references PERMISSION_GROUP.id"
    VARCHAR(50) actor                "NOT NULL; CHECK (LENGTH(actor) >= 2); e.g., USER, GUEST, SYSTEM"
    VARCHAR(50) resource             "NOT NULL; CHECK (LENGTH(resource) >= 2); e.g., WORKOUT, PROGRAM, MEDIA, EXERCISE, EQUIPMENT"
    VARCHAR(50) action               "NOT NULL; CHECK (LENGTH(action) >= 2); e.g., CREATE, READ, UPDATE, DELETE, SHARE, ARCHIVE"
    VARCHAR(50) scope                "NULLABLE; e.g., OWN, INSTITUTION, PUBLIC, RESOURCE_ID"
    BOOLEAN is_global                "NOT NULL; DEFAULT false"
    BOOLEAN is_system_permission     "NOT NULL; DEFAULT false"
    BOOLEAN requires_context         "NOT NULL; DEFAULT false; permission needs additional context"
    BOOLEAN is_dangerous             "NOT NULL; DEFAULT false; requires special approval"
    SMALLINT risk_level              "NOT NULL; DEFAULT 1; CHECK (risk_level >= 1 AND risk_level <= 5); 1=low, 5=critical"
    UUID created_by_user_id FK       "NOT NULL; references USER.id"
    UUID updated_by_user_id FK       "NULLABLE; references USER.id"
    TIMESTAMP created_at             "NOT NULL; DEFAULT now()"
    TIMESTAMP updated_at             "NOT NULL; DEFAULT now()"
    BOOLEAN is_active                "NOT NULL; DEFAULT true"
    INDEX idx_permission_actor_resource "(actor, resource, action)"
    INDEX idx_permission_group       "(permission_group_id, display_name)"
    INDEX idx_permission_dangerous   "(is_dangerous, risk_level DESC) WHERE is_dangerous = true"
    UNIQUE permission_components     "(actor, resource, action, scope); Business constraint: unique permission signature"
  }
  
  %%========================================
  %% 2) ENHANCED PERMISSION GRANT SYSTEM
  %%========================================
  PERMISSION_GRANT {
    UUID id PK                       "NOT NULL; UNIQUE"
    UUID grantee_id                  "NOT NULL; references USER.id or ROLE.id or INSTITUTION.id"
    ENUM grantee_type                "NOT NULL; CHECK (grantee_type IN ('USER', 'ROLE', 'INSTITUTION', 'DEPARTMENT'))"
    UUID permission_id FK            "NOT NULL; references PERMISSION.id"
    UUID scope_id                    "NULLABLE; context ID (institution_id, department_id, resource_id)"
    ENUM scope_type                  "NULLABLE; CHECK (scope_type IN ('INSTITUTION', 'DEPARTMENT', 'RESOURCE', 'GLOBAL'))"
    ENUM grant_type                  "NOT NULL; DEFAULT 'DIRECT'; CHECK (grant_type IN ('DIRECT', 'INHERITED', 'TEMPORARY', 'CONDITIONAL'))"
    UUID inherited_from_id           "NULLABLE; source of inheritance if grant_type = 'INHERITED'"
    ENUM inherited_from_type         "NULLABLE; CHECK (inherited_from_type IN ('ROLE', 'DEPARTMENT', 'PARENT_ROLE', 'POLICY'))"
    BOOLEAN is_denied                "NOT NULL; DEFAULT false; explicit denial overrides grants"
    TEXT denial_reason               "NULLABLE; reason for denial if is_denied = true"
    JSONB grant_conditions           "NULLABLE; conditions that must be met for grant to be active"
    UUID granted_by_user_id FK       "NOT NULL; references USER.id"
    UUID approved_by_user_id FK      "NULLABLE; references USER.id; for permissions requiring approval"
    UUID created_by_user_id FK       "NOT NULL; references USER.id"
    UUID updated_by_user_id FK       "NULLABLE; references USER.id"
    TIMESTAMP granted_at             "NOT NULL; DEFAULT now()"
    TIMESTAMP effective_from         "NOT NULL; DEFAULT now()"
    TIMESTAMP expires_at             "NULLABLE"
    TIMESTAMP approved_at            "NULLABLE"
    TIMESTAMP created_at             "NOT NULL; DEFAULT now()"
    TIMESTAMP updated_at             "NOT NULL; DEFAULT now()"
    BOOLEAN is_active                "NOT NULL; DEFAULT true"
    UNIQUE grantee_permission_scope  "(grantee_id, grantee_type, permission_id, scope_id, scope_type); Business constraint: unique permission grant per scope"
    INDEX idx_grant_grantee          "(grantee_type, grantee_id, is_active, is_denied)"
    INDEX idx_grant_permission       "(permission_id, scope_type, scope_id)"
    INDEX idx_grant_inherited        "(grant_type, inherited_from_type, inherited_from_id) WHERE grant_type = 'INHERITED'"
    INDEX idx_grant_temporary        "(expires_at ASC) WHERE expires_at IS NOT NULL"
    INDEX idx_grant_pending_approval "(approved_at) WHERE approved_at IS NULL AND is_active = true"
    CHECK inheritance_consistency    "(grant_type != 'INHERITED' OR (inherited_from_id IS NOT NULL AND inherited_from_type IS NOT NULL))"
    CHECK denial_reason_required     "(is_denied = false OR denial_reason IS NOT NULL)"
    CHECK approval_consistency       "(approved_by_user_id IS NULL OR approved_at IS NOT NULL)"
    CHECK effective_date_order       "(expires_at IS NULL OR effective_from < expires_at)"
  }
  
  ROLE_PERMISSION {
    UUID id PK                       "NOT NULL; UNIQUE"
    UUID role_id FK                  "NOT NULL; references ROLE.id"
    UUID permission_id FK            "NOT NULL; references PERMISSION.id"
    BOOLEAN is_default_permission    "NOT NULL; DEFAULT false; core permission for this role"
    BOOLEAN can_be_revoked           "NOT NULL; DEFAULT true; can this permission be removed"
    UUID created_by_user_id FK       "NOT NULL; references USER.id"
    UUID updated_by_user_id FK       "NULLABLE; references USER.id"
    TIMESTAMP created_at             "NOT NULL; DEFAULT now()"
    TIMESTAMP updated_at             "NOT NULL; DEFAULT now()"
    BOOLEAN is_active                "NOT NULL; DEFAULT true"
    UNIQUE role_permission_combo     "(role_id, permission_id); Business constraint: unique permission per role"
    INDEX idx_role_perm_default      "(role_id, is_default_permission) WHERE is_default_permission = true"
    INDEX idx_role_perm_revocable    "(role_id, can_be_revoked) WHERE can_be_revoked = false"
  }
  
  %%========================================
  %% 3) ENHANCED POLICY SYSTEM
  %%========================================
  POLICY {
    UUID id PK                       "NOT NULL; UNIQUE"
    VARCHAR(100) name                "NOT NULL; UNIQUE; CHECK (LENGTH(name) >= 2)"
    VARCHAR(255) display_name        "NOT NULL"
    TEXT description                 "NULLABLE; CHECK (LENGTH(description) <= 2000)"
    ENUM policy_type                 "NOT NULL; CHECK (policy_type IN ('ROLE_BASED', 'RESOURCE_BASED', 'CONTEXT_BASED', 'TIME_BASED', 'CONDITIONAL', 'COMPLIANCE'))"
    JSONB policy_rules               "NOT NULL; policy definition and rules"
    JSONB policy_schema              "NULLABLE; JSON schema for validating policy_rules"
    ENUM policy_priority             "NOT NULL; DEFAULT 'NORMAL'; CHECK (policy_priority IN ('LOW', 'NORMAL', 'HIGH', 'CRITICAL'))"
    BOOLEAN is_enforced              "NOT NULL; DEFAULT true; whether policy is actively enforced"
    BOOLEAN is_audit_only            "NOT NULL; DEFAULT false; log violations but don't block"
    DATE effective_from              "NOT NULL; DEFAULT CURRENT_DATE"
    DATE effective_until             "NULLABLE"
    UUID created_by_user_id FK       "NOT NULL; references USER.id"
    UUID updated_by_user_id FK       "NULLABLE; references USER.id"
    TIMESTAMP created_at             "NOT NULL; DEFAULT now()"
    TIMESTAMP updated_at             "NOT NULL; DEFAULT now()"
    BOOLEAN is_active                "NOT NULL; DEFAULT true"
    INDEX idx_policy_type_priority   "(policy_type, policy_priority DESC, effective_from DESC)"
    INDEX idx_policy_enforced        "(is_enforced, is_active) WHERE is_enforced = true AND is_active = true"
    INDEX idx_policy_effective       "(effective_from, effective_until) WHERE is_active = true"
    CHECK policy_date_order          "(effective_until IS NULL OR effective_from <= effective_until)"
  }
  
  POLICY_ASSIGNMENT {
    UUID id PK                       "NOT NULL; UNIQUE"
    UUID policy_id FK                "NOT NULL; references POLICY.id"
    UUID target_id                   "NOT NULL; references ROLE.id, PERMISSION.id, USER.id, or INSTITUTION.id"
    ENUM target_type                 "NOT NULL; CHECK (target_type IN ('ROLE', 'PERMISSION', 'USER', 'INSTITUTION', 'DEPARTMENT'))"
    UUID scope_id                    "NULLABLE; institution_id, department_id, or resource_id"
    ENUM scope_type                  "NULLABLE; CHECK (scope_type IN ('INSTITUTION', 'DEPARTMENT', 'RESOURCE', 'GLOBAL'))"
    JSONB assignment_parameters      "NULLABLE; assignment-specific parameters"
    BOOLEAN overrides_defaults       "NOT NULL; DEFAULT false; overrides default behavior"
    UUID created_by_user_id FK       "NOT NULL; references USER.id"
    UUID updated_by_user_id FK       "NULLABLE; references USER.id"
    TIMESTAMP created_at             "NOT NULL; DEFAULT now()"
    TIMESTAMP updated_at             "NOT NULL; DEFAULT now()"
    BOOLEAN is_active                "NOT NULL; DEFAULT true"
    UNIQUE policy_target_scope       "(policy_id, target_id, target_type, scope_id, scope_type); Business constraint: unique policy assignment per target per scope"
    INDEX idx_policy_assign_target   "(target_type, target_id, is_active)"
    INDEX idx_policy_assign_scope    "(scope_type, scope_id, is_active)"
  }
  
  %%========================================
  %% 4) ENHANCED VISIBILITY SYSTEM
  %%========================================
  VISIBILITY {
    UUID id PK                       "NOT NULL; UNIQUE"
    ENUM name                        "NOT NULL; UNIQUE; CHECK (name IN ('PRIVATE', 'SHARED', 'PUBLIC', 'INSTITUTION', 'DEPARTMENT', 'ROLE_BASED', 'INTERNAL', 'SYSTEM', 'RESTRICTED'))"
    ENUM resource_type               "NOT NULL; CHECK (resource_type IN ('WORKOUT', 'PROGRAM', 'EXERCISE', 'MEDIA', 'EQUIPMENT', 'USER', 'ACTIVITY', 'FAVORITE', 'RATING', 'INSTITUTION', 'ALL'))"
    VARCHAR(255) display_name        "NOT NULL"
    TEXT description                 "NULLABLE; explains the visibility level; CHECK (LENGTH(description) <= 1000)"
    BOOLEAN is_default               "NOT NULL; DEFAULT false"
    BOOLEAN requires_permission      "NOT NULL; DEFAULT false"
    BOOLEAN allows_guest_access      "NOT NULL; DEFAULT false"
    SMALLINT access_level            "NOT NULL; DEFAULT 1; CHECK (access_level >= 1 AND access_level <= 10); 1=most restrictive, 10=public"
    BOOLEAN is_system_visibility     "NOT NULL; DEFAULT false"
    UUID created_by_user_id FK       "NOT NULL; references USER.id"
    UUID updated_by_user_id FK       "NULLABLE; references USER.id"
    TIMESTAMP created_at             "NOT NULL; DEFAULT now()"
    TIMESTAMP updated_at             "NOT NULL; DEFAULT now()"
    BOOLEAN is_active                "NOT NULL; DEFAULT true"
    UNIQUE name_resource_type        "(name, resource_type); Business constraint: unique visibility per resource type"
    INDEX idx_visibility_resource    "(resource_type, access_level DESC)"
    INDEX idx_visibility_default     "(resource_type, is_default) WHERE is_default = true"
    INDEX idx_visibility_guest       "(allows_guest_access, access_level) WHERE allows_guest_access = true"
  }
  
  VISIBILITY_POLICY {
    UUID id PK                       "NOT NULL; UNIQUE"
    UUID visibility_id FK            "NOT NULL; references VISIBILITY.id"
    UUID permission_id FK            "NOT NULL; references PERMISSION.id"
    UUID institution_id FK           "NULLABLE; references INSTITUTION.id"
    UUID role_id FK                  "NULLABLE; references ROLE.id"
    UUID department_id FK            "NULLABLE; references INSTITUTION_DEPARTMENT.id"
    BOOLEAN allow_guest              "NOT NULL; DEFAULT false"
    BOOLEAN requires_authentication  "NOT NULL; DEFAULT true"
    BOOLEAN is_default               "NOT NULL; DEFAULT false"
    JSONB access_conditions          "NULLABLE; additional conditions for access"
    TEXT notes                       "NULLABLE; CHECK (LENGTH(notes) <= 500)"
    UUID created_by_user_id FK       "NOT NULL; references USER.id"
    UUID updated_by_user_id FK       "NULLABLE; references USER.id"
    TIMESTAMP created_at             "NOT NULL; DEFAULT now()"
    TIMESTAMP updated_at             "NOT NULL; DEFAULT now()"
    BOOLEAN is_active                "NOT NULL; DEFAULT true"
    UNIQUE visibility_permission_context "(visibility_id, permission_id, institution_id, role_id, department_id); Business constraint: unique policy per context"
    INDEX idx_vis_policy_permission  "(permission_id, visibility_id)"
    INDEX idx_vis_policy_context     "(institution_id, role_id, department_id) WHERE institution_id IS NOT NULL OR role_id IS NOT NULL OR department_id IS NOT NULL"
  }
  
  %%========================================
  %% 5) PERMISSION AUDITING AND MONITORING
  %%========================================
  PERMISSION_CHECK_LOG {
    UUID id PK                       "NOT NULL; UNIQUE"
    UUID user_id FK                  "NULLABLE; references USER.id"
    UUID permission_id FK            "NOT NULL; references PERMISSION.id"
    UUID resource_id                 "NULLABLE; resource being accessed"
    ENUM resource_type               "NULLABLE; type of resource"
    BOOLEAN check_result             "NOT NULL; whether permission was granted"
    TEXT denial_reason               "NULLABLE; reason if permission was denied"
    JSONB check_context              "NULLABLE; additional context about the check"
    INET ip_address                  "NULLABLE; IP address of request"
    TEXT user_agent                  "NULLABLE; CHECK (LENGTH(user_agent) <= 1000)"
    UUID session_id                  "NULLABLE; session identifier"
    TIMESTAMP checked_at             "NOT NULL; DEFAULT now()"
    UNIQUE id_checked_at             "(id, checked_at); Required for partitioning"
    INDEX idx_perm_check_user_time   "(user_id, checked_at DESC) WHERE user_id IS NOT NULL"
    INDEX idx_perm_check_perm_time   "(permission_id, checked_at DESC)"
    INDEX idx_perm_check_denied      "(check_result, checked_at DESC) WHERE check_result = false"
  }
  %%— PARTITION BY RANGE (checked_at) MONTHLY —
  
  PERMISSION_VIOLATION {
    UUID id PK                       "NOT NULL; UNIQUE"
    UUID user_id FK                  "NULLABLE; references USER.id"
    UUID permission_id FK            "NOT NULL; references PERMISSION.id"
    ENUM violation_type              "NOT NULL; CHECK (violation_type IN ('UNAUTHORIZED_ACCESS', 'PRIVILEGE_ESCALATION', 'POLICY_VIOLATION', 'SUSPICIOUS_ACTIVITY'))"
    ENUM severity                    "NOT NULL; CHECK (severity IN ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL'))"
    TEXT violation_description       "NOT NULL; CHECK (LENGTH(violation_description) <= 2000)"
    JSONB violation_details          "NOT NULL; detailed violation information"
    BOOLEAN is_resolved              "NOT NULL; DEFAULT false"
    UUID resolved_by_user_id FK      "NULLABLE; references USER.id"
    TIMESTAMP resolved_at            "NULLABLE"
    TEXT resolution_notes            "NULLABLE; CHECK (LENGTH(resolution_notes) <= 1000)"
    INET ip_address                  "NULLABLE"
    TEXT user_agent                  "NULLABLE; CHECK (LENGTH(user_agent) <= 1000)"
    UUID session_id                  "NULLABLE"
    TIMESTAMP occurred_at            "NOT NULL; DEFAULT now()"
    INDEX idx_violation_user_time    "(user_id, occurred_at DESC) WHERE user_id IS NOT NULL"
    INDEX idx_violation_severity     "(severity, occurred_at DESC)"
    INDEX idx_violation_unresolved   "(is_resolved, occurred_at DESC) WHERE is_resolved = false"
    CHECK resolution_consistency     "(is_resolved = false OR (resolved_by_user_id IS NOT NULL AND resolved_at IS NOT NULL))"
  }
  
  %%========================================
  %% 6) RELATIONSHIPS - COMPREHENSIVE
  %%========================================
  %%— Role & Permission Core Relationships —
  ROLE ||--o{ ROLE                  : "parent_role"
  ROLE ||--o{ ROLE_PERMISSION       : "has_permissions"
  PERMISSION ||--o{ ROLE_PERMISSION : "assigned_to_roles"
  PERMISSION_GROUP ||--o{ PERMISSION_GROUP : "parent_group"
  PERMISSION_GROUP ||--o{ PERMISSION : "contains_permissions"
  
  %%— Permission Grant System —
  USER ||--o{ PERMISSION_GRANT      : "receives_user_grants"
  ROLE ||--o{ PERMISSION_GRANT      : "receives_role_grants"
  INSTITUTION ||--o{ PERMISSION_GRANT : "receives_institution_grants"
  PERMISSION ||--o{ PERMISSION_GRANT : "granted_permissions"
  USER ||--o{ PERMISSION_GRANT      : "grants_permissions"
  USER ||--o{ PERMISSION_GRANT      : "approves_permissions"
  
  %%— Policy System —
  POLICY ||--o{ POLICY_ASSIGNMENT   : "applies_to_targets"
  ROLE ||--o{ POLICY_ASSIGNMENT     : "target_role"
  PERMISSION ||--o{ POLICY_ASSIGNMENT : "target_permission"
  USER ||--o{ POLICY_ASSIGNMENT     : "target_user"
  INSTITUTION ||--o{ POLICY_ASSIGNMENT : "target_institution"
  
  %%— Visibility System —
  VISIBILITY ||--o{ VISIBILITY_POLICY : "controlled_by_policy"
  PERMISSION ||--o{ VISIBILITY_POLICY : "maps_to_permission"
  INSTITUTION ||--o{ VISIBILITY_POLICY : "institution_scoped_policy"
  ROLE ||--o{ VISIBILITY_POLICY     : "role_override"
  INSTITUTION_DEPARTMENT ||--o{ VISIBILITY_POLICY : "department_scoped_policy"
  
  %%— Auditing and Monitoring —
  USER ||--o{ PERMISSION_CHECK_LOG  : "permission_checks"
  PERMISSION ||--o{ PERMISSION_CHECK_LOG : "check_attempts"
  USER ||--o{ PERMISSION_VIOLATION  : "violations_committed"
  PERMISSION ||--o{ PERMISSION_VIOLATION : "violated_permissions"
  USER ||--o{ PERMISSION_VIOLATION  : "resolves_violations"
  
  %%— Standardized Audit Relationships —
  ROLE }|--|| USER                  : "created_by_user"
  ROLE }o--|| USER                  : "updated_by_user"
  PERMISSION_GROUP }|--|| USER      : "created_by_user"
  PERMISSION_GROUP }o--|| USER      : "updated_by_user"
  PERMISSION }|--|| USER            : "created_by_user"
  PERMISSION }o--|| USER            : "updated_by_user"
  PERMISSION_GRANT }|--|| USER      : "created_by_user"
  PERMISSION_GRANT }o--|| USER      : "updated_by_user"
  ROLE_PERMISSION }|--|| USER       : "created_by_user"
  ROLE_PERMISSION }o--|| USER       : "updated_by_user"
  POLICY }|--|| USER                : "created_by_user"
  POLICY }o--|| USER                : "updated_by_user"
  POLICY_ASSIGNMENT }|--|| USER     : "created_by_user"
  POLICY_ASSIGNMENT }o--|| USER     : "updated_by_user"
  VISIBILITY }|--|| USER            : "created_by_user"
  VISIBILITY }o--|| USER            : "updated_by_user"
  VISIBILITY_POLICY }|--|| USER     : "created_by_user"
  VISIBILITY_POLICY }o--|| USER     : "updated_by_user"
  
  %%— Resource Visibility References (External) —
  WORKOUT ||--|| VISIBILITY         : "has_visibility"
  PROGRAM ||--|| VISIBILITY         : "has_visibility"
  EXERCISE ||--|| VISIBILITY        : "has_visibility"
  MEDIA ||--|| VISIBILITY           : "has_visibility"
  EQUIPMENT ||--|| VISIBILITY       : "has_visibility"
  USER ||--|| VISIBILITY            : "has_visibility"
  ACTIVITY ||--|| VISIBILITY        : "has_visibility"
  FAVORITE ||--|| VISIBILITY        : "has_visibility"
  RATING ||--|| VISIBILITY          : "has_visibility"
  INSTITUTION ||--|| VISIBILITY     : "has_visibility"
```

## Notes
This diagram represents the unified permission structure and relationships providing role-based access control, policy management, and visibility controls across all resources.

---
*Generated from diagram extraction script*
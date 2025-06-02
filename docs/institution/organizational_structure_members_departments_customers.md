# Organizational Structure (Members, Departments, Customers)

**Section:** Program
**Subsection:** Organizational Structure (Members, Departments, Customers)

## Diagram

```mermaid
erDiagram
  %%=== Layer 2: Organizational Structure ===%%

  %%— Members & Roles —
  INSTITUTION_MEMBER {
    UUID id PK                           "NOT NULL"
    UUID user_id FK                      "NOT NULL; references USER.id"
    UUID institution_id FK               "NOT NOT; references INSTITUTION.id"
    UUID institution_user_role_id FK     "NOT NOT; references INSTITUTION_ROLE.id"
    UUID institution_user_permission_id FK "NOT NOT; references INSTITUTION_MEMBER_PERMISSION.id"
    UUID institution_department FK       "NOT NOT; references INSTITUTION_DEPARTMENT.id"
    TIMESTAMP joined_at                  "NOT NULL"
    BOOLEAN is_active                    "DEFAULT TRUE"
  }
  
  INSTITUTION_DEPARTMENT {
    UUID id PK                            "NOT NULL"
    UUID institution_id FK                "NOT NOT; references INSTITUTION.id"
    UUID institution_department_permission_id FK "NOT NOT; references INSTITUTION_DEPARTMENT_PERMISSION.id"
    VARCHAR(100) name                     "NOT NOT"
    VARCHAR(255) description
  }

  INSTITUTION_CUSTOMER {
    UUID id PK                          "NOT NULL"
    UUID institution_id FK              "NOT NOT; references INSTITUTION.id"
    UUID relation_id FK                 "NOT NOT; references USER_PROFESSIONNAL_CUSTOMER_RELATION.id"
    TIMESTAMP linked_at                 "DEFAULT now()"
    BOOLEAN is_active                   "DEFAULT TRUE"
  }

  %%— Relationships in Layer 2 —
  INSTITUTION ||--o{ INSTITUTION_MEMBER     : "has members"
  INSTITUTION ||--o{ INSTITUTION_DEPARTMENT : "has departments"
  INSTITUTION ||--o{ INSTITUTION_CUSTOMER   : "has customers"
  INSTITUTION_DEPARTMENT ||--o{ INSTITUTION_MEMBER : "members assigned to"
  INSTITUTION_MEMBER }|--|| USER_PROFESSIONNAL_CUSTOMER_RELATION : "participates in"
  INSTITUTION_CUSTOMER }|--|| USER_PROFESSIONNAL_CUSTOMER_RELATION : "derived from"

```

## Notes

This diagram represents the organizational structure (members, departments, customers) structure and relationships within the program domain.

---
*Generated from diagram extraction script*

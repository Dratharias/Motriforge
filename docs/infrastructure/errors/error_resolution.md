# Error Resolution & Tracking

```mermaid
erDiagram
    RESOLUTION_TYPE {
        UUID id PK
        VARCHAR(50) name "NOT NULL UNIQUE"
        TEXT description "NOT NULL LENGTH 500"
        BOOLEAN requires_testing "NOT NULL DEFAULT false"
        UUID created_by FK "NOT NULL"
        TIMESTAMP created_at "NOT NULL DEFAULT now()"
        BOOLEAN is_active "NOT NULL DEFAULT true"
    }
    ERROR_ASSIGNMENT {
        UUID id PK
        UUID error_id FK "NOT NULL"
        UUID assigned_to FK "NOT NULL"
        UUID assigned_by FK "NOT NULL"
        TEXT assignment_notes "NULLABLE LENGTH 2000"
        TIMESTAMP created_at "NOT NULL DEFAULT now()"
        TIMESTAMP due_date "NULLABLE"
        BOOLEAN is_active "NOT NULL DEFAULT true"
    }
    ERROR_RESOLUTION {
        UUID id PK
        UUID error_id FK "NOT NULL"
        UUID resolved_by FK "NOT NULL"
        UUID resolution_type_id FK "NOT NULL"
        TEXT resolution_description "NOT NULL LENGTH 2000"
        TEXT steps_taken "NULLABLE LENGTH 2000"
        TEXT prevention_measures "NULLABLE LENGTH 2000"
        BOOLEAN requires_code_change "NOT NULL DEFAULT false"
        BOOLEAN requires_documentation "NOT NULL DEFAULT false"
        TIMESTAMP resolved_at "NOT NULL DEFAULT now()"
    }
    ERROR_OCCURRENCE {
        UUID id PK
        UUID error_id FK "NOT NULL"
        UUID user_id FK "NULLABLE"
        JSONB occurrence_context "NULLABLE"
        INET ip_address "NULLABLE"
        UUID session_id "NULLABLE"
        TIMESTAMP occurred_at "NOT NULL DEFAULT now()"
    }
    ERROR_DUPLICATE {
        UUID primary_error_id PK FK "NOT NULL"
        UUID duplicate_error_id PK FK "NOT NULL"
        UUID marked_by FK "NOT NULL"
        TEXT similarity_reason "NULLABLE LENGTH 1000"
        TIMESTAMP marked_at "NOT NULL DEFAULT now()"
    }
    ERROR_ESCALATION {
        UUID id PK
        UUID error_id FK "NOT NULL"
        UUID escalated_by FK "NOT NULL"
        UUID escalated_to FK "NOT NULL"
        TEXT escalation_reason "NOT NULL LENGTH 1000"
        ENUM escalation_level "NOT NULL"
        TIMESTAMP escalated_at "NOT NULL DEFAULT now()"
        TIMESTAMP acknowledged_at "NULLABLE"
    }
    ERROR ||--o{ ERROR_ASSIGNMENT : "assignments"
    ERROR ||--o{ ERROR_RESOLUTION : "resolutions"
    ERROR ||--o{ ERROR_OCCURRENCE : "occurrences"
    ERROR ||--o{ ERROR_DUPLICATE : "primary_errors"
    ERROR ||--o{ ERROR_DUPLICATE : "duplicate_errors"
    ERROR ||--o{ ERROR_ESCALATION : "escalations"
    ERROR_ASSIGNMENT }|--|| USER : "assigned_to"
    ERROR_ASSIGNMENT }|--|| USER : "assigned_by"
    ERROR_RESOLUTION }|--|| USER : "resolved_by"
    ERROR_RESOLUTION }|--|| RESOLUTION_TYPE : "resolution_type"
    ERROR_OCCURRENCE }|--|| USER : "user_context"
    ERROR_DUPLICATE }|--|| USER : "marked_by"
    ERROR_ESCALATION }|--|| USER : "escalated_by"
    ERROR_ESCALATION }|--|| USER : "escalated_to"
```